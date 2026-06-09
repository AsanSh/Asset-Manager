import { db } from "./db";
import {
  bankAccountsTable,
  barterAssetsTable,
  barterMovementsTable,
  constructionOperationsTable,
} from "./db/schema";
import { and, eq, sql } from "drizzle-orm";
import { applyContractPayment } from "./construction-payment";
import { applyOpBalances, reverseOpBalances } from "./construction-operation-balances";
import { BANK_ACCOUNT_MODULE } from "./bank-account-module";

const BARTER_ACCOUNT_NAME = "Бартерный склад (учёт)";

export function parseAmount(raw: unknown): number {
  const n = parseFloat(String(raw ?? "0"));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Сумма должна быть больше нуля");
  }
  return n;
}

export function computeAssetRemainder(
  accepted: string | number | null | undefined,
  disposed: string | number | null | undefined,
): number {
  const a = parseFloat(String(accepted ?? "0"));
  const d = parseFloat(String(disposed ?? "0"));
  return Math.max(0, a - d);
}

export function deriveAssetStatus(
  accepted: number,
  disposed: number,
  current: string,
): "in_stock" | "partial" | "disposed" | "cancelled" {
  if (current === "cancelled") return "cancelled";
  const remainder = Math.max(0, accepted - disposed);
  if (remainder <= 0.01 && disposed > 0) return "disposed";
  if (disposed > 0.01) return "partial";
  return "in_stock";
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getOrCreateBarterAccount(
  companyId: number,
  tx: DbTx = db as unknown as DbTx,
) {
  const module = BANK_ACCOUNT_MODULE.construction;
  const [existing] = await tx
    .select()
    .from(bankAccountsTable)
    .where(
      and(
        eq(bankAccountsTable.companyId, companyId),
        eq(bankAccountsTable.module, module),
        eq(bankAccountsTable.name, BARTER_ACCOUNT_NAME),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await tx
    .insert(bankAccountsTable)
    .values({
      companyId,
      module,
      name: BARTER_ACCOUNT_NAME,
      type: "cash",
      currency: "KGS",
      openingBalance: "0",
      currentBalance: "0",
      notes: "Системный счёт для учёта бартерных активов",
      isActive: true,
    })
    .returning();

  return created;
}

export type AcceptBarterInput = {
  companyId: number;
  contractId: number;
  accrualId?: number | null;
  amount: number | string;
  date?: string;
  assetType?: string;
  title: string;
  identifier?: string | null;
  counterpartyId?: number | null;
  projectId?: number | null;
  notes?: string | null;
  accountId?: number | null;
};

export async function acceptBarterFromBuyer(input: AcceptBarterInput) {
  const amount = parseAmount(input.amount);
  const payDate = input.date || new Date().toISOString().slice(0, 10);
  const assetType = input.assetType || "vehicle";

  return db.transaction(async (tx) => {
    const barterAccount = await getOrCreateBarterAccount(input.companyId, tx);
    const accountId = input.accountId ? Number(input.accountId) : barterAccount.id;

    const payment = await applyContractPayment({
      companyId: input.companyId,
      contractId: Number(input.contractId),
      projectId: input.projectId,
      accrualId: input.accrualId,
      amount,
      currency: "KGS",
      exchangeRate: "1",
      accountId,
      paymentMethod: "barter",
      date: payDate,
      notes: [input.notes, `Бартер: ${input.title}`].filter(Boolean).join(" · "),
      source: "barter",
    }, tx);

    const [asset] = await tx
      .insert(barterAssetsTable)
      .values({
        companyId: input.companyId,
        assetType,
        title: input.title.trim(),
        identifier: input.identifier?.trim() || null,
        projectId: input.projectId ?? payment.operation.projectId ?? null,
        contractId: Number(input.contractId),
        status: "in_stock",
        acceptedAmountKgs: String(amount),
        disposedAmountKgs: "0",
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .returning();

    const [movement] = await tx
      .insert(barterMovementsTable)
      .values({
        companyId: input.companyId,
        assetId: asset.id,
        direction: "in",
        amountKgs: String(amount),
        date: payDate,
        counterpartyId: input.counterpartyId ?? null,
        projectId: asset.projectId,
        contractId: Number(input.contractId),
        accrualId: input.accrualId ? Number(input.accrualId) : null,
        operationId: payment.operation.id,
        purpose: "Приём бартером от покупателя",
        notes: input.notes ?? null,
        status: "approved",
      })
      .returning();

    return { asset, movement, operation: payment.operation, allocations: payment.allocations };
  });
}

export type DisposeBarterInput = {
  companyId: number;
  assetId: number;
  amount: number | string;
  date?: string;
  counterpartyId?: number | null;
  contractorId?: number | null;
  projectId?: number | null;
  purpose?: string | null;
  notes?: string | null;
  category?: string | null;
  accountId?: number | null;
};

export async function disposeBarterToCounterparty(input: DisposeBarterInput) {
  const amount = parseAmount(input.amount);
  const payDate = input.date || new Date().toISOString().slice(0, 10);

  return db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(barterAssetsTable)
      .where(
        and(
          eq(barterAssetsTable.id, Number(input.assetId)),
          eq(barterAssetsTable.companyId, input.companyId),
        ),
      );

    if (!asset) throw new Error("Бартерный актив не найден");
    if (asset.status === "cancelled") throw new Error("Актив отменён");

    const remainder = computeAssetRemainder(
      asset.acceptedAmountKgs,
      asset.disposedAmountKgs,
    );
    if (amount > remainder + 0.01) {
      throw new Error(
        `Сумма выдачи (${amount.toFixed(2)}) превышает остаток по активу (${remainder.toFixed(2)} сом)`,
      );
    }

    const barterAccount = await getOrCreateBarterAccount(input.companyId, tx);
    const accountId = input.accountId ? Number(input.accountId) : barterAccount.id;

    const balance = parseFloat(barterAccount.currentBalance?.toString() || "0");
    if (amount > balance + 0.01) {
      throw new Error(
        `На бартерном счёте недостаточно средств (${balance.toFixed(2)} сом)`,
      );
    }

    const purpose =
      input.purpose?.trim() ||
      "Бартерная оплата поставщику/подрядчику";

    const [operation] = await tx
      .insert(constructionOperationsTable)
      .values({
        companyId: input.companyId,
        projectId: input.projectId ?? asset.projectId ?? null,
        type: "expense",
        category: input.category || "Подрядчики",
        contractId: asset.contractId,
        fromAccountId: accountId,
        toAccountId: null,
        counterpartyId: input.counterpartyId ?? null,
        contractorId: input.contractorId ?? null,
        amount: String(amount),
        currency: "KGS",
        exchangeRate: "1",
        amountKgs: String(amount),
        date: payDate,
        description: `Бартер: ${asset.title}`,
        paymentMethod: "barter",
        status: "approved",
        notes: [purpose, input.notes, `Актив #${asset.id}`].filter(Boolean).join(" · "),
      })
      .returning();

    await applyOpBalances(
      input.companyId,
      {
        type: "expense",
        status: "approved",
        fromAccountId: accountId,
        toAccountId: null,
        amountKgs: String(amount),
      },
      tx,
    );

    const [movement] = await tx
      .insert(barterMovementsTable)
      .values({
        companyId: input.companyId,
        assetId: asset.id,
        direction: "out",
        amountKgs: String(amount),
        date: payDate,
        counterpartyId: input.counterpartyId ?? null,
        contractorId: input.contractorId ?? null,
        projectId: input.projectId ?? asset.projectId ?? null,
        contractId: asset.contractId,
        operationId: operation.id,
        purpose,
        notes: input.notes ?? null,
        status: "approved",
      })
      .returning();

    const newDisposed =
      parseFloat(asset.disposedAmountKgs?.toString() || "0") + amount;
    const accepted = parseFloat(asset.acceptedAmountKgs?.toString() || "0");
    const newStatus = deriveAssetStatus(accepted, newDisposed, asset.status);

    const [updatedAsset] = await tx
      .update(barterAssetsTable)
      .set({
        disposedAmountKgs: String(newDisposed),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(barterAssetsTable.id, asset.id))
      .returning();

    return { asset: updatedAsset, movement, operation };
  });
}

export async function cancelBarterMovement(companyId: number, movementId: number) {
  return db.transaction(async (tx) => {
    const [movement] = await tx
      .select()
      .from(barterMovementsTable)
      .where(
        and(
          eq(barterMovementsTable.id, movementId),
          eq(barterMovementsTable.companyId, companyId),
        ),
      );

    if (!movement) throw new Error("Движение не найдено");
    if (movement.status === "cancelled") throw new Error("Движение уже отменено");

    const [asset] = await tx
      .select()
      .from(barterAssetsTable)
      .where(eq(barterAssetsTable.id, movement.assetId));

    if (!asset) throw new Error("Актив не найден");

    const amount = parseFloat(movement.amountKgs?.toString() || "0");

    if (movement.operationId) {
      const [op] = await tx
        .select()
        .from(constructionOperationsTable)
        .where(eq(constructionOperationsTable.id, movement.operationId));

      if (op && op.status === "approved") {
        await reverseOpBalances(
          companyId,
          {
            type: op.type ?? "expense",
            status: "approved",
            fromAccountId: op.fromAccountId ?? null,
            toAccountId: op.toAccountId ?? null,
            amountKgs: op.amountKgs ?? op.amount ?? "0",
          },
          tx,
        );
        await tx
          .update(constructionOperationsTable)
          .set({
            status: "cancelled",
            notes: [op.notes, "Отменено (бартер)"].filter(Boolean).join(" · "),
          })
          .where(eq(constructionOperationsTable.id, op.id));
      }
    }

    await tx
      .update(barterMovementsTable)
      .set({ status: "cancelled" })
      .where(eq(barterMovementsTable.id, movement.id));

    let accepted = parseFloat(asset.acceptedAmountKgs?.toString() || "0");
    let disposed = parseFloat(asset.disposedAmountKgs?.toString() || "0");

    if (movement.direction === "in") {
      accepted = Math.max(0, accepted - amount);
    } else {
      disposed = Math.max(0, disposed - amount);
    }

    const newStatus =
      movement.direction === "in" && accepted <= 0.01
        ? "cancelled"
        : deriveAssetStatus(accepted, disposed, asset.status);

    const [updatedAsset] = await tx
      .update(barterAssetsTable)
      .set({
        acceptedAmountKgs: String(accepted),
        disposedAmountKgs: String(disposed),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(barterAssetsTable.id, asset.id))
      .returning();

    return { movement, asset: updatedAsset };
  });
}

export async function buildBarterReport(companyId: number, projectId?: number | null) {
  const assetFilter = projectId
    ? and(
        eq(barterAssetsTable.companyId, companyId),
        eq(barterAssetsTable.projectId, Number(projectId)),
      )
    : eq(barterAssetsTable.companyId, companyId);

  const assets = await db.select().from(barterAssetsTable).where(assetFilter);

  const movements = await db
    .select()
    .from(barterMovementsTable)
    .where(
      projectId
        ? and(
            eq(barterMovementsTable.companyId, companyId),
            eq(barterMovementsTable.projectId, Number(projectId)),
            eq(barterMovementsTable.status, "approved"),
          )
        : and(
            eq(barterMovementsTable.companyId, companyId),
            eq(barterMovementsTable.status, "approved"),
          ),
    );

  let totalAccepted = 0;
  let totalDisposed = 0;

  for (const a of assets) {
    if (a.status === "cancelled") continue;
    totalAccepted += parseFloat(a.acceptedAmountKgs?.toString() || "0");
    totalDisposed += parseFloat(a.disposedAmountKgs?.toString() || "0");
  }

  const inStock = Math.max(0, totalAccepted - totalDisposed);
  const spread = totalAccepted - totalDisposed;

  const deals = assets
    .filter((a) => a.status !== "cancelled")
    .map((asset) => {
      const assetMovements = movements.filter((m) => m.assetId === asset.id);
      const incoming = assetMovements.filter((m) => m.direction === "in");
      const outgoing = assetMovements.filter((m) => m.direction === "out");
      const accepted = parseFloat(asset.acceptedAmountKgs?.toString() || "0");
      const disposed = parseFloat(asset.disposedAmountKgs?.toString() || "0");
      return {
        asset,
        incoming,
        outgoing,
        remainder: computeAssetRemainder(accepted, disposed),
        dealResult: accepted - disposed,
      };
    });

  const [ledgerCheck] = await db
    .select({
      inSum: sql<number>`coalesce(sum(case when ${barterMovementsTable.direction} = 'in' then ${barterMovementsTable.amountKgs}::numeric else 0 end), 0)`,
      outSum: sql<number>`coalesce(sum(case when ${barterMovementsTable.direction} = 'out' then ${barterMovementsTable.amountKgs}::numeric else 0 end), 0)`,
    })
    .from(barterMovementsTable)
    .where(
      and(
        eq(barterMovementsTable.companyId, companyId),
        eq(barterMovementsTable.status, "approved"),
        projectId ? eq(barterMovementsTable.projectId, Number(projectId)) : sql`true`,
      ),
    );

  const movementIn = Number(ledgerCheck?.inSum ?? 0);
  const movementOut = Number(ledgerCheck?.outSum ?? 0);

  return {
    summary: {
      totalAccepted,
      totalDisposed,
      inStock,
      spread,
      movementIn,
      movementOut,
      ledgerBalanced: Math.abs(movementIn - movementOut - inStock) < 0.02,
      position:
        spread > 0.01 ? "plus" : spread < -0.01 ? "minus" : "balanced",
    },
    deals,
    assets,
    movements,
  };
}
