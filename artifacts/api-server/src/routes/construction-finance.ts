import { Router } from "express";
import { db } from "../lib/db";
import {
  bankAccountsTable, constructionOperationsTable,
  constructionSalesContractsTable, constructionAccrualsTable,
  constructionUnitsTable,
  counterpartiesTable,
} from "../lib/db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";
import {
  buildContractDocumentMeta,
  parseContractDocumentMeta,
  summarizeContractDocument,
} from "../lib/contract-document";
import { buildBuyerReconciliation } from "../lib/portal-reconciliation";
import {
  buildPaymentSchedule,
  scheduleTotal,
  type ScheduleRow,
} from "../lib/payment-schedule";
import {
  applyContractPayment,
  cancelAccrualPayment,
} from "../lib/construction-payment";
import {
  applyOpBalances,
  reverseOpBalances,
  validateOpBalances,
  type OpForBalance,
} from "../lib/construction-operation-balances";
import {
  BANK_ACCOUNT_MODULE,
  companyModuleAccountByIdWhere,
  companyModuleAccountWhere,
} from "../lib/bank-account-module";

const router = Router();

router.use(requireAuth, requireTenantCompany);

function mapSalesContractResponse(row: typeof constructionSalesContractsTable.$inferSelect) {
  const { contractDocumentMeta, ...rest } = row;
  return {
    ...rest,
    contractDocument: summarizeContractDocument(contractDocumentMeta),
  };
}

const CONSTRUCTION_ACCOUNTS = BANK_ACCOUNT_MODULE.construction;

// ── Bank Accounts (только модуль «Строительство») ───────────────────────
router.get("/accounts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountWhere(companyId, CONSTRUCTION_ACCOUNTS))
    .orderBy(bankAccountsTable.name);
  res.json(rows);
});

router.post("/accounts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { module: _m, companyId: _c, ...body } = req.body ?? {};
  const opening = body.openingBalance ?? "0";
  const [row] = await db.insert(bankAccountsTable).values({
    ...body,
    companyId,
    module: CONSTRUCTION_ACCOUNTS,
    openingBalance: opening,
    currentBalance: body.currentBalance ?? opening,
  }).returning();
  res.json(row);
});

router.patch("/accounts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { module: _m, companyId: _c, ...body } = req.body ?? {};
  const [row] = await db.update(bankAccountsTable)
    .set(body)
    .where(
      companyModuleAccountByIdWhere(
        companyId,
        Number(req.params.id),
        CONSTRUCTION_ACCOUNTS,
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Счёт не найден" });
    return;
  }
  res.json(row);
});

router.delete("/accounts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const deleted = await db.delete(bankAccountsTable)
    .where(
      companyModuleAccountByIdWhere(
        companyId,
        Number(req.params.id),
        CONSTRUCTION_ACCOUNTS,
      ),
    )
    .returning({ id: bankAccountsTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "Счёт не найден" });
    return;
  }
  res.json({ ok: true });
});

// ── Operations ──────────────────────────────────────────────────────────
router.get("/operations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(constructionOperationsTable)
    .where(eq(constructionOperationsTable.companyId, companyId))
    .orderBy(desc(constructionOperationsTable.date));
  res.json(rows);
});

function normalizeOpDate(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return s.slice(0, 10);
}

