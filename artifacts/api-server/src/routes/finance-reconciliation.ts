import { Router } from "express";
import { db } from "../lib/db";
import {
  bankAccountsTable,
  constructionOperationsTable,
  financeReconciliationLinesTable,
} from "../lib/db";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";
import {
  applyOpBalances,
  validateOpBalances,
  type OpForBalance,
} from "../lib/construction-operation-balances";
import {
  BANK_ACCOUNT_MODULE,
  companyModuleAccountWhere,
} from "../lib/bank-account-module";
import { randomUUID } from "node:crypto";

const router = Router();
router.use(requireAuth, requireTenantCompany);

const CONSTRUCTION_ACCOUNTS = BANK_ACCOUNT_MODULE.construction;
const VALID_SOURCES = new Set(["one_c", "bank", "manual"]);
const HISTORY_STATUSES = new Set(["confirmed", "posted", "rejected"]);

function normalizeDate(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return s.slice(0, 10);
}

function absAmount(raw: unknown): string {
  const n = parseFloat(String(raw || "0"));
  if (!Number.isFinite(n)) return "0";
  return String(Math.abs(n));
}

async function lookupSuggestion(
  companyId: number,
  counterpartyName: string | null | undefined,
) {
  const name = String(counterpartyName || "").trim();
  if (!name) return null;

  const [past] = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(
      and(
        eq(financeReconciliationLinesTable.companyId, companyId),
        eq(financeReconciliationLinesTable.reviewStatus, "posted"),
        ilike(financeReconciliationLinesTable.counterpartyName, name),
      ),
    )
    .orderBy(desc(financeReconciliationLinesTable.reviewedAt))
    .limit(1);

  if (!past?.confirmedProjectId && !past?.confirmedCategory) return null;

  return {
    suggestedProjectId: past.confirmedProjectId,
    suggestedCategory: past.confirmedCategory,
    suggestedStageId: past.confirmedStageId,
    suggestionReason: `Ранее проведено по контрагенту «${name}»`,
    reviewStatus: "suggested" as const,
  };
}

function buildPairKey(date: string, amount: string): string {
  return `${date}|${absAmount(amount)}`;
}

// GET /finance-reconciliation/inbox
router.get("/inbox", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const reviewStatus = String(req.query.reviewStatus || "").trim();
  const source = String(req.query.source || "").trim();

  const conditions = [eq(financeReconciliationLinesTable.companyId, companyId)];

  if (reviewStatus && reviewStatus !== "all") {
    conditions.push(eq(financeReconciliationLinesTable.reviewStatus, reviewStatus));
  } else {
    conditions.push(
      inArray(financeReconciliationLinesTable.reviewStatus, ["inbox", "suggested"]),
    );
  }

  if (source && source !== "all") {
    conditions.push(eq(financeReconciliationLinesTable.source, source));
  }

  const rows = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(and(...conditions))
    .orderBy(desc(financeReconciliationLinesTable.operationDate), desc(financeReconciliationLinesTable.id));

  res.json(rows);
});

// GET /finance-reconciliation/matching
router.get("/matching", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;

  const rows = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(
      and(
        eq(financeReconciliationLinesTable.companyId, companyId),
        inArray(financeReconciliationLinesTable.reviewStatus, ["inbox", "suggested", "confirmed"]),
        or(
          eq(financeReconciliationLinesTable.source, "one_c"),
          eq(financeReconciliationLinesTable.source, "bank"),
        ),
      ),
    )
    .orderBy(desc(financeReconciliationLinesTable.operationDate));

  type Group = {
    pairGroupId: string | null;
    operationDate: string;
    amount: string;
    oneCLines: typeof rows;
    bankLines: typeof rows;
    matchStatus: string;
  };

  const byPair = new Map<string, Group>();

  for (const row of rows) {
    const key = row.pairGroupId || buildPairKey(row.operationDate, row.amount);
    let group = byPair.get(key);
    if (!group) {
      group = {
        pairGroupId: row.pairGroupId,
        operationDate: row.operationDate,
        amount: absAmount(row.amount),
        oneCLines: [],
        bankLines: [],
        matchStatus: row.matchStatus,
      };
      byPair.set(key, group);
    }
    if (row.source === "one_c") group.oneCLines.push(row);
    else if (row.source === "bank") group.bankLines.push(row);
  }

  const groups = [...byPair.values()].map((g) => {
    const hasOneC = g.oneCLines.length > 0;
    const hasBank = g.bankLines.length > 0;
    let matchStatus = "unmatched";
    if (hasOneC && hasBank) {
      matchStatus = g.oneCLines.length === 1 && g.bankLines.length === 1 ? "matched" : "conflict";
    }
    return { ...g, matchStatus };
  });

  res.json({
    groups,
    unmatchedOneC: groups.filter((g) => g.oneCLines.length > 0 && g.bankLines.length === 0),
    unmatchedBank: groups.filter((g) => g.bankLines.length > 0 && g.oneCLines.length === 0),
    conflicts: groups.filter((g) => g.matchStatus === "conflict"),
  });
});

