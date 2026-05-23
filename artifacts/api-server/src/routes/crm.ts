import { Router } from "express";
import { eq, and, SQL, sql, desc, asc } from "drizzle-orm";
import {
  db,
  crmLeadsTable,
  crmClientsTable,
  crmDealsTable,
  crmSalesContractsTable,
  crmSalesPropertiesTable,
  propertiesTable,
  usersTable,
  activityLogTable,
  constructionUnitsTable,
  notificationsTable,
} from "../lib/db";

import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// Helper function to log CRM operations
async function logCrmOp(
  companyId: number,
  userId: number | undefined,
  entityType: string,
  entityId: number | null,
  actionType: "create" | "update" | "delete",
  description: string,
  snapshot?: object,
) {
  await db.insert(activityLogTable).values({
    companyId,
    userId: userId ?? null,
    type: entityType,
    description,
    entityType,
    entityId,
    module: "crm",
    actionType,
    snapshot: snapshot ? JSON.stringify(snapshot) : null,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// LEADS (Лиды)
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/leads - List leads with filters
router.get("/crm/leads", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { status, source, assignedTo } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];

  if (req.companyId) conditions.push(eq(crmLeadsTable.companyId, req.companyId));
  if (status) conditions.push(eq(crmLeadsTable.status, status));
  if (source) conditions.push(eq(crmLeadsTable.source, source));
  if (assignedTo) conditions.push(eq(crmLeadsTable.assignedUserId, parseInt(assignedTo, 10)));

  const leads = await db.select().from(crmLeadsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crmLeadsTable.createdAt));

  // Enrich with assigned user names
  const enriched = await Promise.all(leads.map(async (lead) => {
    let assignedUserName = null;
    if (lead.assignedUserId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, lead.assignedUserId));
      assignedUserName = user ? `${user.firstName} ${user.lastName}` : null;
    }
    return { ...lead, assignedUserName };
  }));

  res.json(enriched);
});

// POST /crm/leads - Create lead
router.post("/crm/leads", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const {
    fullName, phone, email, source, status, propertyType, budget, currency, notes, assignedUserId
  } = req.body;

  if (!fullName) {
    res.status(400).json({ error: "fullName required" });
    return;
  }

  const [lead] = await db.insert(crmLeadsTable).values({
    companyId: req.companyId,
    fullName,
    phone,
    email,
    source,
    status: status || "new",
    propertyType,
    budget,
    currency: currency || "KGS",
    notes,
    assignedUserId: assignedUserId ? parseInt(String(assignedUserId), 10) : null,
    createdBy: req.userId,
  }).returning();

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_lead", lead.id, "create",
      `Создан лид: ${fullName}`, lead);
  }

  res.status(201).json(lead);
});

// PATCH /crm/leads/:id - Update lead
router.patch("/crm/leads/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const {
    fullName, phone, email, source, status, propertyType, budget, currency, notes, assignedUserId, lastContactDate
  } = req.body;

  const conditions: SQL[] = [eq(crmLeadsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmLeadsTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmLeadsTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (source !== undefined) updates.source = source;
  if (status !== undefined) updates.status = status;
  if (propertyType !== undefined) updates.propertyType = propertyType;
  if (budget !== undefined) updates.budget = budget;
  if (currency !== undefined) updates.currency = currency;
  if (notes !== undefined) updates.notes = notes;
  if (assignedUserId !== undefined) updates.assignedUserId = assignedUserId ? parseInt(String(assignedUserId), 10) : null;
  if (lastContactDate !== undefined) updates.lastContactDate = lastContactDate;

  const [lead] = await db.update(crmLeadsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId && status !== undefined && status !== existing.status) {
    await logCrmOp(req.companyId, req.userId, "crm_lead", id, "update",
      `Лид ${existing.fullName}: статус изменён с ${existing.status} на ${status}`, existing);
  }

  res.json(lead);
});

// PATCH /crm/leads/:id/status - Change status (shortcut endpoint)
router.patch("/crm/leads/:id/status", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body;

  if (!status || !["new", "contacted", "qualified", "lost", "converted"].includes(status)) {
    res.status(400).json({ error: "Valid status required: new/contacted/qualified/lost/converted" });
    return;
  }

  const conditions: SQL[] = [eq(crmLeadsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmLeadsTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmLeadsTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (status === "converted") {
    updates.conversionDate = new Date();
  }

  const [lead] = await db.update(crmLeadsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_lead", id, "update",
      `Лид ${existing.fullName}: статус изменён на ${status}`, existing);
  }

  res.json(lead);
});