router.post("/operations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};

  const type = String(body.type || "expense");
  if (!["income", "expense", "transfer"].includes(type)) {
    res.status(400).json({ error: "Некорректный тип операции" });
    return;
  }

  const description = String(body.description || "").trim();
  if (!description) {
    res.status(400).json({ error: "Укажите описание операции" });
    return;
  }

  const amount = parseFloat(String(body.amount || "0"));
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Укажите сумму больше 0" });
    return;
  }

  const currency = String(body.currency || "KGS");
  const exchangeRate = parseFloat(String(body.exchangeRate || "1")) || 1;
  const amountKgs =
    currency === "KGS" ? String(amount) : String(amount * exchangeRate);

  const parseAcc = (v: unknown) =>
    v != null && v !== "" && v !== "none" ? Number(v) : null;

  const legacyAccountId = parseAcc(body.accountId);
  const fromAccountId =
    parseAcc(body.fromAccountId) ??
    (type === "expense" || type === "transfer" ? legacyAccountId : null);
  const toAccountId =
    parseAcc(body.toAccountId) ?? (type === "income" ? legacyAccountId : null);

  if (type === "income" && !toAccountId) {
    res.status(400).json({ error: "Укажите счёт зачисления" });
    return;
  }
  if (type === "expense" && !fromAccountId) {
    res.status(400).json({ error: "Укажите счёт списания" });
    return;
  }
  if (type === "transfer" && (!fromAccountId || !toAccountId)) {
    res.status(400).json({ error: "Укажите счёт списания и счёт зачисления" });
    return;
  }

  let category = String(body.category || "").trim();
  if (!category) {
    if (type === "transfer") category = "Перевод между счетами";
    else if (type === "income") category = "Прочие доходы";
    else category = "Прочие расходы";
  }

  const status = body.status === "pending" ? "pending" : "approved";

  const values = {
    companyId,
    projectId:
      body.projectId != null && body.projectId !== "" && body.projectId !== "none"
        ? Number(body.projectId)
        : null,
    type,
    category,
    fromAccountId,
    toAccountId,
    amount: String(amount),
    currency,
    exchangeRateSource: String(body.exchangeRateSource || "nbkr").slice(0, 32),
    exchangeRate: String(exchangeRate),
    amountKgs,
    date: normalizeOpDate(body.date),
    description,
    paymentMethod: String(body.paymentMethod || "cash"),
    status,
    notes: body.notes ? String(body.notes) : null,
  };

  const balanceOp: OpForBalance = {
    type: values.type,
    status: values.status,
    fromAccountId: values.fromAccountId,
    toAccountId: values.toAccountId,
    amountKgs: values.amountKgs,
  };

  const balanceErr = await validateOpBalances(companyId, balanceOp);
  if (balanceErr) {
    res.status(400).json({ error: balanceErr, code: "INSUFFICIENT_FUNDS" });
    return;
  }

  try {
    const [row] = await db
      .insert(constructionOperationsTable)
      .values(values)
      .returning();

    await applyOpBalances(companyId, balanceOp);

    res.status(201).json(row);
  } catch (e) {
    sendServerError(res, e, "Не удалось сохранить операцию");
  }
});

