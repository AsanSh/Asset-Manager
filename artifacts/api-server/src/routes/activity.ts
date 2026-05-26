import { Router } from "express";
import { eq, desc, SQL, and, inArray } from "drizzle-orm";
import {
  db, activityLogTable,
  paymentsTable, accrualsTable, depositsTable, expensesTable,
  leaseContractsTable, tenantsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ── Helpers ────────────────────────────────────────────────────────

const RESTORE_MAP: Record<string, { table: any; label: string }> = {
  payment:   { table: paymentsTable,       label: "Платёж" },
  accrual:   { table: accrualsTable,       label: "Начисление" },
  deposit:   { table: depositsTable,       label: "Депозит" },
  expense:   { table: expensesTable,       label: "Расход" },
  contract:  { table: leaseContractsTable, label: "Договор" },
  tenant:    { table: tenantsTable,        label: "Арендатор" },
};

// ── GET /activity  ─────────────────────────────────────────────────

router.get("/activity", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { entityType, entityId, module, actionType, limit } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(activityLogTable.companyId, req.scopedCompanyId!));
  if (entityType && entityType !== "all") conditions.push(eq(activityLogTable.entityType, entityType));
  if (entityId)   conditions.push(eq(activityLogTable.entityId, parseInt(entityId, 10)));
  if (module && module !== "all") conditions.push(eq(activityLogTable.module, module));
  if (actionType && actionType !== "all") conditions.push(eq(activityLogTable.actionType, actionType));

  const rows = await db.select().from(activityLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(parseInt(limit || "500", 10));
  res.json(rows);
});

// ── POST /activity  ────────────────────────────────────────────────

router.post("/activity", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, description, entityType, entityId, module, actionType, snapshot } = req.body;
  if (!type || !description) {
    res.status(400).json({ error: "type and description required" });
    return;
  }
  const [row] = await db.insert(activityLogTable).values({
    companyId: req.scopedCompanyId!,
    type,
    description,
    entityType,
    entityId,
    userId: req.userId,
    module: module || null,
    actionType: actionType || null,
    snapshot: snapshot ? JSON.stringify(snapshot) : null,
  }).returning();
  res.status(201).json(row);
});

// ── POST /activity/:id/restore  ────────────────────────────────────

router.post("/activity/:id/restore", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const companyId = req.scopedCompanyId!;

  const [entry] = await db.select().from(activityLogTable)
    .where(and(eq(activityLogTable.id, id), eq(activityLogTable.companyId, companyId)));

  if (!entry) { res.status(404).json({ error: "Запись не найдена" }); return; }
  if (!entry.snapshot) { res.status(400).json({ error: "Снапшот недоступен" }); return; }
  if (entry.restoredAt) { res.status(400).json({ error: "Уже восстановлено" }); return; }
  if (entry.actionType !== "delete" && entry.actionType !== "update") {
    res.status(400).json({ error: "Восстановление доступно только для удалённых или изменённых записей" }); return;
  }

  const entityType = entry.entityType;
  if (!entityType || !RESTORE_MAP[entityType]) {
    res.status(400).json({ error: `Тип записи '${entityType}' не поддерживает восстановление` }); return;
  }

  let data: any;
  try { data = JSON.parse(entry.snapshot); } catch {
    res.status(400).json({ error: "Не удалось распарсить снапшот" }); return;
  }

  let resultId: number;
  let resultDescription: string;

  if (entry.actionType === "delete") {
    // Re-insert row with new ID
    const { id: _id, ...restoreData } = data;
    restoreData.companyId = companyId;
    const { table } = RESTORE_MAP[entityType];
    const [restored] = (await db.insert(table).values(restoreData).returning()) as any[];
    resultId = restored.id;
    resultDescription = `Восстановлена удалённая запись (${entityType} #${restored.id})`;

  } else {
    // update: revert to old state (restore old status, paidAmount, balance etc.)
    const { table } = RESTORE_MAP[entityType];
    const entityId = entry.entityId;
    if (!entityId) { res.status(400).json({ error: "entityId не задан для отмены изменения" }); return; }
    // Only revert safe fields: status, notes, dueDate
    const revertFields: Record<string, unknown> = {};
    if (data.status !== undefined)    revertFields.status    = data.status;
    if (data.notes !== undefined)     revertFields.notes     = data.notes;
    if (data.dueDate !== undefined)   revertFields.dueDate   = data.dueDate;
    if (data.paidAmount !== undefined) revertFields.paidAmount = data.paidAmount;
    if (data.balance !== undefined)   revertFields.balance   = data.balance;
    if (data.discountAmount !== undefined) revertFields.discountAmount = data.discountAmount;
    if (data.discountType !== undefined)   revertFields.discountType = data.discountType;
    if (data.discountReason !== undefined) revertFields.discountReason = data.discountReason;
    await db.update(table).set(revertFields).where(
      and(eq((table as any).id, entityId), eq((table as any).companyId, companyId))
    );
    resultId = entityId;
    resultDescription = `Отменено изменение: ${entry.description}`;
  }

  // Mark as restored
  await db.update(activityLogTable)
    .set({ restoredAt: new Date() })
    .where(eq(activityLogTable.id, id));

  // Log the restore action
  await db.insert(activityLogTable).values({
    companyId,
    type: entityType,
    description: resultDescription,
    entityType,
    entityId: resultId,
    userId: req.userId,
    module: entry.module,
    actionType: "restore",
  });

  res.json({ entityId: resultId, logId: id });
});

export default router;