// DELETE /crm/leads/:id - Delete lead (admin only)
router.delete("/crm/leads/:id", requireAuth, requireRole("admin", "company_admin", "owner"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmLeadsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmLeadsTable.companyId, req.companyId));

  const [snap] = await db.select().from(crmLeadsTable).where(and(...conditions));
  if (!snap) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.delete(crmLeadsTable).where(and(...conditions));

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_lead", id, "delete",
      `Удалён лид: ${snap.fullName}`, snap);
  }

  res.sendStatus(204);
});

// ════════════════════════════════════════════════════════════════════════════
// CLIENTS (Клиенты)
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/clients - List clients
router.get("/crm/clients", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];

  if (req.companyId) conditions.push(eq(crmClientsTable.companyId, req.companyId));
  if (type) conditions.push(eq(crmClientsTable.type, type));
  if (status) conditions.push(eq(crmClientsTable.status, status));

  const clients = await db.select().from(crmClientsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crmClientsTable.createdAt));

  res.json(clients);
});

// POST /crm/clients - Create client
router.post("/crm/clients", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const {
    fullName, type, phone, email, address, inn, passportData, birthDate,
    budget, currency, creditApproved, notes, status
  } = req.body;

  if (!fullName) {
    res.status(400).json({ error: "fullName required" });
    return;
  }

  const [client] = await db.insert(crmClientsTable).values({
    companyId: req.companyId,
    fullName,
    type: type || "individual",
    phone,
    email,
    address,
    inn,
    passportData,
    birthDate: birthDate ? new Date(birthDate) : null,
    budget,
    currency: currency || "KGS",
    creditApproved,
    notes,
    status: status || "active",
  }).returning();

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_client", client.id, "create",
      `Создан клиент: ${fullName}`, client);
  }

  res.status(201).json(client);
});

// PATCH /crm/clients/:id - Update client
router.patch("/crm/clients/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmClientsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmClientsTable.companyId, req.companyId));

  const updates: Record<string, unknown> = {};
  const {
    fullName, type, phone, email, address, inn, passportData, birthDate,
    budget, currency, creditApproved, notes, status
  } = req.body;

  if (fullName !== undefined) updates.fullName = fullName;
  if (type !== undefined) updates.type = type;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (inn !== undefined) updates.inn = inn;
  if (passportData !== undefined) updates.passportData = passportData;
  if (birthDate !== undefined) updates.birthDate = birthDate ? new Date(birthDate) : null;
  if (budget !== undefined) updates.budget = budget;
  if (currency !== undefined) updates.currency = currency;
  if (creditApproved !== undefined) updates.creditApproved = creditApproved;
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) updates.status = status;

  const [client] = await db.update(crmClientsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(client);
});

// GET /crm/clients/:id - Get client with deals history
router.get("/crm/clients/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmClientsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmClientsTable.companyId, req.companyId));

  const [client] = await db.select().from(crmClientsTable).where(and(...conditions));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Get client's deals
  const dealConditions: SQL[] = [eq(crmDealsTable.clientId, id)];
  if (req.companyId) dealConditions.push(eq(crmDealsTable.companyId, req.companyId));

  const deals = await db.select().from(crmDealsTable)
    .where(and(...dealConditions))
    .orderBy(desc(crmDealsTable.createdAt));

  // Get sales contracts
  const contractConditions: SQL[] = [eq(crmSalesContractsTable.clientId, id)];
  if (req.companyId) contractConditions.push(eq(crmSalesContractsTable.companyId, req.companyId));

  const contracts = await db.select().from(crmSalesContractsTable)
    .where(and(...contractConditions))
    .orderBy(desc(crmSalesContractsTable.createdAt));

  res.json({ ...client, deals, contracts });
});

