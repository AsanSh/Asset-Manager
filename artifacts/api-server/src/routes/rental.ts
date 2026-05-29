import { Router } from "express";
import { eq, and, SQL, sql, asc, inArray, gt } from "drizzle-orm";
import {
  db, propertiesTable, tenantsTable, leaseContractsTable,
  accrualsTable, paymentsTable, depositsTable, expensesTable,
  ownerStatementsTable, paymentAllocationsTable, bankAccountsTable,
  activityLogTable,
} from "../lib/db";

import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import {
  BANK_ACCOUNT_MODULE,
  accountExistsInModule,
  companyModuleAccountByIdWhere,
  companyModuleAccountWhere,
} from "../lib/bank-account-module";
import { investmentsTable } from "../lib/db";
import { ensureCounterpartyWithRole } from "../lib/counterparty-sync";

const RENTAL_ACCOUNTS = BANK_ACCOUNT_MODULE.rental;

async function contractOutstandingBalance(contractId: number): Promise<number> {
  const rows = await db.select().from(accrualsTable).where(eq(accrualsTable.leaseContractId, contractId));
  return rows.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);
}

async function refreshPropertyRentalStatus(propertyId: number, companyId?: number): Promise<void> {
  const conditions: SQL[] = [
    eq(leaseContractsTable.propertyId, propertyId),
    eq(leaseContractsTable.status, "active"),
  ];
  if (companyId) conditions.push(eq(leaseContractsTable.companyId, companyId));
  const [active] = await db.select().from(leaseContractsTable).where(and(...conditions));
  const propConditions: SQL[] = [eq(propertiesTable.id, propertyId)];
  if (companyId) propConditions.push(eq(propertiesTable.companyId, companyId));
  await db
    .update(propertiesTable)
    .set({ rentalStatus: active ? "rented" : "free" })
    .where(and(...propConditions));
}

async function logOp(
  companyId: number, userId: number | undefined,
  entityType: string, entityId: number | null,
  actionType: "create" | "update" | "delete",
  description: string,
  snapshot?: object,
) {
  await db.insert(activityLogTable).values({
    companyId, userId: userId ?? null,
    type: entityType, description,
    entityType, entityId,
    module: "rental", actionType,
    snapshot: snapshot ? JSON.stringify(snapshot) : null,
  });
}

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ---------- HELPERS ----------

/** Количество дней в месяце */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Строит массив начислений для договора с пропорциональным расчётом
 * первого и последнего месяца (если начало/конец не совпадают с 1-м / последним днём месяца).
 */
function buildAccrualRows(params: {
  companyId: number;
  leaseContractId: number;
  startDate: Date;
  endDate: Date | null;
  rentAmount: number;
  currency: string;
  accrualDay: number;
}) {
  const { companyId, leaseContractId, startDate, endDate, rentAmount, currency, accrualDay } = params;
  const rows: {
    companyId: number; leaseContractId: number; period: string; amount: string;
    currency: string; dueDate: string; paidAmount: string; balance: string; status: string;
  }[] = [];

  // Граница: если endDate не задана, генерируем 12 месяцев вперёд
  const end = endDate
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    : new Date(startDate.getFullYear(), startDate.getMonth() + 12, 0);

  // Итерируем по месяцам, начиная с месяца startDate
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let isFirstMonth = true;

  while (current <= end) {
    const yr = current.getFullYear();
    const mo = current.getMonth(); // 0-based
    const dim = daysInMonth(yr, mo);
    const moStr = String(mo + 1).padStart(2, "0");
    const period = `${yr}-${moStr}`;

    // День срока оплаты (не превышает кол-во дней в месяце)
    const dueDay = Math.min(accrualDay || 1, dim);
    const dueDateStr = `${yr}-${moStr}-${String(dueDay).padStart(2, "0")}`;

    // --- Пропорциональный расчёт ---
    let amount = rentAmount;

    // Первый месяц: если начало не 1-е число
    const isLastMonth = endDate
      && current.getFullYear() === endDate.getFullYear()
      && current.getMonth() === endDate.getMonth();

    if (isFirstMonth && startDate.getDate() > 1 && !isLastMonth) {
      // Дней в первом месяце с даты начала
      const daysRented = dim - startDate.getDate() + 1;
      amount = Math.round((rentAmount / dim) * daysRented * 100) / 100;
    } else if (isFirstMonth && isLastMonth) {
      // Договор начинается и заканчивается в одном месяце
      const daysRented = endDate!.getDate() - startDate.getDate() + 1;
      amount = Math.round((rentAmount / dim) * daysRented * 100) / 100;
    } else if (isLastMonth && endDate && endDate.getDate() < dim) {
      // Последний месяц: если конец не последнее число
      amount = Math.round((rentAmount / dim) * endDate.getDate() * 100) / 100;
    }

    rows.push({
      companyId, leaseContractId, period,
      amount: String(amount), currency,
      dueDate: dueDateStr,
      paidAmount: "0", balance: String(amount), status: "pending",
    });

    isFirstMonth = false;
    current.setMonth(current.getMonth() + 1);
  }

  return rows;
}

// ---------- END HELPERS ----------

// ── BANK ACCOUNTS (только модуль «Аренда») ──────────────────────────────
router.get("/rental/accounts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountWhere(companyId, RENTAL_ACCOUNTS))
    .orderBy(bankAccountsTable.name);
  res.json(rows);
});

