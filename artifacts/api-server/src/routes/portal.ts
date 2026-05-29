import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  db, usersTable, investorsTable, investmentsTable, distributionsTable,
  propertiesTable, tenantsTable, leaseContractsTable, paymentsTable, accrualsTable,
  constructionContractorsTable, constructionExpensesTable,
  warehouseSuppliersTable, warehouseIncomingTable, warehouseItemsTable,
  warehouseSupplierPaymentsTable,
  counterpartiesTable, constructionSalesContractsTable, constructionAccrualsTable,
  constructionOperationsTable, constructionUnitsTable, constructionProjectsTable,
  companiesTable,
} from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { hashPassword, validatePassword } from "../lib/security";
import { sendPortalAccessEmail } from "../lib/email";
import { createPortalUser } from "../lib/portal-account";
import { parseContractDocumentMeta, summarizeContractDocument } from "../lib/contract-document";
import { buildBuyerReconciliation, buildSupplierReconciliation } from "../lib/portal-reconciliation";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// POST /portal/create-investor-account — phone-first
router.post("/portal/create-investor-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { investorId, phone, email, firstName, lastName } = req.body;
  if (!investorId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "investorId, телефон, имя, фамилия обязательны" }); return;
  }

  const [investor] = await db.select().from(investorsTable)
    .where(and(eq(investorsTable.id, investorId), eq(investorsTable.companyId, req.scopedCompanyId!)));
  if (!investor) { res.status(404).json({ error: "Инвестор не найден" }); return; }

  let user: typeof usersTable.$inferSelect;
  let created: boolean;
  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "investor",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedInvestorId",
      linkedEntityId: investorId,
    });
    user = result.user;
    created = result.created;
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
    return;
  }

  const { passwordHash: _ph, ...safeUser } = user;
  res.status(created ? 201 : 200).json({ user: safeUser, created });
});

// POST /portal/create-tenant-account — phone-first
router.post("/portal/create-tenant-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { tenantId, phone, email, firstName, lastName } = req.body;
  if (!tenantId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "tenantId, телефон, имя, фамилия обязательны" }); return;
  }

  const [tenant] = await db.select().from(tenantsTable)
    .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.companyId, req.scopedCompanyId!)));
  if (!tenant) { res.status(404).json({ error: "Арендатор не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "tenant",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedTenantId",
      linkedEntityId: tenantId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// POST /portal/create-contractor-account — phone-first
router.post("/portal/create-contractor-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { contractorId, phone, email, firstName, lastName } = req.body;
  if (!contractorId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "contractorId, телефон, имя, фамилия обязательны" }); return;
  }

  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(eq(constructionContractorsTable.id, contractorId), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)));
  if (!contractor) { res.status(404).json({ error: "Подрядчик не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "contractor",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedContractorId",
      linkedEntityId: contractorId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/investor/me — данные для портала инвестора (только свои)
router.get("/portal/investor/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "investor" || !me.linkedInvestorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [investor] = await db.select().from(investorsTable).where(eq(investorsTable.id, me.linkedInvestorId));

  const investments = await db.select({
    id: investmentsTable.id,
    propertyId: investmentsTable.propertyId,
    sharePercent: investmentsTable.sharePercent,
    capitalInvested: investmentsTable.capitalInvested,
    currency: investmentsTable.currency,
    investedAt: investmentsTable.investedAt,
    createdAt: investmentsTable.createdAt,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
  })
    .from(investmentsTable)
    .leftJoin(propertiesTable, eq(investmentsTable.propertyId, propertiesTable.id))
    .where(eq(investmentsTable.investorId, me.linkedInvestorId!));

  const investedPropertyIds = investments.map(inv => inv.propertyId).filter((id): id is number => id !== null);
  const distributions = investedPropertyIds.length > 0
    ? await db.select().from(distributionsTable)
        .where(inArray(distributionsTable.propertyId, investedPropertyIds))
    : [];

  res.json({ investor, investments, distributions });
});

// GET /portal/tenant/me — данные для портала арендатора (только свои)
router.get("/portal/tenant/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "tenant" || !me.linkedTenantId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, me.linkedTenantId));

  const contracts = await db.select({
    id: leaseContractsTable.id,
    propertyId: leaseContractsTable.propertyId,
    startDate: leaseContractsTable.startDate,
    endDate: leaseContractsTable.endDate,
    rentAmount: leaseContractsTable.rentAmount,
    status: leaseContractsTable.status,
    contractNumber: leaseContractsTable.contractNumber,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
  })
    .from(leaseContractsTable)
    .leftJoin(propertiesTable, eq(leaseContractsTable.propertyId, propertiesTable.id))
    .where(eq(leaseContractsTable.tenantId, me.linkedTenantId!));

  const contractIds = contracts.map(c => c.id);
  const payments: any[] = contractIds.length > 0
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.leaseContractId, contractIds[0]))
    : [];

  const accruals: any[] = contractIds.length > 0
    ? await db.select().from(accrualsTable).where(eq(accrualsTable.leaseContractId, contractIds[0]))
    : [];

  res.json({ tenant, contracts, payments, accruals });
});