router.patch("/operations/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const body = req.body ?? {};

  const [existing] = await db
    .select()
    .from(constructionOperationsTable)
    .where(
      and(
        eq(constructionOperationsTable.id, id),
        eq(constructionOperationsTable.companyId, companyId),
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Операция не найдена" });
    return;
  }

  const type = body.type != null ? String(body.type) : existing.type;
  if (!["income", "expense", "transfer"].includes(type)) {
    res.status(400).json({ error: "Некорректный тип операции" });
    return;
  }

  const description =
    body.description != null ? String(body.description).trim() : existing.description;
  if (!description) {
    res.status(400).json({ error: "Укажите описание операции" });
    return;
  }

  const amount =
    body.amount != null ? parseFloat(String(body.amount)) : parseFloat(existing.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Укажите сумму больше 0" });
    return;
  }

  const currency = body.currency != null ? String(body.currency) : existing.currency;
  const exchangeRate =
    body.exchangeRate != null
      ? parseFloat(String(body.exchangeRate)) || 1
      : parseFloat(existing.exchangeRate?.toString() || "1");
  const amountKgs =
    currency === "KGS" ? String(amount) : String(amount * exchangeRate);

  const parseAcc = (v: unknown) =>
    v != null && v !== "" && v !== "none" ? Number(v) : null;
  const legacyAccountId = parseAcc(body.accountId);

  let fromAccountId =
    body.fromAccountId !== undefined
      ? parseAcc(body.fromAccountId)
      : existing.fromAccountId;
  let toAccountId =
    body.toAccountId !== undefined ? parseAcc(body.toAccountId) : existing.toAccountId;

  if (legacyAccountId != null) {
    if (type === "expense" || type === "transfer") fromAccountId = legacyAccountId;
    if (type === "income") toAccountId = legacyAccountId;
  }
  if (type === "expense") toAccountId = null;
  if (type === "income") fromAccountId = null;

  if (type === "income" && !toAccountId) {
    res.status(400).json({ error: "Укажите счёт зачисления" });
    return;
  }
  if (type === "expense" && !fromAccountId) {
    res.status(400).json({ error: "Укажите счёт списания" });
    return;
  }
  if (type === "transfer" && (!fromAccountId || !toAccountId)) {
    res.status(400).json({ error: "Укажите счёт списания и счёт зачисления" });
    return;
  }

  const status =
    body.status != null
      ? body.status === "pending"
        ? "pending"
        : "approved"
      : existing.status;

  const patch = {
    projectId:
      body.projectId !== undefined
        ? body.projectId != null && body.projectId !== "" && body.projectId !== "none"
          ? Number(body.projectId)
          : null
        : existing.projectId,
    type,
    category:
      body.category != null ? String(body.category) : existing.category,
    fromAccountId,
    toAccountId,
    amount: String(amount),
    currency,
    exchangeRateSource:
      body.exchangeRateSource != null
        ? String(body.exchangeRateSource).slice(0, 32)
        : existing.exchangeRateSource,
    exchangeRate: String(exchangeRate),
    amountKgs,
    date: body.date != null ? normalizeOpDate(body.date) : existing.date,
    description,
    status,
    notes: body.notes !== undefined ? (body.notes ? String(body.notes) : null) : existing.notes,
  };

  const balanceOp: OpForBalance = {
    type: patch.type,
    status: patch.status,
    fromAccountId: patch.fromAccountId,
    toAccountId: patch.toAccountId,
    amountKgs: patch.amountKgs,
  };

  try {
    await reverseOpBalances(companyId, {
      type: existing.type,
      status: existing.status,
      fromAccountId: existing.fromAccountId,
      toAccountId: existing.toAccountId,
      amountKgs: existing.amountKgs,
    });

    const balanceErr = await validateOpBalances(companyId, balanceOp);
    if (balanceErr) {
      await applyOpBalances(companyId, {
        type: existing.type,
        status: existing.status,
        fromAccountId: existing.fromAccountId,
        toAccountId: existing.toAccountId,
        amountKgs: existing.amountKgs,
      });
      res.status(400).json({ error: balanceErr, code: "INSUFFICIENT_FUNDS" });
      return;
    }

    const [row] = await db
      .update(constructionOperationsTable)
      .set(patch)
      .where(
        and(
          eq(constructionOperationsTable.id, id),
          eq(constructionOperationsTable.companyId, companyId),
        ),
      )
      .returning();

    await applyOpBalances(companyId, balanceOp);
    res.json(row);
  } catch (e) {
    sendServerError(res, e, "Не удалось обновить операцию");
  }
});

router.delete("/operations/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const [existing] = await db.select().from(constructionOperationsTable)
    .where(and(eq(constructionOperationsTable.id, id), eq(constructionOperationsTable.companyId, companyId)));
  if (!existing) { res.status(404).json({ error: "Операция не найдена" }); return; }
  try {
    await reverseOpBalances(companyId, {
      type: existing.type,
      status: existing.status,
      fromAccountId: existing.fromAccountId,
      toAccountId: existing.toAccountId,
      amountKgs: existing.amountKgs,
    });
    await db.delete(constructionOperationsTable)
      .where(and(eq(constructionOperationsTable.id, id), eq(constructionOperationsTable.companyId, companyId)));
    res.json({ ok: true });
  } catch (e) {
    sendServerError(res, e, "Не удалось удалить операцию");
  }
});

// ── Sales Contracts ─────────────────────────────────────────────────────
router.get("/contracts-sales", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, companyId))
    .orderBy(desc(constructionSalesContractsTable.createdAt));
  res.json(rows.map(mapSalesContractResponse));
});