// ════════════════════════════════════════════════════════════════════════════
// DEALS (Сделки)
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/deals - List deals with filters
router.get("/crm/deals", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { stage, propertyId, clientId } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];

  if (req.companyId) conditions.push(eq(crmDealsTable.companyId, req.companyId));
  if (stage) conditions.push(eq(crmDealsTable.stage, stage));
  if (propertyId) conditions.push(eq(crmDealsTable.propertyId, parseInt(propertyId, 10)));
  if (clientId) conditions.push(eq(crmDealsTable.clientId, parseInt(clientId, 10)));

  const deals = await db.select().from(crmDealsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crmDealsTable.createdAt));

  // Enrich with client and property names
  const enriched = await Promise.all(deals.map(async (deal) => {
    const [client] = await db.select().from(crmClientsTable).where(eq(crmClientsTable.id, deal.clientId));
    let property = null;
    if (deal.propertyId) {
      [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, deal.propertyId));
    }
    let assignedUserName = null;
    if (deal.assignedUserId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, deal.assignedUserId));
      assignedUserName = user ? `${user.firstName} ${user.lastName}` : null;
    }
    return {
      ...deal,
      clientName: client?.fullName ?? null,
      propertyUnitNumber: property?.unitNumber ?? null,
      propertyProjectName: property?.projectName ?? null,
      assignedUserName,
    };
  }));

  res.json(enriched);
});

// POST /crm/deals - Create deal
router.post("/crm/deals", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const {
    clientId, propertyId, dealAmount, currency, stage, probability,
    expectedCloseDate, assignedUserId, notes
  } = req.body;

  if (!clientId || !dealAmount) {
    res.status(400).json({ error: "clientId and dealAmount required" });
    return;
  }

  const [deal] = await db.insert(crmDealsTable).values({
    companyId: req.companyId,
    clientId: parseInt(String(clientId), 10),
    propertyId: propertyId ? parseInt(String(propertyId), 10) : null,
    dealAmount,
    currency: currency || "KGS",
    stage: stage || "lead",
    probability: probability || 10,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    assignedUserId: assignedUserId ? parseInt(String(assignedUserId), 10) : null,
    notes,
  }).returning();

  if (req.companyId) {
    const [client] = await db.select().from(crmClientsTable).where(eq(crmClientsTable.id, parseInt(String(clientId), 10)));
    await logCrmOp(req.companyId, req.userId, "crm_deal", deal.id, "create",
      `Создана сделка с ${client?.fullName ?? "клиентом"} на сумму ${dealAmount} ${currency}`, deal);
  }

  res.status(201).json(deal);
});

// PATCH /crm/deals/:id - Update deal
router.patch("/crm/deals/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmDealsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmDealsTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmDealsTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const {
    propertyId, dealAmount, currency, stage, probability,
    expectedCloseDate, actualCloseDate, assignedUserId, notes
  } = req.body;

  if (propertyId !== undefined) updates.propertyId = propertyId ? parseInt(String(propertyId), 10) : null;
  if (dealAmount !== undefined) updates.dealAmount = dealAmount;
  if (currency !== undefined) updates.currency = currency;
  if (stage !== undefined) updates.stage = stage;
  if (probability !== undefined) updates.probability = probability;
  if (expectedCloseDate !== undefined) updates.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
  if (actualCloseDate !== undefined) updates.actualCloseDate = actualCloseDate ? new Date(actualCloseDate) : null;
  if (assignedUserId !== undefined) updates.assignedUserId = assignedUserId ? parseInt(String(assignedUserId), 10) : null;
  if (notes !== undefined) updates.notes = notes;

  const [deal] = await db.update(crmDealsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId && stage !== undefined && stage !== existing.stage) {
    await logCrmOp(req.companyId, req.userId, "crm_deal", id, "update",
      `Сделка #${id}: стадия изменена с ${existing.stage} на ${stage}`, existing);
  }

  res.json(deal);
});

// PATCH /crm/deals/:id/stage - Move to next stage
router.patch("/crm/deals/:id/stage", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { stage } = req.body;

  const validStages = ["lead", "viewing", "negotiation", "contract", "closed_won", "closed_lost"];
  if (!stage || !validStages.includes(stage)) {
    res.status(400).json({ error: `Valid stage required: ${validStages.join("/")}` });
    return;
  }

  const conditions: SQL[] = [eq(crmDealsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmDealsTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmDealsTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  const updates: Record<string, unknown> = { stage };

  // Auto-adjust probability based on stage
  const probabilityMap: Record<string, number> = {
    lead: 10,
    viewing: 25,
    negotiation: 50,
    contract: 75,
    closed_won: 100,
    closed_lost: 0,
  };
  updates.probability = probabilityMap[stage];

  // Set actual close date for closed stages
  if (stage === "closed_won" || stage === "closed_lost") {
    updates.actualCloseDate = new Date();
  }

  const [deal] = await db.update(crmDealsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_deal", id, "update",
      `Сделка #${id}: переведена в стадию ${stage}`, existing);
  }

  res.json(deal);
});