router.post("/rental/accounts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { name, type, bank, bik, accountNumber, currency, openingBalance, notes } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const open = openingBalance || "0";
  const [row] = await db.insert(bankAccountsTable).values({
    companyId: req.scopedCompanyId!,
    module: RENTAL_ACCOUNTS,
    name,
    type: type || "bank",
    bank,
    bik,
    accountNumber,
    currency: currency || "KGS",
    openingBalance: open,
    currentBalance: open,
    notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/rental/accounts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(req.params.id as string, 10);
  const { module: _m, companyId: _c, ...body } = req.body ?? {};
  const [row] = await db.update(bankAccountsTable)
    .set(body)
    .where(companyModuleAccountByIdWhere(companyId, id, RENTAL_ACCOUNTS))
    .returning();
  if (!row) { res.status(404).json({ error: "Счёт не найден" }); return; }
  res.json(row);
});

router.delete("/rental/accounts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(req.params.id as string, 10);
  const [acc] = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountByIdWhere(companyId, id, RENTAL_ACCOUNTS));
  if (!acc) { res.status(404).json({ error: "Счёт не найден" }); return; }
  const balance = parseFloat(acc.currentBalance || "0");
  if (Math.abs(balance) > 0.005) {
    res.status(409).json({ error: "Нельзя удалить счёт с ненулевым балансом. Сначала переведите или спишите средства." });
    return;
  }
  await db.delete(bankAccountsTable)
    .where(companyModuleAccountByIdWhere(companyId, id, RENTAL_ACCOUNTS));
  res.json({ ok: true });
});

// Recalculate all rental account balances from actual payments/deposits minus expenses
router.post("/rental/accounts/recalculate", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const accounts = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountWhere(companyId, RENTAL_ACCOUNTS));

  const updated: { id: number; newBalance: string }[] = [];
  for (const acc of accounts) {
    const [inRow] = await db.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.accountId, acc.id)));
    const [depRow] = await db.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(depositsTable)
      .where(and(eq(depositsTable.companyId, companyId), eq(depositsTable.accountId, acc.id)));
    const [outRow] = await db.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(expensesTable)
      .where(and(eq(expensesTable.companyId, companyId), eq(expensesTable.accountId, acc.id)));

    const inflow = parseFloat(inRow?.total ?? "0") + parseFloat(depRow?.total ?? "0");
    const outflow = parseFloat(outRow?.total ?? "0");
    const newBalance = Math.max(0, inflow - outflow).toFixed(2);

    await db.update(bankAccountsTable)
      .set({ currentBalance: newBalance })
      .where(eq(bankAccountsTable.id, acc.id));
    updated.push({ id: acc.id, newBalance });
  }
  res.json({ ok: true, updated });
});

router.post("/rental/accounts/transfer", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { fromAccountId, toAccountId, amount, rate, date, note } = req.body;
  if (!fromAccountId || !toAccountId || !amount) {
    res.status(400).json({ error: "fromAccountId, toAccountId and amount required" }); return;
  }
  if (fromAccountId === toAccountId) {
    res.status(400).json({ error: "Счёт источник и назначение не могут совпадать" }); return;
  }
  const [fromAcc] = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountByIdWhere(companyId, fromAccountId, RENTAL_ACCOUNTS));
  const [toAcc] = await db.select().from(bankAccountsTable)
    .where(companyModuleAccountByIdWhere(companyId, toAccountId, RENTAL_ACCOUNTS));

  if (!fromAcc || !toAcc) { res.status(404).json({ error: "Счёт не найден в модуле «Аренда»" }); return; }

  const fromBal = parseFloat(fromAcc.currentBalance || "0");
  const debit = parseFloat(amount);
  // credit: if different currency apply rate, else same amount
  const credit = rate ? debit * parseFloat(rate) : debit;

  const newFromBal = (fromBal - debit).toFixed(2);
  const newToBal = (parseFloat(toAcc.currentBalance || "0") + credit).toFixed(2);

  await db.update(bankAccountsTable)
    .set({ currentBalance: newFromBal })
    .where(eq(bankAccountsTable.id, fromAccountId));
  await db.update(bankAccountsTable)
    .set({ currentBalance: newToBal })
    .where(eq(bankAccountsTable.id, toAccountId));

  res.json({ ok: true, fromBalance: newFromBal, toBalance: newToBal, debit, credit, note, date });
});

// TENANTS
router.get("/rental/tenants", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(tenantsTable.companyId, req.scopedCompanyId!));
  let rows = await db.select().from(tenantsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tenantsTable.createdAt);
  if (status) rows = rows.filter(r => r.status === status);
  if (search) rows = rows.filter(r => r.fullName.toLowerCase().includes(search.toLowerCase()));
  res.json(rows);
});

router.post("/rental/tenants", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { fullName, phone, email, iin, type, status, comment, counterpartyId } = req.body;
  if (!fullName) { res.status(400).json({ error: "fullName required" }); return; }
  const companyId = req.scopedCompanyId!;

  // Создаём/находим контрагента с ролью tenant
  const cpId = await ensureCounterpartyWithRole({
    companyId,
    role: "tenant",
    fullName,
    type: (type as "individual" | "company") || "individual",
    iin,
    phone,
    email,
    existingId: counterpartyId ?? null,
  });

  const [row] = await db.insert(tenantsTable).values({
    companyId, counterpartyId: cpId,
    fullName, phone, email, iin,
    type: type || "individual",
    status: status || "active",
    comment,
  }).returning();
  res.status(201).json(row);
});

router.get("/rental/tenants/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(tenantsTable.id, id)];
  conditions.push(eq(tenantsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.select().from(tenantsTable).where(and(...conditions));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/rental/tenants/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { fullName, phone, email, iin, type, status, comment } = req.body;
  const conditions: SQL[] = [eq(tenantsTable.id, id)];
  conditions.push(eq(tenantsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.update(tenantsTable)
    .set({ fullName, phone, email, iin, type, status, comment })
    .where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/rental/tenants/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(tenantsTable.id, id)];
  conditions.push(eq(tenantsTable.companyId, req.scopedCompanyId!));
  const [snap] = await db.select().from(tenantsTable).where(and(...conditions));
  if (!snap) { res.status(404).json({ error: "Арендатор не найден" }); return; }

  const contractConds: SQL[] = [eq(leaseContractsTable.tenantId, id)];
  contractConds.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const contracts = await db.select().from(leaseContractsTable).where(and(...contractConds));

  if (contracts.some((c) => c.status === "active" || c.status === "draft")) {
    res.status(400).json({
      error: "Нельзя удалить арендатора с активным или черновым договором. Сначала расторгните или удалите договор.",
    });
    return;
  }

  for (const c of contracts) {
    const balance = await contractOutstandingBalance(c.id);
    if (balance > 0.01) {
      res.status(400).json({
        error: `По договору ${c.contractNumber} есть задолженность. Погасите долг или расторгните договор.`,
      });
      return;
    }
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.leaseContractId, c.id))
      .limit(1);
    if (payment) {
      res.status(400).json({
        error: `По договору ${c.contractNumber} есть платежи. Удаление арендатора невозможно — переведите в «Неактивный».`,
      });
      return;
    }
  }

  if (contracts.length > 0) {
    for (const c of contracts) {
      await db.delete(accrualsTable).where(eq(accrualsTable.leaseContractId, c.id));
      await db.delete(leaseContractsTable).where(eq(leaseContractsTable.id, c.id));
    }
  }

  await db.delete(tenantsTable).where(and(...conditions));
  await logOp(req.scopedCompanyId!, req.userId, "tenant", id, "delete",
      `Удалён арендатор: ${snap.fullName}`, snap);
  res.sendStatus(204);
});