async function insertAccrualsFromSchedule(
  companyId: number,
  contract: { id: number; projectId: number; currency: string | null },
  schedule: ScheduleRow[],
) {
  await db.delete(constructionAccrualsTable).where(
    and(
      eq(constructionAccrualsTable.contractId, contract.id),
      eq(constructionAccrualsTable.companyId, companyId),
    ),
  );

  if (schedule.length === 0) return [];

  const values = schedule.map((row) => ({
    companyId,
    contractId: contract.id,
    projectId: contract.projectId,
    installmentNumber: row.installmentNumber,
    dueDate: row.dueDate,
    amount: String(row.amount),
    paidAmount: "0",
    remainingAmount: String(row.amount),
    status: "pending" as const,
    currency: contract.currency || "KGS",
    notes: row.label || null,
  }));

  return db.insert(constructionAccrualsTable).values(values).returning();
}

router.post("/contracts-sales", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body;

  // Auto-calculate total amount from unit area × pricePerSqm if not provided
  let total = parseFloat(body.totalAmount || "0");
  if (total <= 0 && body.unitId) {
    const [unit] = await db.select()
      .from(constructionUnitsTable)
      .where(and(eq(constructionUnitsTable.id, Number(body.unitId)), eq(constructionUnitsTable.companyId, companyId)));
    if (unit) {
      const area = parseFloat(String(unit.area || "0"));
      const pps = parseFloat(String(unit.pricePerSqm || "0"));
      if (area > 0 && pps > 0) total = area * pps;
    }
  }

  const down = parseFloat(body.downPayment || "0");
  const remainingAmount = String(Math.max(0, total - down));

  const count = await db.select({ cnt: sql<number>`count(*)` })
    .from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, companyId));
  const num = (Number(count[0].cnt) + 1).toString().padStart(4, "0");
  const contractNumber = `ДКП-${new Date().getFullYear()}-${num}`;

  const [row] = await db.insert(constructionSalesContractsTable)
    .values({
      ...body,
      companyId,
      remainingAmount,
      contractNumber,
      status: body.status || "draft",
      installmentMonths: body.installmentMonths
        ? parseInt(body.installmentMonths, 10)
        : 0,
    })
    .returning();

  const unitStatus = body.unitStatus || "reserved";
  if (body.unitId) {
    const unitPatch: Record<string, unknown> = { status: unitStatus };
    if (total > 0) unitPatch.totalPrice = String(total);
    await db.update(constructionUnitsTable)
      .set(unitPatch)
      .where(and(eq(constructionUnitsTable.id, Number(body.unitId)), eq(constructionUnitsTable.companyId, companyId)));
  }

  res.json(row);
});