// GET /finance-reconciliation/history
router.get("/history", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;

  const rows = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(
      and(
        eq(financeReconciliationLinesTable.companyId, companyId),
        inArray(financeReconciliationLinesTable.reviewStatus, [...HISTORY_STATUSES]),
      ),
    )
    .orderBy(desc(financeReconciliationLinesTable.reviewedAt), desc(financeReconciliationLinesTable.id));

  res.json(rows);
});

// POST /finance-reconciliation/import
router.post("/import", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const source = String(req.body?.source || "").trim();
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];

  if (!VALID_SOURCES.has(source)) {
    res.status(400).json({ error: "source должен быть one_c, bank или manual" });
    return;
  }
  if (!lines.length) {
    res.status(400).json({ error: "Передайте массив lines" });
    return;
  }

  try {
    const normalized = lines.map((line: Record<string, unknown>, idx: number) => {
      const operationDate = normalizeDate(line.operationDate);
      const amount = String(line.amount ?? "0");
      return {
        companyId,
        source,
        externalRef: line.externalRef ? String(line.externalRef) : null,
        operationDate,
        amount,
        currency: String(line.currency || "KGS"),
        counterpartyName: line.counterpartyName ? String(line.counterpartyName) : null,
        counterpartyInn: line.counterpartyInn ? String(line.counterpartyInn) : null,
        description: line.description ? String(line.description) : null,
        bankAccountRef: line.bankAccountRef ? String(line.bankAccountRef) : null,
        rawPayload: line.rawPayload ? JSON.stringify(line.rawPayload) : null,
        matchStatus: "unmatched",
        reviewStatus: "inbox" as const,
        pairGroupId: null as string | null,
      };
    });

    // Simple date+amount matching against existing lines of opposite source
    const oppositeSource = source === "one_c" ? "bank" : source === "bank" ? "one_c" : null;

    if (oppositeSource) {
      for (const row of normalized) {
        const pairKey = buildPairKey(row.operationDate, row.amount);
        const [existing] = await db
          .select()
          .from(financeReconciliationLinesTable)
          .where(
            and(
              eq(financeReconciliationLinesTable.companyId, companyId),
              eq(financeReconciliationLinesTable.source, oppositeSource),
              eq(financeReconciliationLinesTable.operationDate, row.operationDate),
              sql`abs(${financeReconciliationLinesTable.amount}::numeric) = ${absAmount(row.amount)}::numeric`,
              inArray(financeReconciliationLinesTable.reviewStatus, ["inbox", "suggested"]),
            ),
          )
          .limit(1);

        if (existing) {
          const groupId = existing.pairGroupId || randomUUID();
          row.pairGroupId = groupId;
          row.matchStatus = "matched";
          if (!existing.pairGroupId) {
            await db
              .update(financeReconciliationLinesTable)
              .set({ pairGroupId: groupId, matchStatus: "matched" })
              .where(eq(financeReconciliationLinesTable.id, existing.id));
          }
        }
      }
    }

    const inserted = [];
    for (const row of normalized) {
      const suggestion = await lookupSuggestion(companyId, row.counterpartyName);
      const [created] = await db
        .insert(financeReconciliationLinesTable)
        .values({
          ...row,
          ...(suggestion ?? {}),
        })
        .returning();
      inserted.push(created);
    }

    res.status(201).json({ imported: inserted.length, lines: inserted });
  } catch (e) {
    sendServerError(res, e, "Не удалось импортировать строки");
  }
});