// GET /crm/deals/pipeline - Get pipeline stats by stage
router.get("/crm/deals/pipeline", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const conditions: SQL[] = [];
  if (req.companyId) conditions.push(eq(crmDealsTable.companyId, req.companyId));

  const deals = await db.select().from(crmDealsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const pipeline = {
    lead: { count: 0, totalAmount: 0 },
    viewing: { count: 0, totalAmount: 0 },
    negotiation: { count: 0, totalAmount: 0 },
    contract: { count: 0, totalAmount: 0 },
    closed_won: { count: 0, totalAmount: 0 },
    closed_lost: { count: 0, totalAmount: 0 },
  };

  deals.forEach((deal) => {
    const stage = deal.stage as keyof typeof pipeline;
    if (pipeline[stage]) {
      pipeline[stage].count++;
      pipeline[stage].totalAmount += parseFloat(String(deal.dealAmount));
    }
  });

  const totalActiveDeals = pipeline.lead.count + pipeline.viewing.count +
    pipeline.negotiation.count + pipeline.contract.count;
  const totalActiveDealAmount = pipeline.lead.totalAmount + pipeline.viewing.totalAmount +
    pipeline.negotiation.totalAmount + pipeline.contract.totalAmount;

  res.json({
    pipeline,
    summary: {
      totalActiveDeals,
      totalActiveDealAmount,
      totalWon: pipeline.closed_won.count,
      totalWonAmount: pipeline.closed_won.totalAmount,
      totalLost: pipeline.closed_lost.count,
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SALES CONTRACTS (Договоры продажи)
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/sales-contracts - List contracts
router.get("/crm/sales-contracts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { status, clientId, propertyId } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];

  if (req.companyId) conditions.push(eq(crmSalesContractsTable.companyId, req.companyId));
  if (status) conditions.push(eq(crmSalesContractsTable.status, status));
  if (clientId) conditions.push(eq(crmSalesContractsTable.clientId, parseInt(clientId, 10)));
  if (propertyId) conditions.push(eq(crmSalesContractsTable.propertyId, parseInt(propertyId, 10)));

  const contracts = await db.select().from(crmSalesContractsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crmSalesContractsTable.createdAt));

  // Enrich with client and property info
  const enriched = await Promise.all(contracts.map(async (contract) => {
    const [client] = await db.select().from(crmClientsTable).where(eq(crmClientsTable.id, contract.clientId));
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, contract.propertyId));
    return {
      ...contract,
      clientName: client?.fullName ?? null,
      propertyUnitNumber: property?.unitNumber ?? null,
      propertyProjectName: property?.projectName ?? null,
    };
  }));

  res.json(enriched);
});

// POST /crm/sales-contracts - Create contract
router.post("/crm/sales-contracts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const {
    contractNumber, clientId, propertyId, unitId, totalAmount, currency,
    paymentSchedule, signDate, registrationDate, status, notes
  } = req.body;

  if (!contractNumber || !clientId || !propertyId || !totalAmount) {
    res.status(400).json({ error: "contractNumber, clientId, propertyId, and totalAmount required" });
    return;
  }

  const [contract] = await db.insert(crmSalesContractsTable).values({
    companyId: req.companyId,
    contractNumber,
    clientId: parseInt(String(clientId), 10),
    propertyId: parseInt(String(propertyId), 10),
    totalAmount,
    currency: currency || "KGS",
    paymentSchedule: paymentSchedule ? JSON.stringify(paymentSchedule) : null,
    signDate: signDate ? new Date(signDate) : null,
    registrationDate: registrationDate ? new Date(registrationDate) : null,
    status: status || "draft",
    notes,
  }).returning();

  // AUTOMATION: Update construction unit status if unitId provided
  if (unitId) {
    const unitIdNum = parseInt(String(unitId), 10);
    const [unit] = await db.select().from(constructionUnitsTable)
      .where(and(
        eq(constructionUnitsTable.id, unitIdNum),
        eq(constructionUnitsTable.companyId, req.companyId!)
      ));

    if (unit) {
      // Update unit with sales info
      await db.update(constructionUnitsTable)
        .set({
          status: "sold",
          salesContractId: contract.id,
          clientId: parseInt(String(clientId), 10),
          salePrice: totalAmount,
          saleDate: signDate || new Date().toISOString().split('T')[0],
        })
        .where(eq(constructionUnitsTable.id, unitIdNum));

      // Create notification
      const [client] = await db.select().from(crmClientsTable)
        .where(eq(crmClientsTable.id, parseInt(String(clientId), 10)));

      if (req.companyId) {
        await db.insert(notificationsTable).values({
          companyId: req.companyId,
          userId: null, // For all users
          type: "sale_completed",
          title: "Новая продажа!",
          body: `Продан юнит ${unit.unitNumber}`,
          message: `Клиент: ${client?.fullName ?? "неизвестен"}, Сумма: ${parseFloat(totalAmount).toLocaleString()} ${currency}`,
          icon: "check-circle",
          color: "green",
          link: `/construction/chess`,
          isRead: false,
          read: false,
        });
      }
    }
  }

  if (req.companyId) {
    const [client] = await db.select().from(crmClientsTable).where(eq(crmClientsTable.id, parseInt(String(clientId), 10)));
    await logCrmOp(req.companyId, req.userId, "crm_sales_contract", contract.id, "create",
      `Создан договор продажи №${contractNumber} с ${client?.fullName ?? "клиентом"}`, contract);
  }

  res.status(201).json(contract);
});