/** Оформление брони/продажи из шахматки: договор на утверждение + график */
router.post("/contracts-sales/from-unit", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body;
  const unitId = Number(body.unitId);
  const projectId = Number(body.projectId);

  if (!unitId || !projectId) {
    res.status(400).json({ error: "unitId и projectId обязательны" });
    return;
  }

  const [unit] = await db.select().from(constructionUnitsTable).where(
    and(
      eq(constructionUnitsTable.id, unitId),
      eq(constructionUnitsTable.companyId, companyId),
      eq(constructionUnitsTable.projectId, projectId),
    ),
  );
  if (!unit) {
    res.status(404).json({ error: "Квартира не найдена" });
    return;
  }

  const buyerName = String(body.buyerName || "").trim();
  if (!buyerName) {
    res.status(400).json({ error: "Укажите данные покупателя" });
    return;
  }

  const totalAmount = parseFloat(body.totalAmount || "0");
  if (totalAmount <= 0) {
    res.status(400).json({ error: "Укажите сумму договора" });
    return;
  }

  const downPayment = parseFloat(body.downPayment || "0");
  const installmentMonths = Math.max(0, parseInt(body.installmentMonths || "0", 10));
  const contractDate = body.contractDate || new Date().toISOString().slice(0, 10);
  const unitStatus = body.unitStatus === "sold" ? "sold" : "reserved";

  const existing = await db.select().from(constructionSalesContractsTable).where(
    and(
      eq(constructionSalesContractsTable.companyId, companyId),
      eq(constructionSalesContractsTable.unitId, unitId),
      sql`status IN ('draft', 'review', 'signed')`,
    ),
  );
  if (existing.length > 0) {
    res.status(409).json({
      error: "По этой квартире уже есть активный договор",
      contractId: existing[0].id,
    });
    return;
  }

  let schedule: ScheduleRow[] = Array.isArray(body.schedule)
    ? body.schedule.map((r: ScheduleRow, idx: number) => ({
        installmentNumber: r.installmentNumber ?? idx,
        dueDate: r.dueDate,
        amount: Math.round(parseFloat(String(r.amount))),
        label: r.label,
      }))
    : [];

  if (schedule.length === 0) {
    schedule = buildPaymentSchedule(
      totalAmount,
      downPayment,
      installmentMonths || 1,
      contractDate,
    );
  }

  const schedTotal = scheduleTotal(schedule);
  if (Math.abs(schedTotal - totalAmount) > 1) {
    res.status(400).json({
      error: `Сумма графика (${schedTotal}) должна совпадать с суммой договора (${totalAmount})`,
    });
    return;
  }

  const remainingAmount = String(Math.max(0, totalAmount - downPayment));
  const count = await db.select({ cnt: sql<number>`count(*)` })
    .from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, companyId));
  const num = (Number(count[0].cnt) + 1).toString().padStart(4, "0");
  const contractNumber = `ДКП-${new Date().getFullYear()}-${num}`;

  let buyerId: number | null = body.buyerId ? Number(body.buyerId) : null;
  if (!buyerId) {
    const [existingCp] = await db
      .select()
      .from(counterpartiesTable)
      .where(
        and(
          eq(counterpartiesTable.companyId, companyId),
          ilike(counterpartiesTable.fullName, buyerName),
        ),
      )
      .limit(1);
    if (existingCp) {
      buyerId = existingCp.id;
    } else {
      const [created] = await db
        .insert(counterpartiesTable)
        .values({
          companyId,
          type: "individual",
          category: "buyer",
          fullName: buyerName,
          phone: body.buyerPhone || null,
        })
        .returning();
      buyerId = created?.id ?? null;
    }
  }

  const [contract] = await db.insert(constructionSalesContractsTable)
    .values({
      companyId,
      projectId,
      unitId,
      buyerId,
      buyerName,
      buyerPhone: body.buyerPhone || null,
      totalAmount: String(totalAmount),
      downPayment: String(downPayment),
      remainingAmount,
      paidAmount: "0",
      installmentMonths: installmentMonths || schedule.filter((s) => s.installmentNumber > 0).length,
      currency: body.currency || unit.currency || "KGS",
      exchangeRate: body.exchangeRate ? String(body.exchangeRate) : "1",
      contractDate,
      status: "review",
      notes: body.notes || null,
      contractNumber,
    })
    .returning();

  await db.update(constructionUnitsTable)
    .set({
      status: unitStatus,
      totalPrice: String(totalAmount),
      buyerId: buyerId || body.buyerId || null,
      contractDate,
    })
    .where(and(eq(constructionUnitsTable.id, unitId), eq(constructionUnitsTable.companyId, companyId)));

  const accruals = await insertAccrualsFromSchedule(companyId, contract, schedule);

  res.status(201).json({ contract, accruals, schedule });
});

router.patch("/contracts-sales/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const body = req.body;

  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)));
  if (!contract) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }

  if (body.status && contract.unitId) {
    if (body.status === "signed" || body.status === "completed") {
      await db.update(constructionUnitsTable)
        .set({ status: "sold" })
        .where(and(eq(constructionUnitsTable.id, contract.unitId), eq(constructionUnitsTable.companyId, companyId)));
    } else if (body.status === "cancelled") {
      await db.update(constructionUnitsTable)
        .set({
          status: "available",
          buyerId: null,
          contractDate: null,
        })
        .where(and(eq(constructionUnitsTable.id, contract.unitId), eq(constructionUnitsTable.companyId, companyId)));
    } else if (body.status === "draft" && contract.status === "cancelled") {
      await db.update(constructionUnitsTable)
        .set({ status: "reserved" })
        .where(and(eq(constructionUnitsTable.id, contract.unitId), eq(constructionUnitsTable.companyId, companyId)));
    }
  }

  const [row] = await db.update(constructionSalesContractsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)))
    .returning();
  res.json(row);
});