// PATCH /finance-reconciliation/:id
router.patch("/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const body = req.body ?? {};

  const [existing] = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(
      and(
        eq(financeReconciliationLinesTable.id, id),
        eq(financeReconciliationLinesTable.companyId, companyId),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Строка не найдена" });
    return;
  }

  const reviewStatus = body.reviewStatus ? String(body.reviewStatus) : undefined;
  if (reviewStatus && !["inbox", "suggested", "confirmed", "posted", "rejected"].includes(reviewStatus)) {
    res.status(400).json({ error: "Некорректный reviewStatus" });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (reviewStatus) patch.reviewStatus = reviewStatus;
  if (body.confirmedProjectId !== undefined) {
    patch.confirmedProjectId =
      body.confirmedProjectId != null && body.confirmedProjectId !== ""
        ? Number(body.confirmedProjectId)
        : null;
  }
  if (body.confirmedCategory !== undefined) {
    patch.confirmedCategory = body.confirmedCategory ? String(body.confirmedCategory) : null;
  }
  if (body.confirmedStageId !== undefined) {
    patch.confirmedStageId =
      body.confirmedStageId != null && body.confirmedStageId !== ""
        ? Number(body.confirmedStageId)
        : null;
  }

  if (reviewStatus === "confirmed" || reviewStatus === "rejected") {
    patch.reviewedBy = req.userId;
    patch.reviewedAt = new Date();
  }

  try {
    const [row] = await db
      .update(financeReconciliationLinesTable)
      .set(patch)
      .where(eq(financeReconciliationLinesTable.id, id))
      .returning();
    res.json(row);
  } catch (e) {
    sendServerError(res, e, "Не удалось обновить строку");
  }
});

// POST /finance-reconciliation/:id/post
router.post("/:id/post", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);

  const [line] = await db
    .select()
    .from(financeReconciliationLinesTable)
    .where(
      and(
        eq(financeReconciliationLinesTable.id, id),
        eq(financeReconciliationLinesTable.companyId, companyId),
      ),
    );

  if (!line) {
    res.status(404).json({ error: "Строка не найдена" });
    return;
  }

  if (line.reviewStatus === "posted") {
    res.status(400).json({ error: "Строка уже проведена" });
    return;
  }

  if (line.reviewStatus !== "confirmed" && line.reviewStatus !== "suggested") {
    res.status(400).json({ error: "Сначала подтвердите строку" });
    return;
  }

  const rawAmount = parseFloat(String(line.amount || "0"));
  const amountNum = Math.abs(rawAmount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    res.status(400).json({ error: "Некорректная сумма" });
    return;
  }

  const type = rawAmount >= 0 ? "income" : "expense";

  const [defaultAccount] = await db
    .select()
    .from(bankAccountsTable)
    .where(companyModuleAccountWhere(companyId, CONSTRUCTION_ACCOUNTS))
    .limit(1);

  if (!defaultAccount) {
    res.status(400).json({ error: "Создайте счёт строительства для проведения операции" });
    return;
  }

  const projectId = line.confirmedProjectId ?? line.suggestedProjectId ?? null;
  const category =
    line.confirmedCategory ??
    line.suggestedCategory ??
    (type === "income" ? "Прочие доходы" : "Прочие расходы");

  const description =
    line.description?.trim() ||
    `Сверка: ${line.counterpartyName || "без контрагента"} (${line.source})`;

  const values = {
    companyId,
    projectId,
    type,
    category,
    fromAccountId: type === "expense" ? defaultAccount.id : null,
    toAccountId: type === "income" ? defaultAccount.id : null,
    amount: String(amountNum),
    currency: line.currency || "KGS",
    exchangeRateSource: "nbkr",
    exchangeRate: "1",
    amountKgs: String(amountNum),
    date: line.operationDate,
    description,
    paymentMethod: line.source === "bank" ? "transfer" : "cash",
    status: "approved" as const,
    notes: line.externalRef ? `ref: ${line.externalRef}` : null,
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
    const [op] = await db.insert(constructionOperationsTable).values(values).returning();
    await applyOpBalances(companyId, balanceOp);

    const [updated] = await db
      .update(financeReconciliationLinesTable)
      .set({
        reviewStatus: "posted",
        constructionOperationId: op.id,
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        confirmedProjectId: projectId,
        confirmedCategory: category,
      })
      .where(eq(financeReconciliationLinesTable.id, id))
      .returning();

    res.status(201).json({ line: updated, operation: op });
  } catch (e) {
    sendServerError(res, e, "Не удалось провести операцию");
  }
});

export default router;
