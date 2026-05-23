import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db, usersTable, investorsTable, investmentsTable, distributionsTable,
  propertiesTable, tenantsTable, leaseContractsTable, paymentsTable, accrualsTable
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { hashPassword, validatePassword } from "../lib/security";

const router: ReturnType<typeof Router> = Router();

// POST /portal/create-investor-account
router.post("/portal/create-investor-account", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { investorId, email, firstName, lastName, password } = req.body;
  if (!investorId || !email || !firstName || !lastName || !password) {
    res.status(400).json({ error: "Все поля обязательны" }); return;
  }

  // Check investor belongs to company
  const [investor] = await db.select().from(investorsTable)
    .where(and(eq(investorsTable.id, investorId), eq(investorsTable.companyId, req.companyId!)));
  if (!investor) { res.status(404).json({ error: "Инвестор не найден" }); return; }

  // Check if user already exists
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    // Update if already linked
    if (existingUser.linkedInvestorId === investorId) {
      res.json({ message: "Аккаунт уже существует", userId: existingUser.id });
      return;
    }
    res.status(409).json({ error: "Email уже зарегистрирован" }); return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400).json({ error: passwordValidation.error });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    companyId: req.companyId!,
    email,
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
    role: "investor",
    linkedInvestorId: investorId,
    isActive: true,
  }).returning();

  const { passwordHash: _ph, ...safeUser } = user;
  res.status(201).json({ user: safeUser });
});

// POST /portal/create-tenant-account
router.post("/portal/create-tenant-account", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { tenantId, email, firstName, lastName, password } = req.body;
  if (!tenantId || !email || !firstName || !lastName || !password) {
    res.status(400).json({ error: "Все поля обязательны" }); return;
  }

  const [tenant] = await db.select().from(tenantsTable)
    .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.companyId, req.companyId!)));
  if (!tenant) { res.status(404).json({ error: "Арендатор не найден" }); return; }

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    if (existingUser.linkedTenantId === tenantId) {
      res.json({ message: "Аккаунт уже существует", userId: existingUser.id });
      return;
    }
    res.status(409).json({ error: "Email уже зарегистрирован" }); return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400).json({ error: passwordValidation.error });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    companyId: req.companyId!,
    email,
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
    role: "tenant",
    linkedTenantId: tenantId,
    isActive: true,
  }).returning();

  const { passwordHash: _ph, ...safeUser } = user;
  res.status(201).json({ user: safeUser });
});

// GET /portal/investor/me — данные для портала инвестора (только свои)
router.get("/portal/investor/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
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
router.get("/portal/tenant/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
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

export default router;