// GET /portal/contractor/me — портал подрядчика
router.get("/portal/contractor/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "contractor" || !me.linkedContractorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(
      eq(constructionContractorsTable.id, me.linkedContractorId),
      eq(constructionContractorsTable.companyId, req.scopedCompanyId!),
    ));
  if (!contractor) {
    res.status(404).json({ error: "Подрядчик не найден" }); return;
  }

  const payments = await db.select({
    id: constructionExpensesTable.id,
    date: constructionExpensesTable.date,
    description: constructionExpensesTable.description,
    amount: constructionExpensesTable.amount,
    currency: constructionExpensesTable.currency,
    status: constructionExpensesTable.status,
    projectId: constructionExpensesTable.projectId,
  })
    .from(constructionExpensesTable)
    .where(and(
      eq(constructionExpensesTable.contractorId, me.linkedContractorId),
      eq(constructionExpensesTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(constructionExpensesTable.date));

  const contractAmount = parseFloat(String(contractor.contractAmount ?? 0));
  const paidAmount = parseFloat(String(contractor.paidAmount ?? 0));
  const outstanding = contractAmount - paidAmount;

  const paidExpenses = payments
    .filter((p) => p.status === "paid" || p.status === "approved")
    .slice()
    .reverse();

  let balance = contractAmount;
  const reconciliationLines = paidExpenses.map((p) => {
    const amt = parseFloat(String(p.amount ?? 0));
    balance -= amt;
    return {
      date: p.date,
      description: p.description,
      amount: amt,
      currency: p.currency,
      balanceAfter: balance,
    };
  });

  const { contractDocumentMeta, ...contractorSafe } = contractor;

  res.json({
    contractor: {
      ...contractorSafe,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    },
    summary: {
      contractNumber: contractor.contractNumber,
      contractAmount,
      paidAmount,
      outstanding,
      currency: contractor.currency ?? "KGS",
      status: contractor.status,
    },
    payments,
    reconciliation: {
      contractAmount,
      paidAmount,
      outstanding,
      lines: reconciliationLines,
    },
  });
});