// LEASE CONTRACTS
router.get("/rental/contracts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, tenantId, status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  if (propertyId) conditions.push(eq(leaseContractsTable.propertyId, parseInt(propertyId, 10)));
  if (tenantId) conditions.push(eq(leaseContractsTable.tenantId, parseInt(tenantId, 10)));
  if (status) conditions.push(eq(leaseContractsTable.status, status));

  const contracts = await db.select().from(leaseContractsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(leaseContractsTable.createdAt);

  const enriched = await Promise.all(contracts.map(async (c) => {
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, c.tenantId));
    const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, c.propertyId));
    return {
      ...c,
      tenantName: t?.fullName ?? null,
      propertyUnitNumber: p?.unitNumber ?? null,
      propertyProjectName: p?.projectName ?? null,
    };
  }));
  res.json(enriched);
});

router.post("/rental/contracts", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, tenantId, contractNumber, signDate, startDate, endDate, rentAmount, currency, depositAmount, accrualDay, status, comment } = req.body;
  if (!propertyId || !tenantId || !contractNumber || !startDate || !rentAmount || !currency || !status) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db.insert(leaseContractsTable).values({
    companyId: req.scopedCompanyId!, propertyId, tenantId, contractNumber, signDate: signDate || null, startDate, endDate, rentAmount, currency, depositAmount, accrualDay, status, comment
  }).returning();

  await db.update(propertiesTable).set({ rentalStatus: "rented" }).where(eq(propertiesTable.id, propertyId));

  if (status === "active" || status === "draft") {
    const accrualRows = buildAccrualRows({
      companyId: req.scopedCompanyId!,
      leaseContractId: row.id,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      rentAmount: parseFloat(String(rentAmount)),
      currency,
      accrualDay: accrualDay || 1,
    });
    for (const ar of accrualRows) {
      await db.insert(accrualsTable).values(ar);
    }
  }

  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
  res.status(201).json({ ...row, tenantName: t?.fullName ?? null, propertyUnitNumber: p?.unitNumber ?? null });
});

router.get("/rental/contracts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(leaseContractsTable.id, id)];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.select().from(leaseContractsTable).where(and(...conditions));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, row.tenantId));
  const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
  res.json({ ...row, tenantName: t?.fullName ?? null, propertyUnitNumber: p?.unitNumber ?? null });
});

router.patch("/rental/contracts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { signDate, startDate, endDate, rentAmount, currency, depositAmount, accrualDay, status, comment } = req.body;
  const conditions: SQL[] = [eq(leaseContractsTable.id, id)];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.update(leaseContractsTable)
    .set({ signDate: signDate ?? null, startDate, endDate, rentAmount, currency, depositAmount, accrualDay, status, comment })
    .where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  // Обогащаем ответ именами
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, row.tenantId));
  const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
  res.json({ ...row, tenantName: t?.fullName ?? null, propertyUnitNumber: p?.unitNumber ?? null });
});

router.post("/rental/contracts/:id/terminate", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { terminationDate, reason } = req.body as { terminationDate?: string; reason?: string };
  const termDate = terminationDate || new Date().toISOString().split("T")[0];
  const conditions: SQL[] = [eq(leaseContractsTable.id, id)];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));

  const [contract] = await db.select().from(leaseContractsTable).where(and(...conditions));
  if (!contract) { res.status(404).json({ error: "Договор не найден" }); return; }
  if (contract.status === "terminated") {
    res.status(400).json({ error: "Договор уже расторгнут" });
    return;
  }
  if (contract.status === "draft") {
    res.status(400).json({ error: "Черновик можно удалить без расторжения" });
    return;
  }

  const balance = await contractOutstandingBalance(id);
  const noteSuffix = reason ? ` · ${reason}` : "";
  const comment = [contract.comment, `Расторгнут ${termDate}${noteSuffix}`].filter(Boolean).join("\n");

  const [row] = await db.update(leaseContractsTable)
    .set({
      status: "terminated",
      endDate: termDate,
      comment,
    })
    .where(and(...conditions))
    .returning();

  const pendingAccruals = await db.select().from(accrualsTable).where(
    and(
      eq(accrualsTable.leaseContractId, id),
      inArray(accrualsTable.status, ["pending", "overdue", "approved"]),
      gt(accrualsTable.dueDate, termDate),
    ),
  );
  for (const a of pendingAccruals) {
    const paid = parseFloat(a.paidAmount || "0");
    if (paid > 0) continue;
    await db.update(accrualsTable)
      .set({
        status: "cancelled",
        balance: "0",
        notes: [a.notes, `Отменено при расторжении ${termDate}`].filter(Boolean).join(" · "),
      })
      .where(eq(accrualsTable.id, a.id));
  }

  await refreshPropertyRentalStatus(contract.propertyId, req.scopedCompanyId);

  await logOp(req.scopedCompanyId!, req.userId, "lease_contract", id, "update",
      `Расторгнут договор ${contract.contractNumber} от ${termDate}`, row);

  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, row.tenantId));
  const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
  res.json({
    ...row,
    tenantName: t?.fullName ?? null,
    propertyUnitNumber: p?.unitNumber ?? null,
    outstandingBalance: balance,
  });
});