// PATCH /crm/sales-contracts/:id - Update contract
router.patch("/crm/sales-contracts/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmSalesContractsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmSalesContractsTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmSalesContractsTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const {
    totalAmount, currency, paymentSchedule, signDate, registrationDate, status, notes
  } = req.body;

  if (totalAmount !== undefined) updates.totalAmount = totalAmount;
  if (currency !== undefined) updates.currency = currency;
  if (paymentSchedule !== undefined) updates.paymentSchedule = paymentSchedule ? JSON.stringify(paymentSchedule) : null;
  if (signDate !== undefined) updates.signDate = signDate ? new Date(signDate) : null;
  if (registrationDate !== undefined) updates.registrationDate = registrationDate ? new Date(registrationDate) : null;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const [contract] = await db.update(crmSalesContractsTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId && status !== undefined && status !== existing.status) {
    await logCrmOp(req.companyId, req.userId, "crm_sales_contract", id, "update",
      `Договор ${existing.contractNumber}: статус изменён на ${status}`, existing);
  }

  res.json(contract);
});

// GET /crm/sales-contracts/:id - Get contract with payments
router.get("/crm/sales-contracts/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmSalesContractsTable.id, id)];
  if (req.companyId) conditions.push(eq(crmSalesContractsTable.companyId, req.companyId));

  const [contract] = await db.select().from(crmSalesContractsTable).where(and(...conditions));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  // Get client and property info
  const [client] = await db.select().from(crmClientsTable).where(eq(crmClientsTable.id, contract.clientId));
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, contract.propertyId));

  res.json({
    ...contract,
    clientName: client?.fullName ?? null,
    clientPhone: client?.phone ?? null,
    clientEmail: client?.email ?? null,
    propertyUnitNumber: property?.unitNumber ?? null,
    propertyProjectName: property?.projectName ?? null,
    propertyAddress: property?.comment ?? null,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SALES PROPERTIES (Объекты на продажу)
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/sales-properties - List available properties
router.get("/crm/sales-properties", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];

  if (req.companyId) conditions.push(eq(crmSalesPropertiesTable.companyId, req.companyId));
  if (status) conditions.push(eq(crmSalesPropertiesTable.status, status));

  const salesProperties = await db.select().from(crmSalesPropertiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crmSalesPropertiesTable.createdAt));

  // Enrich with property details
  const enriched = await Promise.all(salesProperties.map(async (sp) => {
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, sp.propertyId));
    return {
      ...sp,
      unitNumber: property?.unitNumber ?? null,
      projectName: property?.projectName ?? null,
      address: property?.comment ?? null,
      type: property?.type ?? null,
      area: property?.area ?? null,
      rooms: null,
    };
  }));

  res.json(enriched);
});