router.delete("/contracts-sales/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);

  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)));

  await db.delete(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)));

  if (contract?.unitId) {
    await db.update(constructionUnitsTable)
      .set({
        status: "available",
        buyerId: null,
        contractDate: null,
      })
      .where(and(eq(constructionUnitsTable.id, contract.unitId), eq(constructionUnitsTable.companyId, companyId)));
  }

  res.json({ ok: true });
});

router.get("/contracts-sales/:id/reconciliation", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);

  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)));
  if (!contract) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }

  const accruals = await db.select().from(constructionAccrualsTable)
    .where(and(
      eq(constructionAccrualsTable.contractId, id),
      eq(constructionAccrualsTable.companyId, companyId),
    ))
    .orderBy(constructionAccrualsTable.dueDate);

  const payments = await db.select({
    date: constructionOperationsTable.date,
    description: constructionOperationsTable.description,
    amount: constructionOperationsTable.amount,
    currency: constructionOperationsTable.currency,
    paymentMethod: constructionOperationsTable.paymentMethod,
  })
    .from(constructionOperationsTable)
    .where(and(
      eq(constructionOperationsTable.contractId, id),
      eq(constructionOperationsTable.companyId, companyId),
      eq(constructionOperationsTable.type, "income"),
    ))
    .orderBy(desc(constructionOperationsTable.date));

  const totalCharged = accruals.reduce(
    (s, a) => s + parseFloat(String(a.amount ?? 0)),
    0,
  );
  const totalPaid = payments.reduce(
    (s, p) => s + parseFloat(String(p.amount ?? 0)),
    0,
  );
  const contractAmount = parseFloat(String(contract.totalAmount ?? 0));
  const currency = contract.currency ?? "KGS";

  res.json({
    contract: mapSalesContractResponse(contract),
    reconciliation: buildBuyerReconciliation({
      accruals,
      payments,
      contractAmount,
      totalCharged,
      totalPaid,
      currency,
    }),
  });
});

router.post("/contracts-sales/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const built = buildContractDocumentMeta(req.body);
  if (built.error) {
    res.status(400).json({ error: built.error });
    return;
  }
  const [row] = await db.update(constructionSalesContractsTable)
    .set({ contractDocumentMeta: built.meta! })
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }
  res.json({ ok: true, contractDocument: built.summary });
});

router.get("/contracts-sales/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const [row] = await db.select().from(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)));
  if (!row) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }
  const doc = parseContractDocumentMeta(row.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" });
    return;
  }
  res.json(doc);
});

router.delete("/contracts-sales/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const [row] = await db.update(constructionSalesContractsTable)
    .set({ contractDocumentMeta: null })
    .where(and(eq(constructionSalesContractsTable.id, id), eq(constructionSalesContractsTable.companyId, companyId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }
  res.json({ ok: true });
});

router.post("/contracts-sales/:id/generate-schedule", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(eq(constructionSalesContractsTable.id, Number(req.params.id)), eq(constructionSalesContractsTable.companyId, companyId)));
  if (!contract) {
    res.status(404).json({ error: "Договор не найден" });
    return;
  }

  const installments = Math.max(1, contract.installmentMonths || 1);
  const total = parseFloat(contract.totalAmount?.toString() || "0");
  const down = parseFloat(contract.downPayment?.toString() || "0");
  const startDate = contract.contractDate || new Date().toISOString().slice(0, 10);

  const schedule = buildPaymentSchedule(total, down, installments, startDate);
  const rows = await insertAccrualsFromSchedule(companyId, contract, schedule);
  res.json(rows);
});

// ── Accruals ────────────────────────────────────────────────────────────
router.get("/accruals", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { contractId } = req.query;
  const rows = await db.select().from(constructionAccrualsTable)
    .where(
      contractId
        ? and(eq(constructionAccrualsTable.companyId, companyId), eq(constructionAccrualsTable.contractId, Number(contractId)))
        : eq(constructionAccrualsTable.companyId, companyId)
    )
    .orderBy(constructionAccrualsTable.dueDate);
  res.json(rows);
});