router.delete("/rental/contracts/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(leaseContractsTable.id, id)];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));

  const [contract] = await db.select().from(leaseContractsTable).where(and(...conditions));
  if (!contract) { res.status(404).json({ error: "Договор не найден" }); return; }

  if (contract.status === "active") {
    res.status(400).json({
      error: "Активный договор нельзя удалить. Сначала расторгните его.",
    });
    return;
  }

  const balance = await contractOutstandingBalance(id);
  if (balance > 0.01) {
    res.status(400).json({ error: "Нельзя удалить договор с непогашенной задолженностью" });
    return;
  }

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.leaseContractId, id))
    .limit(1);
  if (payment && contract.status !== "draft") {
    res.status(400).json({
      error: "Договор с историей платежей нельзя удалить. Оставьте статус «Расторгнут».",
    });
    return;
  }

  const [heldDeposit] = await db
    .select()
    .from(depositsTable)
    .where(and(eq(depositsTable.leaseContractId, id), eq(depositsTable.status, "held")))
    .limit(1);
  if (heldDeposit) {
    res.status(400).json({ error: "Сначала закройте депозит по договору" });
    return;
  }

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.leaseContractId, id));
  for (const p of payments) {
    await db.delete(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, p.id));
  }
  await db.delete(paymentsTable).where(eq(paymentsTable.leaseContractId, id));
  await db.delete(accrualsTable).where(eq(accrualsTable.leaseContractId, id));
  await db.delete(depositsTable).where(eq(depositsTable.leaseContractId, id));
  await db.delete(leaseContractsTable).where(and(...conditions));

  await refreshPropertyRentalStatus(contract.propertyId, req.scopedCompanyId);

  await logOp(req.scopedCompanyId!, req.userId, "lease_contract", id, "delete",
      `Удалён договор ${contract.contractNumber}`, contract);
  res.sendStatus(204);
});

// ACCRUALS
router.get("/rental/accruals", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId, status, month } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(accrualsTable.companyId, req.scopedCompanyId!));
  if (leaseContractId) conditions.push(eq(accrualsTable.leaseContractId, parseInt(leaseContractId, 10)));
  if (status) conditions.push(eq(accrualsTable.status, status));

  let rows = await db.select().from(accrualsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(accrualsTable.dueDate);
  if (month) rows = rows.filter(r => r.period === month);
  res.json(rows);
});

router.post("/rental/accruals/recalculate", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId } = req.body;
  if (!leaseContractId) { res.status(400).json({ error: "leaseContractId required" }); return; }

  const conditions: SQL[] = [eq(leaseContractsTable.id, leaseContractId)];
  conditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const [contract] = await db.select().from(leaseContractsTable).where(and(...conditions));
  if (!contract) { res.status(404).json({ error: "Lease contract not found" }); return; }

  // Удаляем только неоплаченные начисления (paid/partial оставляем)
  await db.delete(accrualsTable).where(
    and(
      eq(accrualsTable.leaseContractId, leaseContractId),
      eq(accrualsTable.status, "pending")
    )
  );

  const accrualRows = buildAccrualRows({
    companyId: req.scopedCompanyId!,
    leaseContractId,
    startDate: new Date(contract.startDate),
    endDate: contract.endDate ? new Date(contract.endDate) : null,
    rentAmount: parseFloat(contract.rentAmount),
    currency: contract.currency,
    accrualDay: contract.accrualDay || 1,
  });

  // Фильтруем: не добавляем периоды, которые уже есть (частично/полностью оплачены)
  const existingAccruals = await db.select().from(accrualsTable)
    .where(eq(accrualsTable.leaseContractId, leaseContractId));
  const existingPeriods = new Set(existingAccruals.map(a => a.period));

  const insertedAccruals = [];
  for (const ar of accrualRows) {
    if (existingPeriods.has(ar.period)) continue; // пропускаем уже оплаченные месяцы
    const [accrual] = await db.insert(accrualsTable).values(ar).returning();
    insertedAccruals.push(accrual);
  }

  res.json({ inserted: insertedAccruals.length, accruals: insertedAccruals });
});

router.patch("/rental/accruals/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, notes, discountType, discountAmount, discountReason, gracePeriodDays, dueDate } = req.body;
  const conditions: SQL[] = [eq(accrualsTable.id, id)];
  conditions.push(eq(accrualsTable.companyId, req.scopedCompanyId!));

  const [existing] = await db.select().from(accrualsTable).where(and(...conditions));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (dueDate !== undefined) updates.dueDate = dueDate;

  // Льгота / скидка
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountReason !== undefined) updates.discountReason = discountReason;
  if (gracePeriodDays !== undefined) updates.gracePeriodDays = gracePeriodDays;

  if (discountAmount !== undefined) {
    updates.discountAmount = String(discountAmount);
    // Пересчитываем баланс с учётом скидки
    const baseAmount = parseFloat(existing.amount);
    const discount = parseFloat(String(discountAmount));
    const effectiveAmount = Math.max(0, baseAmount - discount);
    const paid = parseFloat(existing.paidAmount);
    const newBalance = Math.max(0, effectiveAmount - paid);
    updates.balance = String(newBalance);
    if (newBalance <= 0) updates.status = "paid";
    else if (paid > 0) updates.status = "partial";
  }

  const [row] = await db.update(accrualsTable).set(updates as any).where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // Логируем смену статуса
  if (status !== undefined && status !== existing.status) {
    const statusLabels: Record<string, string> = {
      cancelled: "Отменено", approved: "Принято", pending: "Ожидает",
      paid: "Оплачено", partial: "Частично", overdue: "Просрочено",
    };
    await logOp(
      req.scopedCompanyId!, req.userId, "accrual", id, "update",
      `Начисление #${id} (${existing.period}): статус изменён с «${statusLabels[existing.status] ?? existing.status}» на «${statusLabels[status] ?? status}»`,
      existing,
    );
  }

  res.json(row);
});