// POST /crm/sales-properties - Add property for sale
router.post("/crm/sales-properties", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, salePrice, currency, status, marketingDescription, photos, availableFrom } = req.body;

  if (!propertyId || !salePrice) {
    res.status(400).json({ error: "propertyId and salePrice required" });
    return;
  }

  // Check if property exists
  const propConditions: SQL[] = [eq(propertiesTable.id, parseInt(String(propertyId), 10))];
  if (req.companyId) propConditions.push(eq(propertiesTable.companyId, req.companyId));

  const [property] = await db.select().from(propertiesTable).where(and(...propConditions));
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [salesProperty] = await db.insert(crmSalesPropertiesTable).values({
    companyId: req.companyId,
    propertyId: parseInt(String(propertyId), 10),
    salePrice,
    currency: currency || "KGS",
    status: status || "available",
    marketingDescription,
    photos: photos ? JSON.stringify(photos) : null,
    availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
  }).returning();

  if (req.companyId) {
    await logCrmOp(req.companyId, req.userId, "crm_sales_property", salesProperty.id, "create",
      `Объект ${property.unitNumber} выставлен на продажу за ${salePrice} ${currency}`, salesProperty);
  }

  res.status(201).json(salesProperty);
});

// PATCH /crm/sales-properties/:id - Update (price, status)
router.patch("/crm/sales-properties/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const conditions: SQL[] = [eq(crmSalesPropertiesTable.id, id)];
  if (req.companyId) conditions.push(eq(crmSalesPropertiesTable.companyId, req.companyId));

  const [existing] = await db.select().from(crmSalesPropertiesTable).where(and(...conditions));
  if (!existing) {
    res.status(404).json({ error: "Sales property not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const { salePrice, currency, status, marketingDescription, photos } = req.body;

  if (salePrice !== undefined) updates.salePrice = salePrice;
  if (currency !== undefined) updates.currency = currency;
  if (status !== undefined) updates.status = status;
  if (marketingDescription !== undefined) updates.marketingDescription = marketingDescription;
  if (photos !== undefined) updates.photos = photos ? JSON.stringify(photos) : null;

  const [salesProperty] = await db.update(crmSalesPropertiesTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (req.companyId && status !== undefined && status !== existing.status) {
    await logCrmOp(req.companyId, req.userId, "crm_sales_property", id, "update",
      `Статус объекта изменён на ${status}`, existing);
  }

  res.json(salesProperty);
});

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD / STATS
// ════════════════════════════════════════════════════════════════════════════

// GET /crm/dashboard - Stats: active leads, conversion rate, deals by stage, revenue forecast
router.get("/crm/dashboard", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const conditions: SQL[] = [];
  if (req.companyId) conditions.push(eq(crmLeadsTable.companyId, req.companyId));

  // Leads stats
  const leads = await db.select().from(crmLeadsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const activeLeads = leads.filter((l) => !["converted", "lost"].includes(l.status));
  const convertedLeads = leads.filter((l) => l.status === "converted");
  const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0;

  // Deals stats
  const dealConditions: SQL[] = [];
  if (req.companyId) dealConditions.push(eq(crmDealsTable.companyId, req.companyId));

  const deals = await db.select().from(crmDealsTable)
    .where(dealConditions.length ? and(...dealConditions) : undefined);

  const dealsByStage = {
    lead: deals.filter((d) => d.stage === "lead").length,
    viewing: deals.filter((d) => d.stage === "viewing").length,
    negotiation: deals.filter((d) => d.stage === "negotiation").length,
    contract: deals.filter((d) => d.stage === "contract").length,
    closed_won: deals.filter((d) => d.stage === "closed_won").length,
    closed_lost: deals.filter((d) => d.stage === "closed_lost").length,
  };

  // Revenue forecast (weighted by probability)
  const revenueForecast = deals
    .filter((d) => !["closed_won", "closed_lost"].includes(d.stage))
    .reduce((sum, d) => sum + (parseFloat(String(d.dealAmount)) * (d.probability || 0) / 100), 0);

  const totalRevenue = deals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + parseFloat(String(d.dealAmount)), 0);

  // Contracts stats
  const contractConditions: SQL[] = [];
  if (req.companyId) contractConditions.push(eq(crmSalesContractsTable.companyId, req.companyId));

  const contracts = await db.select().from(crmSalesContractsTable)
    .where(contractConditions.length ? and(...contractConditions) : undefined);

  const activeContracts = contracts.filter((c) => ["draft", "signed"].includes(c.status));
  const registeredContracts = contracts.filter((c) => c.status === "registered");

  res.json({
    leads: {
      total: leads.length,
      active: activeLeads.length,
      converted: convertedLeads.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
    },
    deals: {
      total: deals.length,
      byStage: dealsByStage,
      revenueForecast: Math.round(revenueForecast),
      totalRevenue: Math.round(totalRevenue),
    },
    contracts: {
      total: contracts.length,
      active: activeContracts.length,
      registered: registeredContracts.length,
    },
  });
});

export default router;