// GET /portal/contractor/contract-document — скачать договор
router.get("/portal/contractor/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "contractor" || !me.linkedContractorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(
      eq(constructionContractorsTable.id, me.linkedContractorId),
      eq(constructionContractorsTable.companyId, req.scopedCompanyId!),
    ));
  if (!contractor) {
    res.status(404).json({ error: "Подрядчик не найден" }); return;
  }

  const doc = parseContractDocumentMeta(contractor.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

// POST /portal/create-supplier-account — phone-first
router.post("/portal/create-supplier-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { supplierId, phone, email, firstName, lastName } = req.body;
  if (!supplierId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "supplierId, телефон, имя, фамилия обязательны" }); return;
  }

  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(eq(warehouseSuppliersTable.id, supplierId), eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)));
  if (!supplier) { res.status(404).json({ error: "Поставщик не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "supplier",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedSupplierId",
      linkedEntityId: supplierId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/supplier/me — портал поставщика
router.get("/portal/supplier/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "supplier" || !me.linkedSupplierId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(
      eq(warehouseSuppliersTable.id, me.linkedSupplierId),
      eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!),
    ));
  if (!supplier) {
    res.status(404).json({ error: "Поставщик не найден" }); return;
  }

  const deliveries = await db.select({
    id: warehouseIncomingTable.id,
    documentDate: warehouseIncomingTable.documentDate,
    documentNumber: warehouseIncomingTable.documentNumber,
    itemName: warehouseItemsTable.name,
    quantity: warehouseIncomingTable.quantity,
    totalAmount: warehouseIncomingTable.totalAmount,
    currency: warehouseIncomingTable.currency,
    notes: warehouseIncomingTable.notes,
  })
    .from(warehouseIncomingTable)
    .leftJoin(warehouseItemsTable, eq(warehouseIncomingTable.itemId, warehouseItemsTable.id))
    .where(and(
      eq(warehouseIncomingTable.supplierId, me.linkedSupplierId),
      eq(warehouseIncomingTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(warehouseIncomingTable.documentDate));

  const contractAmount = parseFloat(String(supplier.contractAmount ?? 0));
  const paidAmount = parseFloat(String(supplier.paidAmount ?? 0));
  const outstanding = contractAmount - paidAmount;
  const totalSupplied = deliveries.reduce(
    (sum, d) => sum + parseFloat(String(d.totalAmount ?? 0)),
    0,
  );

  const supplierPayments = await db.select({
    date: warehouseSupplierPaymentsTable.date,
    amount: warehouseSupplierPaymentsTable.amount,
    currency: warehouseSupplierPaymentsTable.currency,
    description: warehouseSupplierPaymentsTable.description,
  })
    .from(warehouseSupplierPaymentsTable)
    .where(and(
      eq(warehouseSupplierPaymentsTable.supplierId, me.linkedSupplierId),
      eq(warehouseSupplierPaymentsTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(warehouseSupplierPaymentsTable.date));

  const reconciliation = buildSupplierReconciliation({
    deliveries,
    payments: supplierPayments,
    contractAmount,
    paidAmount,
    currency: supplier.currency ?? "KGS",
  });

  const { contractDocumentMeta, ...supplierSafe } = supplier;

  res.json({
    supplier: {
      ...supplierSafe,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    },
    summary: {
      contractNumber: supplier.contractNumber,
      contractAmount,
      paidAmount,
      outstanding,
      totalSupplied,
      currency: supplier.currency ?? "KGS",
      isActive: supplier.isActive,
    },
    deliveries,
    payments: supplierPayments,
    reconciliation,
  });
});

// GET /portal/supplier/contract-document
router.get("/portal/supplier/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "supplier" || !me.linkedSupplierId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(
      eq(warehouseSuppliersTable.id, me.linkedSupplierId),
      eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!),
    ));
  if (!supplier) {
    res.status(404).json({ error: "Поставщик не найден" }); return;
  }

  const doc = parseContractDocumentMeta(supplier.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

// POST /portal/create-buyer-account — phone-first (OTP логин)
router.post("/portal/create-buyer-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { buyerId: buyerIdRaw, contractId, buyerName, email, firstName, lastName, phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Телефон обязателен" }); return;
  }
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Имя и фамилия обязательны" }); return;
  }

  const companyId = req.scopedCompanyId!;
  let buyerId: number | null = buyerIdRaw ? Number(buyerIdRaw) : null;

  // Если buyerId не передан — найдём/создадим контрагента-покупателя
  if (!buyerId) {
    if (contractId) {
      const [contract] = await db.select().from(constructionSalesContractsTable)
        .where(and(
          eq(constructionSalesContractsTable.id, Number(contractId)),
          eq(constructionSalesContractsTable.companyId, companyId),
        ));
      if (contract?.buyerId) buyerId = contract.buyerId;

      if (!buyerId && contract) {
        const name = buyerName || contract.buyerName || `${firstName} ${lastName}`;
        const [created] = await db.insert(counterpartiesTable).values({
          companyId,
          category: "buyer",
          categories: ["buyer"],
          fullName: name,
          phone: phone || contract.buyerPhone || null,
        } as any).returning();
        buyerId = created.id;
        await db.update(constructionSalesContractsTable)
          .set({ buyerId })
          .where(eq(constructionSalesContractsTable.id, contract.id));
      }
    }

    if (!buyerId && buyerName) {
      const [created] = await db.insert(counterpartiesTable).values({
        companyId,
        category: "buyer",
        categories: ["buyer"],
        fullName: buyerName,
        phone: phone || null,
      } as any).returning();
      buyerId = created.id;
    }
  }

  if (!buyerId) {
    res.status(400).json({ error: "Не указан покупатель (buyerId, contractId или buyerName)" });
    return;
  }

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(
      eq(counterpartiesTable.id, buyerId),
      eq(counterpartiesTable.companyId, companyId),
    ));
  if (!buyer) { res.status(404).json({ error: "Покупатель не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId,
      role: "buyer",
      firstName,
      lastName,
      phone,
      email: email || null,
      linkedEntityKey: "linkedBuyerId",
      linkedEntityId: buyerId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    const origin = (req.headers.origin as string) || "https://proptech-sigma-eight.vercel.app";
    res.status(result.created ? 201 : 200).json({
      user: safeUser,
      loginUrl: `${origin}/portal-login`,
      created: result.created,
    });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/buyer/me — портал покупателя
router.get("/portal/buyer/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "buyer" || !me.linkedBuyerId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(
      eq(counterpartiesTable.id, me.linkedBuyerId),
      eq(counterpartiesTable.companyId, req.scopedCompanyId!),
    ));
  if (!buyer) {
    res.status(404).json({ error: "Покупатель не найден" }); return;
  }

  const contracts = await db.select({
    id: constructionSalesContractsTable.id,
    contractNumber: constructionSalesContractsTable.contractNumber,
    status: constructionSalesContractsTable.status,
    totalAmount: constructionSalesContractsTable.totalAmount,
    downPayment: constructionSalesContractsTable.downPayment,
    paidAmount: constructionSalesContractsTable.paidAmount,
    remainingAmount: constructionSalesContractsTable.remainingAmount,
    currency: constructionSalesContractsTable.currency,
    contractDate: constructionSalesContractsTable.contractDate,
    signedAt: constructionSalesContractsTable.signedAt,
    handoverDate: constructionSalesContractsTable.handoverDate,
    unitId: constructionSalesContractsTable.unitId,
    projectId: constructionSalesContractsTable.projectId,
    contractDocumentMeta: constructionSalesContractsTable.contractDocumentMeta,
    projectName: constructionProjectsTable.name,
    unitNumber: constructionUnitsTable.unitNumber,
  })
    .from(constructionSalesContractsTable)
    .leftJoin(constructionProjectsTable, eq(constructionSalesContractsTable.projectId, constructionProjectsTable.id))
    .leftJoin(constructionUnitsTable, eq(constructionSalesContractsTable.unitId, constructionUnitsTable.id))
    .where(and(
      eq(constructionSalesContractsTable.buyerId, me.linkedBuyerId),
      eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(constructionSalesContractsTable.createdAt));

  const contractIds = contracts.map((c) => c.id);
  const accruals = contractIds.length > 0
    ? await db.select().from(constructionAccrualsTable)
        .where(and(
          eq(constructionAccrualsTable.companyId, req.scopedCompanyId!),
          inArray(constructionAccrualsTable.contractId, contractIds),
        ))
        .orderBy(constructionAccrualsTable.dueDate)
    : [];

  const payments = contractIds.length > 0
    ? await db.select({
        id: constructionOperationsTable.id,
        date: constructionOperationsTable.date,
        description: constructionOperationsTable.description,
        amount: constructionOperationsTable.amount,
        currency: constructionOperationsTable.currency,
        paymentMethod: constructionOperationsTable.paymentMethod,
        contractId: constructionOperationsTable.contractId,
      })
        .from(constructionOperationsTable)
        .where(and(
          eq(constructionOperationsTable.companyId, req.scopedCompanyId!),
          eq(constructionOperationsTable.type, "income"),
          inArray(constructionOperationsTable.contractId, contractIds),
        ))
        .orderBy(desc(constructionOperationsTable.date))
    : [];

  const totalCharged = accruals.reduce(
    (s, a) => s + parseFloat(String(a.amount ?? 0)),
    0,
  );
  const totalPaid = payments.reduce(
    (s, p) => s + parseFloat(String(p.amount ?? 0)),
    0,
  );
  const contractAmount = contracts.reduce(
    (s, c) => s + parseFloat(String(c.totalAmount ?? 0)),
    0,
  );
  const currency = contracts[0]?.currency ?? "KGS";

  const reconciliation = buildBuyerReconciliation({
    accruals,
    payments,
    contractAmount,
    totalCharged,
    totalPaid,
    currency,
  });

  res.json({
    buyer,
    contracts: contracts.map(({ contractDocumentMeta, ...c }) => ({
      ...c,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    })),
    accruals,
    payments,
    summary: {
      contractAmount,
      totalCharged,
      totalPaid,
      outstanding: totalCharged - totalPaid,
      currency,
      activeContracts: contracts.filter((c) => c.status === "signed" || c.status === "review").length,
    },
    reconciliation,
  });
});

// GET /portal/buyer/preview/:buyerId — предпросмотр портала покупателя для админа
router.get("/portal/buyer/preview/:buyerId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const buyerId = parseInt(req.params.buyerId as string, 10);
  if (!buyerId) { res.status(400).json({ error: "buyerId обязателен" }); return; }
  const companyId = req.scopedCompanyId!;

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, buyerId), eq(counterpartiesTable.companyId, companyId)));
  if (!buyer) { res.status(404).json({ error: "Покупатель не найден" }); return; }

  const contracts = await db.select({
    id: constructionSalesContractsTable.id,
    contractNumber: constructionSalesContractsTable.contractNumber,
    status: constructionSalesContractsTable.status,
    totalAmount: constructionSalesContractsTable.totalAmount,
    downPayment: constructionSalesContractsTable.downPayment,
    paidAmount: constructionSalesContractsTable.paidAmount,
    remainingAmount: constructionSalesContractsTable.remainingAmount,
    currency: constructionSalesContractsTable.currency,
    contractDate: constructionSalesContractsTable.contractDate,
    signedAt: constructionSalesContractsTable.signedAt,
    handoverDate: constructionSalesContractsTable.handoverDate,
    unitId: constructionSalesContractsTable.unitId,
    projectId: constructionSalesContractsTable.projectId,
    contractDocumentMeta: constructionSalesContractsTable.contractDocumentMeta,
    projectName: constructionProjectsTable.name,
    unitNumber: constructionUnitsTable.unitNumber,
  })
    .from(constructionSalesContractsTable)
    .leftJoin(constructionProjectsTable, eq(constructionSalesContractsTable.projectId, constructionProjectsTable.id))
    .leftJoin(constructionUnitsTable, eq(constructionSalesContractsTable.unitId, constructionUnitsTable.id))
    .where(and(
      eq(constructionSalesContractsTable.buyerId, buyerId),
      eq(constructionSalesContractsTable.companyId, companyId),
    ))
    .orderBy(desc(constructionSalesContractsTable.createdAt));

  const contractIds = contracts.map((c) => c.id);
  const accruals = contractIds.length > 0
    ? await db.select().from(constructionAccrualsTable)
        .where(and(
          eq(constructionAccrualsTable.companyId, companyId),
          inArray(constructionAccrualsTable.contractId, contractIds),
        ))
        .orderBy(constructionAccrualsTable.dueDate)
    : [];

  const payments = contractIds.length > 0
    ? await db.select({
        id: constructionOperationsTable.id,
        date: constructionOperationsTable.date,
        description: constructionOperationsTable.description,
        amount: constructionOperationsTable.amount,
        currency: constructionOperationsTable.currency,
        paymentMethod: constructionOperationsTable.paymentMethod,
        contractId: constructionOperationsTable.contractId,
      })
        .from(constructionOperationsTable)
        .where(and(
          eq(constructionOperationsTable.companyId, companyId),
          eq(constructionOperationsTable.type, "income"),
          inArray(constructionOperationsTable.contractId, contractIds),
        ))
        .orderBy(desc(constructionOperationsTable.date))
    : [];

  const totalCharged = accruals.reduce((s, a) => s + parseFloat(String(a.amount ?? 0)), 0);
  const totalPaid = payments.reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0);
  const contractAmount = contracts.reduce((s, c) => s + parseFloat(String(c.totalAmount ?? 0)), 0);
  const currency = contracts[0]?.currency ?? "KGS";

  const reconciliation = buildBuyerReconciliation({
    accruals, payments, contractAmount, totalCharged, totalPaid, currency,
  });

  res.json({
    buyer,
    contracts: contracts.map(({ contractDocumentMeta, ...c }) => ({
      ...c,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    })),
    accruals,
    payments,
    summary: {
      contractAmount, totalCharged, totalPaid,
      outstanding: totalCharged - totalPaid,
      currency,
      activeContracts: contracts.filter((c) => c.status === "signed" || c.status === "review").length,
    },
    reconciliation,
    preview: true,
  });
});

// GET /portal/buyer/contract-document?contractId=
router.get("/portal/buyer/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "buyer" || !me.linkedBuyerId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const contractId = parseInt(String(req.query.contractId || ""), 10);
  if (!contractId) {
    res.status(400).json({ error: "Укажите contractId" }); return;
  }

  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(
      eq(constructionSalesContractsTable.id, contractId),
      eq(constructionSalesContractsTable.buyerId, me.linkedBuyerId),
      eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
    ));
  if (!contract) {
    res.status(404).json({ error: "Договор не найден" }); return;
  }

  const doc = parseContractDocumentMeta(contract.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

export default router;