// POST /rental/accruals/:id/discount — применить льготу к начислению
router.post("/rental/accruals/:id/discount", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { discountType, discountValue, reason, gracePeriodDays } = req.body;

  if (!discountType) { res.status(400).json({ error: "discountType required (percent/fixed/grace)" }); return; }

  const conditions: SQL[] = [eq(accrualsTable.id, id)];
  conditions.push(eq(accrualsTable.companyId, req.scopedCompanyId!));

  const [existing] = await db.select().from(accrualsTable).where(and(...conditions));
  if (!existing) { res.status(404).json({ error: "Начисление не найдено" }); return; }

  const baseAmount = parseFloat(existing.amount);
  const paid = parseFloat(existing.paidAmount);
  let discountAmount = 0;
  let newDueDate = existing.dueDate;

  if (discountType === "percent") {
    discountAmount = (baseAmount * parseFloat(String(discountValue))) / 100;
  } else if (discountType === "fixed") {
    discountAmount = parseFloat(String(discountValue));
  } else if (discountType === "grace") {
    const days = parseInt(String(gracePeriodDays || discountValue || 7), 10);
    const due = new Date(existing.dueDate);
    due.setDate(due.getDate() + days);
    newDueDate = due.toISOString().split("T")[0];
  }

  const effectiveAmount = Math.max(0, baseAmount - discountAmount);
  const newBalance = Math.max(0, effectiveAmount - paid);
  const newStatus = newBalance <= 0 ? "paid" : paid > 0 ? "partial" : "pending";

  const [row] = await db.update(accrualsTable).set({
    discountType,
    discountAmount: discountAmount > 0 ? String(discountAmount) : existing.discountAmount,
    discountReason: reason || existing.discountReason,
    gracePeriodDays: gracePeriodDays ? parseInt(String(gracePeriodDays), 10) : existing.gracePeriodDays,
    dueDate: newDueDate,
    balance: String(newBalance),
    status: newStatus,
  }).where(and(...conditions)).returning();

  res.json(row);
});

// PAYMENTS
router.get("/rental/payments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(paymentsTable.companyId, req.scopedCompanyId!));
  if (leaseContractId) conditions.push(eq(paymentsTable.leaseContractId, parseInt(leaseContractId, 10)));
  const rows = await db.select().from(paymentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(paymentsTable.paymentDate);
  res.json(rows);
});

router.post("/rental/payments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId, amount, currency, paymentDate, paymentMethod, accountId, note, allocations } = req.body;
  if (!leaseContractId || !amount || !currency || !paymentDate) {
    res.status(400).json({ error: "leaseContractId, amount, currency, paymentDate required" });
    return;
  }

  const companyId = req.scopedCompanyId!;
  const parsedAccountId = accountId ? parseInt(String(accountId), 10) : null;
  if (!parsedAccountId) {
    res.status(400).json({ error: "Укажите расчётный счёт" });
    return;
  }
  const ok = await accountExistsInModule(companyId, parsedAccountId, RENTAL_ACCOUNTS);
  if (!ok) {
    res.status(400).json({ error: "Укажите счёт из модуля «Аренда»" });
    return;
  }

  const paymentAmount = parseFloat(amount);

  // Создаём запись платежа
  const [payment] = await db.insert(paymentsTable).values({
    companyId: req.scopedCompanyId!,
    leaseContractId,
    amount: String(paymentAmount),
    currency,
    paymentDate,
    paymentMethod: paymentMethod || null,
    accountId: parsedAccountId,
    note: note || null,
  }).returning();

  let remainingAmount = paymentAmount;
  const createdAllocations = [];

  if (allocations && Array.isArray(allocations) && allocations.length > 0) {
    // Явная аллокация от пользователя
    for (const alloc of allocations) {
      if (remainingAmount <= 0) break;
      const allocAmount = Math.min(parseFloat(String(alloc.amount)), remainingAmount);
      const [accrual] = await db.select().from(accrualsTable).where(eq(accrualsTable.id, alloc.accrualId));
      if (!accrual) continue;

      const [allocation] = await db.insert(paymentAllocationsTable).values({
        companyId: req.scopedCompanyId!,
        paymentId: payment.id,
        accrualId: alloc.accrualId,
        amount: String(allocAmount),
      }).returning();
      createdAllocations.push(allocation);

      const newPaid = parseFloat(accrual.paidAmount) + allocAmount;
      const effectiveAmount = parseFloat(accrual.amount) - parseFloat(accrual.discountAmount ?? "0");
      const newBalance = Math.max(0, effectiveAmount - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "pending";
      await db.update(accrualsTable).set({
        paidAmount: String(newPaid), balance: String(newBalance), status: newStatus,
      }).where(eq(accrualsTable.id, alloc.accrualId));

      remainingAmount -= allocAmount;
    }
  } else {
    // Авто-аллокация: самые старые начисления первыми
    const pendingAccruals = await db.select().from(accrualsTable)
      .where(and(
        eq(accrualsTable.leaseContractId, leaseContractId),
        sql`${accrualsTable.balance} > 0`
      ))
      .orderBy(asc(accrualsTable.dueDate));

    for (const accrual of pendingAccruals) {
      if (remainingAmount <= 0) break;
      const balance = parseFloat(accrual.balance);
      const allocAmount = Math.min(balance, remainingAmount);

      const [allocation] = await db.insert(paymentAllocationsTable).values({
        companyId: req.scopedCompanyId!,
        paymentId: payment.id,
        accrualId: accrual.id,
        amount: String(allocAmount),
      }).returning();
      createdAllocations.push(allocation);

      const newPaid = parseFloat(accrual.paidAmount) + allocAmount;
      const newBalance = Math.max(0, balance - allocAmount);
      const newStatus = newBalance <= 0 ? "paid" : "partial";
      await db.update(accrualsTable).set({
        paidAmount: String(newPaid), balance: String(newBalance), status: newStatus,
      }).where(eq(accrualsTable.id, accrual.id));

      remainingAmount -= allocAmount;
    }
  }

  // Update bank account balance
  {
    const [acc] = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.id, parsedAccountId));
    if (acc) {
      const newBal = (parseFloat(acc.currentBalance || "0") + paymentAmount).toFixed(2);
      await db.update(bankAccountsTable).set({ currentBalance: newBal }).where(eq(bankAccountsTable.id, parsedAccountId));
    }
  }

  await logOp(req.scopedCompanyId!, req.userId, "payment", payment.id, "create",
      `Добавлен платёж ${paymentAmount} ${currency} (договор #${leaseContractId})`, payment);
  res.status(201).json({ ...payment, allocations: createdAllocations, unallocated: remainingAmount });
});