router.patch("/accruals/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);

  const [before] = await db
    .select()
    .from(constructionAccrualsTable)
    .where(
      and(
        eq(constructionAccrualsTable.id, id),
        eq(constructionAccrualsTable.companyId, companyId),
      ),
    );

  if (!before) {
    res.status(404).json({ error: "Начисление не найдено" });
    return;
  }

  const [row] = await db
    .update(constructionAccrualsTable)
    .set(req.body)
    .where(
      and(
        eq(constructionAccrualsTable.id, id),
        eq(constructionAccrualsTable.companyId, companyId),
      ),
    )
    .returning();

  const prevPaid = parseFloat(before.paidAmount?.toString() || "0");
  const newPaid = parseFloat(row.paidAmount?.toString() || "0");
  const delta = newPaid - prevPaid;
  const markedPaid =
    row.status === "paid" && before.status !== "paid" && delta <= 0;
  const payAmount = delta > 0
    ? delta
    : markedPaid
      ? parseFloat(before.remainingAmount?.toString() || before.amount?.toString() || "0")
      : 0;

  if (payAmount > 0) {
    try {
      await applyContractPayment({
        companyId,
        contractId: row.contractId,
        projectId: row.projectId,
        accrualId: row.id,
        amount: payAmount,
        currency: row.currency,
        date: row.paidAt || req.body.paidAt,
        updateAccrual: false,
        source: "accruals",
        notes: req.body.notes,
      });
    } catch (err) {
      console.error("Accrual payment sync error:", err);
    }
  }

  res.json(row);
});

router.post(
  "/accruals/:id/cancel-payment",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    try {
      const result = await cancelAccrualPayment(companyId, id);
      res.json({ ok: true, ...result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось отменить платёж";
      res.status(400).json({ error: message });
    }
  },
);

// ── Cashier — accept payment ────────────────────────────────────────────
router.post("/cashier/payment", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const {
    contractId,
    accrualId,
    amount,
    currency,
    exchangeRate,
    accountId,
    paymentMethod,
    date,
    notes,
    projectId,
  } = req.body;

  try {
    const result = await applyContractPayment({
      companyId,
      contractId: Number(contractId),
      projectId,
      accrualId: accrualId ? Number(accrualId) : null,
      amount,
      currency: currency || "KGS",
      exchangeRate,
      accountId,
      paymentMethod,
      date,
      notes,
      source: "cashier",
    });
    res.json({
      ok: true,
      operation: result.operation,
      allocations: result.allocations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка проведения платежа";
    res.status(400).json({ error: message });
  }
});

// ── Analytics ───────────────────────────────────────────────────────────
router.get("/analytics/cashflow", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { year = new Date().getFullYear() } = req.query;

  const rows = await db.select({
    month: sql<string>`to_char(date::date, 'YYYY-MM')`,
    type: constructionOperationsTable.type,
    total: sql<number>`sum(amount_kgs::numeric)`,
  }).from(constructionOperationsTable)
    .where(and(
      eq(constructionOperationsTable.companyId, companyId),
      sql`extract(year from date::date) = ${year}`
    ))
    .groupBy(sql`to_char(date::date, 'YYYY-MM')`, constructionOperationsTable.type)
    .orderBy(sql`to_char(date::date, 'YYYY-MM')`);

  res.json(rows);
});

router.get("/analytics/debt", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(constructionAccrualsTable)
    .where(and(
      eq(constructionAccrualsTable.companyId, companyId),
      sql`status != 'paid'`
    ))
    .orderBy(constructionAccrualsTable.dueDate);
  res.json(rows);
});

router.get("/analytics/summary", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;

  const [opStats] = await db.select({
    totalIncome: sql<number>`sum(case when type='income' then amount_kgs::numeric else 0 end)`,
    totalExpense: sql<number>`sum(case when type='expense' then amount_kgs::numeric else 0 end)`,
  }).from(constructionOperationsTable).where(eq(constructionOperationsTable.companyId, companyId));

  const [contractStats] = await db.select({
    totalContracts: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(total_amount::numeric)`,
    totalPaid: sql<number>`sum(paid_amount::numeric)`,
    totalRemaining: sql<number>`sum(remaining_amount::numeric)`,
  }).from(constructionSalesContractsTable).where(eq(constructionSalesContractsTable.companyId, companyId));

  res.json({ opStats, contractStats });
});

export default router;