router.delete("/rental/payments/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conds: SQL[] = [eq(paymentsTable.id, id)];
  conds.push(eq(paymentsTable.companyId, req.scopedCompanyId!));
  const [snap] = await db.select().from(paymentsTable).where(and(...conds));
  if (!snap) { res.status(404).json({ error: "Платёж не найден" }); return; }
  // Reverse allocations
  const allocs = await db.select().from(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
  for (const alloc of allocs) {
    const [accrual] = await db.select().from(accrualsTable).where(eq(accrualsTable.id, alloc.accrualId));
    if (accrual) {
      const newPaid = Math.max(0, parseFloat(accrual.paidAmount) - parseFloat(alloc.amount));
      const effectiveAmount = parseFloat(accrual.amount) - parseFloat(accrual.discountAmount ?? "0");
      const newBalance = Math.max(0, effectiveAmount - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "pending";
      await db.update(accrualsTable).set({ paidAmount: String(newPaid), balance: String(newBalance), status: newStatus })
        .where(eq(accrualsTable.id, alloc.accrualId));
    }
  }
  await db.delete(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
  await db.delete(paymentsTable).where(and(...conds));

  // Reverse bank account balance
  if (snap.accountId) {
    const [acc] = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.id, snap.accountId));
    if (acc) {
      const newBal = Math.max(0, parseFloat(acc.currentBalance || "0") - parseFloat(snap.amount)).toFixed(2);
      await db.update(bankAccountsTable).set({ currentBalance: newBal }).where(eq(bankAccountsTable.id, snap.accountId));
    }
  }

  await logOp(req.scopedCompanyId!, req.userId, "payment", id, "delete",
      `Удалён платёж ${snap.amount} ${snap.currency} от ${snap.paymentDate}`, snap);
  res.sendStatus(204);
});

// DEPOSITS
router.get("/rental/deposits", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId, status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(depositsTable.companyId, req.scopedCompanyId!));
  if (leaseContractId) conditions.push(eq(depositsTable.leaseContractId, parseInt(leaseContractId, 10)));
  if (status) conditions.push(eq(depositsTable.status, status));
  const rows = await db.select().from(depositsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(depositsTable.createdAt);
  res.json(rows);
});

router.post("/rental/deposits", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { leaseContractId, amount, currency, receivedDate, accountId, note } = req.body;
  if (!leaseContractId || !amount || !currency || !receivedDate) {
    res.status(400).json({ error: "leaseContractId, amount, currency, receivedDate required" });
    return;
  }
  if (!accountId) {
    res.status(400).json({ error: "Укажите расчётный счёт" });
    return;
  }
  const parsedAccountId = parseInt(String(accountId), 10);
  const companyId = req.scopedCompanyId!;
  const ok = await accountExistsInModule(companyId, parsedAccountId, RENTAL_ACCOUNTS);
  if (!ok) {
    res.status(400).json({ error: "Укажите счёт из модуля «Аренда»" });
    return;
  }
  const [row] = await db.insert(depositsTable).values({
    companyId: req.scopedCompanyId!, leaseContractId, amount, currency, status: "held", receivedDate,
    accountId: parsedAccountId, note,
  }).returning();
  res.status(201).json(row);
});

router.patch("/rental/deposits/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, returnedAmount, returnedDate, note } = req.body;
  const conditions: SQL[] = [eq(depositsTable.id, id)];
  conditions.push(eq(depositsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.update(depositsTable)
    .set({ status, returnedAmount, returnedDate, note })
    .where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// EXPENSES
router.get("/rental/expenses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, category } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(expensesTable.companyId, req.scopedCompanyId!));
  if (propertyId) conditions.push(eq(expensesTable.propertyId, parseInt(propertyId, 10)));
  if (category) conditions.push(eq(expensesTable.category, category));
  const rows = await db.select().from(expensesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(expensesTable.expenseDate);
  res.json(rows);
});

router.post("/rental/expenses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, leaseContractId, category, amount, currency, expenseDate, accountId, description } = req.body;
  if (!propertyId || !category || !amount || !currency || !expenseDate) {
    res.status(400).json({ error: "propertyId, category, amount, currency, expenseDate required" });
    return;
  }
  if (!accountId) {
    res.status(400).json({ error: "Укажите расчётный счёт" });
    return;
  }
  const parsedAccountId = parseInt(String(accountId), 10);
  const companyId = req.scopedCompanyId!;
  const ok = await accountExistsInModule(companyId, parsedAccountId, RENTAL_ACCOUNTS);
  if (!ok) {
    res.status(400).json({ error: "Укажите счёт из модуля «Аренда»" });
    return;
  }
  const [row] = await db.insert(expensesTable).values({
    companyId: req.scopedCompanyId!, propertyId, leaseContractId, category, amount, currency, expenseDate,
    accountId: parsedAccountId, description,
  }).returning();
  res.status(201).json(row);
});

router.patch("/rental/expenses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { propertyId, leaseContractId, category, amount, currency, expenseDate, accountId, description } = req.body;
  const conditions: SQL[] = [eq(expensesTable.id, id)];
  conditions.push(eq(expensesTable.companyId, req.scopedCompanyId!));
  if (accountId !== undefined && !accountId) {
    res.status(400).json({ error: "Укажите расчётный счёт" });
    return;
  }
  if (accountId != null && req.scopedCompanyId!) {
    const parsedAccountId = parseInt(String(accountId), 10);
    const ok = await accountExistsInModule(req.scopedCompanyId!, parsedAccountId, RENTAL_ACCOUNTS);
    if (!ok) {
      res.status(400).json({ error: "Укажите счёт из модуля «Аренда»" });
      return;
    }
  }
  const [row] = await db.update(expensesTable)
    .set({
      ...(propertyId != null ? { propertyId: parseInt(String(propertyId), 10) } : {}),
      ...(leaseContractId !== undefined ? { leaseContractId: leaseContractId ? parseInt(String(leaseContractId), 10) : null } : {}),
      ...(category != null ? { category: String(category) } : {}),
      ...(amount != null ? { amount: String(amount) } : {}),
      ...(currency != null ? { currency: String(currency) } : {}),
      ...(expenseDate != null ? { expenseDate: String(expenseDate) } : {}),
      ...(accountId !== undefined ? { accountId: parseInt(String(accountId), 10) } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    })
    .where(and(...conditions))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/rental/expenses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(expensesTable.id, id)];
  conditions.push(eq(expensesTable.companyId, req.scopedCompanyId!));
  const [row] = await db.delete(expensesTable).where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// RENTAL PROPERTIES
router.post("/rental/properties", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectName, unitNumber, type, area, block, floor, comment } = req.body;
  if (!projectName || !unitNumber) {
    res.status(400).json({ error: "Укажите проект и номер объекта" });
    return;
  }
  const [row] = await db.insert(propertiesTable).values({
    companyId: req.scopedCompanyId!,
    projectName: String(projectName).trim(),
    unitNumber: String(unitNumber).trim(),
    type: type || "apartment",
    area: area != null && area !== "" ? String(area) : null,
    block: block ? String(block).trim() : null,
    floor: floor != null && floor !== "" ? parseInt(String(floor), 10) : null,
    status: "on_lease",
    rentalStatus: "free",
    comment: comment ? String(comment).trim() : null,
  }).returning();
  res.status(201).json({
    id: row.id,
    propertyId: row.id,
    unitNumber: row.unitNumber,
    projectName: row.projectName,
    type: row.type,
    area: row.area ? parseFloat(row.area) : null,
    rentalStatus: row.rentalStatus || "free",
    currentTenantName: null,
    currentRentAmount: null,
    currency: null,
    leaseEndDate: null,
    totalBalance: 0,
    isActive: true,
    createdAt: row.createdAt.toISOString(),
  });
});

router.patch("/rental/properties/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const conditions: SQL[] = [eq(propertiesTable.id, id)];
  conditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));

  const body = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (body.projectName != null) patch.projectName = String(body.projectName).trim();
  if (body.unitNumber != null) patch.unitNumber = String(body.unitNumber).trim();
  if (body.type != null) patch.type = String(body.type);
  if (body.area !== undefined) {
    patch.area = body.area != null && body.area !== "" ? String(body.area) : null;
  }
  if (body.block !== undefined) {
    patch.block = body.block ? String(body.block).trim() : null;
  }
  if (body.floor !== undefined) {
    patch.floor =
      body.floor != null && body.floor !== ""
        ? parseInt(String(body.floor), 10)
        : null;
  }
  if (body.comment !== undefined) {
    patch.comment = body.comment ? String(body.comment).trim() : null;
  }
  if (body.rentalStatus != null) patch.rentalStatus = String(body.rentalStatus);
  if (body.marketValue !== undefined) {
    patch.marketValue = body.marketValue != null && body.marketValue !== "" ? String(body.marketValue) : null;
  }

  const [row] = await db
    .update(propertiesTable)
    .set(patch)
    .where(and(...conditions))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Объект не найден" });
    return;
  }
  res.json(row);
});

router.delete("/rental/properties/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const conditions: SQL[] = [eq(propertiesTable.id, id)];
  conditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));

  const [prop] = await db.select().from(propertiesTable).where(and(...conditions));
  if (!prop) {
    res.status(404).json({ error: "Объект не найден" });
    return;
  }

  const contractConds: SQL[] = [eq(leaseContractsTable.propertyId, id)];
  contractConds.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const contracts = await db.select().from(leaseContractsTable).where(and(...contractConds));

  if (contracts.some((c) => c.status === "active" || c.status === "draft")) {
    res.status(400).json({
      error: "Нельзя удалить объект с активным или черновым договором. Сначала расторгните или удалите договор.",
    });
    return;
  }

  for (const c of contracts) {
    const balance = await contractOutstandingBalance(c.id);
    if (balance > 0.01) {
      res.status(400).json({ error: "По объекту есть непогашенная задолженность" });
      return;
    }
  }

  const [investment] = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.propertyId, id))
    .limit(1);
  if (investment) {
    res.status(400).json({
      error: "Сначала удалите доли владельцев объекта на вкладке «Владельцы»",
    });
    return;
  }

  if (contracts.length > 0) {
    for (const c of contracts) {
      await db.delete(accrualsTable).where(eq(accrualsTable.leaseContractId, c.id));
      await db.delete(leaseContractsTable).where(eq(leaseContractsTable.id, c.id));
    }
  }

  await db.delete(expensesTable).where(eq(expensesTable.propertyId, id));
  await db.delete(propertiesTable).where(and(...conditions));

  await logOp(req.scopedCompanyId!, req.userId, "property", id, "delete",
      `Удалён объект ${prop.projectName} ${prop.unitNumber}`, prop);
  res.sendStatus(204);
});

router.get("/rental/properties", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { rentalStatus } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));
  let props = await db.select().from(propertiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(propertiesTable.createdAt);
  if (rentalStatus) props = props.filter(p => p.rentalStatus === rentalStatus);

  const enriched = await Promise.all(props.map(async (p) => {
    const activeConditions: SQL[] = [eq(leaseContractsTable.propertyId, p.id), eq(leaseContractsTable.status, "active")];
    const [activeContract] = await db.select().from(leaseContractsTable).where(and(...activeConditions));

    let currentTenantName = null;
    let currentRentAmount = null;
    let currency = null;
    let leaseEndDate = null;

    if (activeContract) {
      const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, activeContract.tenantId));
      currentTenantName = t?.fullName ?? null;
      currentRentAmount = parseFloat(activeContract.rentAmount);
      currency = activeContract.currency;
      leaseEndDate = activeContract.endDate;
    }

    const accruals = await db.select().from(accrualsTable).where(
      eq(accrualsTable.leaseContractId, activeContract?.id ?? -1)
    );
    const totalBalance = accruals.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    return {
      id: p.id, propertyId: p.id, unitNumber: p.unitNumber, projectName: p.projectName,
      type: p.type, area: p.area ? parseFloat(p.area) : null, rentalStatus: p.rentalStatus || "free",
      currentTenantName, currentRentAmount, currency, leaseEndDate,
      totalBalance, isActive: true, createdAt: p.createdAt.toISOString(),
    };
  }));
  res.json(enriched);
});

router.post("/rental/properties/:id/activate", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(propertiesTable.id, id)];
  conditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));
  const [prop] = await db.update(propertiesTable)
    .set({ rentalStatus: "free", status: "on_lease" })
    .where(and(...conditions)).returning();
  if (!prop) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: prop.id, propertyId: prop.id, unitNumber: prop.unitNumber, projectName: prop.projectName,
    type: prop.type, area: prop.area ? parseFloat(prop.area) : null, rentalStatus: prop.rentalStatus || "free",
    currentTenantName: null, currentRentAmount: null, currency: null, leaseEndDate: null,
    totalBalance: 0, isActive: true, createdAt: prop.createdAt.toISOString(),
  });
});

router.get("/rental/properties/:id/performance", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(propertiesTable.id, id)];
  conditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));
  const [prop] = await db.select().from(propertiesTable).where(and(...conditions));
  if (!prop) { res.status(404).json({ error: "Not found" }); return; }

  const contractConditions: SQL[] = [eq(leaseContractsTable.propertyId, id)];
  contractConditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const contracts = await db.select().from(leaseContractsTable).where(and(...contractConditions));
  const contractIds = contracts.map(c => c.id);

  let totalRentCharged = 0, totalRentReceived = 0, occupancyMonths = 0;
  for (const cid of contractIds) {
    const accruals = await db.select().from(accrualsTable).where(eq(accrualsTable.leaseContractId, cid));
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.leaseContractId, cid));
    totalRentCharged += accruals.reduce((s, a) => s + parseFloat(a.amount), 0);
    totalRentReceived += payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    occupancyMonths += accruals.length;
  }

  const expenseConditions: SQL[] = [eq(expensesTable.propertyId, id)];
  expenseConditions.push(eq(expensesTable.companyId, req.scopedCompanyId!));
  const expensesList = await db.select().from(expensesTable).where(and(...expenseConditions));
  const totalExpenses = expensesList.reduce((s, e) => s + parseFloat(e.amount), 0);
  const netIncome = totalRentReceived - totalExpenses;
  const outstandingBalance = totalRentCharged - totalRentReceived;

  res.json({
    propertyId: id, unitNumber: prop.unitNumber,
    totalRentCharged, totalRentReceived, totalExpenses, netIncome, outstandingBalance,
    currency: "KGS", occupancyMonths, vacancyMonths: 0,
  });
});

// OWNER STATEMENTS
router.get("/rental/statements", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, month } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(ownerStatementsTable.companyId, req.scopedCompanyId!));
  if (propertyId) conditions.push(eq(ownerStatementsTable.propertyId, parseInt(propertyId, 10)));
  if (month) conditions.push(eq(ownerStatementsTable.period, month));
  const rows = await db.select().from(ownerStatementsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(ownerStatementsTable.generatedAt);

  const enriched = await Promise.all(rows.map(async (s) => {
    const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, s.propertyId));
    return { ...s, unitNumber: p?.unitNumber ?? "" };
  }));
  res.json(enriched);
});

router.post("/rental/statements/generate", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, period } = req.body;
  if (!propertyId || !period) {
    res.status(400).json({ error: "propertyId and period required" });
    return;
  }

  const propConditions: SQL[] = [eq(propertiesTable.id, propertyId)];
  propConditions.push(eq(propertiesTable.companyId, req.scopedCompanyId!));
  const [prop] = await db.select().from(propertiesTable).where(and(...propConditions));
  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const contractConditions: SQL[] = [eq(leaseContractsTable.propertyId, propertyId)];
  contractConditions.push(eq(leaseContractsTable.companyId, req.scopedCompanyId!));
  const contracts = await db.select().from(leaseContractsTable).where(and(...contractConditions));

  let rentCharged = 0, rentReceived = 0;
  let currency = "KGS";

  for (const c of contracts) {
    const accruals = await db.select().from(accrualsTable).where(
      and(eq(accrualsTable.leaseContractId, c.id), eq(accrualsTable.period, period))
    );
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.leaseContractId, c.id));
    rentCharged += accruals.reduce((s, a) => s + parseFloat(a.amount), 0);
    rentReceived += payments.filter(p => p.paymentDate.startsWith(period)).reduce((s, p) => s + parseFloat(p.amount), 0);
    currency = c.currency;
  }

  const expenseConditions: SQL[] = [eq(expensesTable.propertyId, propertyId)];
  expenseConditions.push(eq(expensesTable.companyId, req.scopedCompanyId!));
  const expensesList = await db.select().from(expensesTable).where(and(...expenseConditions));
  const periodExpenses = expensesList.filter(e => e.expenseDate.startsWith(period));
  const expenses = periodExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const netIncome = rentReceived - expenses;

  const [stmt] = await db.insert(ownerStatementsTable).values({
    companyId: req.scopedCompanyId!,
    propertyId, period,
    rentCharged: String(rentCharged),
    rentReceived: String(rentReceived),
    expenses: String(expenses),
    netIncome: String(netIncome),
    currency,
  }).returning();

  res.json({ ...stmt, unitNumber: prop.unitNumber });
});

export default router;
