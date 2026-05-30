import { Router } from "express";
import { eq, and, desc, sql, asc, gte } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  constructionProjectsTable,
  constructionStagesTable,
  constructionTasksTable,
  constructionWorkersTable,
  constructionContractorsTable,
  constructionContractorSpecializationsTable,
  constructionMaterialsTable,
  constructionBudgetItemsTable,
  constructionExpensesTable,
  constructionUnitsTable,
  currencyRatesTable,
  taskCommentsTable,
  consolidatedLogsTable,
  constructionSupplementsTable,
  notificationsTable,
  usersTable,
} from "../lib/db";
import { sendTaskAssignedEmail } from "../lib/email";
import { constructionSalesContractsTable } from "../lib/db";
import { ensureCounterpartyWithRole } from "../lib/counterparty-sync";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";
import { getPaginationParams, createPaginatedResponse, getPaginationQuery } from "../lib/pagination";
import { validateQuery, commonSchemas } from "../middleware/validation";
import { cache, cacheKeys } from "../lib/cache";
import { seedProjectUnits } from "../lib/seed-project-units";
import {
  buildContractDocumentMeta,
  parseContractDocumentMeta,
  summarizeContractDocument,
} from "../lib/contract-document";

function mapContractorResponse(row: typeof constructionContractorsTable.$inferSelect) {
  const { contractDocumentMeta, ...rest } = row;
  return {
    ...rest,
    contractDocument: summarizeContractDocument(contractDocumentMeta),
  };
}

function buildContractorReconciliation(
  contractor: typeof constructionContractorsTable.$inferSelect,
  payments: Array<{
    date: string | null;
    description: string | null;
    amount: string | null;
    currency: string | null;
    status: string | null;
  }>,
) {
  const contractAmount = parseFloat(String(contractor.contractAmount ?? 0));
  const paidAmount = parseFloat(String(contractor.paidAmount ?? 0));
  const outstanding = contractAmount - paidAmount;

  const paidExpenses = payments
    .filter((p) => p.status === "paid" || p.status === "approved")
    .slice()
    .reverse();

  let balance = contractAmount;
  const lines = paidExpenses.map((p) => {
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

  return {
    contractAmount,
    paidAmount,
    outstanding,
    currency: contractor.currency ?? "KGS",
    contractNumber: contractor.contractNumber,
    lines,
  };
}
import { parseProjectDocument } from "../lib/parse-project-document";
import { constructionUnitStatusesTable } from "../lib/db";
import {
  ensureUnitStatuses,
  resolveUnitStatus,
  slugifyStatusCode,
} from "../lib/unit-statuses";
import { UNIT_STATUS_COLOR_PRESETS, type UnitStatusColorKey } from "../lib/default-unit-statuses";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ── PROJECTS ──────────────────────────────────────────────────────────────────

// GET /projects/all — все проекты без пагинации (для дропдаунов)
router.get("/projects/all", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db.select().from(constructionProjectsTable)
    .where(eq(constructionProjectsTable.companyId, companyId))
    .orderBy(desc(constructionProjectsTable.createdAt));
  res.json(rows);
});

router.get("/projects", requireAuth, validateQuery(commonSchemas.pagination), async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const pagination = getPaginationParams(req);

  // Try cache first
  const cacheKey = `${cacheKeys.projects(companyId)}:page:${pagination.page}:limit:${pagination.limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(constructionProjectsTable)
    .where(eq(constructionProjectsTable.companyId, companyId));

  // Get paginated data
  const rows = await db.select().from(constructionProjectsTable)
    .where(eq(constructionProjectsTable.companyId, companyId))
    .orderBy(desc(constructionProjectsTable.createdAt))
    .limit(pagination.limit)
    .offset(pagination.offset);

  const response = createPaginatedResponse(rows, count, pagination);
  cache.set(cacheKey, response, 300); // Cache for 5 minutes
  res.json(response);
});

/** Парсинг титульного листа / PDF проекта (Claude Vision / текст) */
router.post("/projects/parse-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { base64, mimeType, fileName } = req.body;
    if (!base64 || !mimeType) {
      res.status(400).json({ error: "base64 и mimeType обязательны" });
      return;
    }
    if (String(base64).length > 28_000_000) {
      res.status(400).json({ error: "Файл слишком большой (макс. ~20 МБ после сжатия)" });
      return;
    }
    const parsed = await parseProjectDocument({
      base64: String(base64),
      mimeType: String(mimeType),
      fileName: fileName ? String(fileName) : undefined,
    });
    res.json(parsed);
  } catch (e) {
    sendServerError(res, e, "Ошибка распознавания документа");
  }
});

router.post("/projects", async (req: AuthenticatedRequest, res): Promise<void> => {
  const body = req.body;
  const totalArea = parseFloat(body.totalArea || "0");
  const costPerSqm = parseFloat(body.costPerSqm || "0");
  const exchangeRate = parseFloat(body.exchangeRate || "1");
  const estimatedCostKgs = totalArea * costPerSqm * (body.currency === "KGS" ? 1 : exchangeRate);

  const [row] = await db.insert(constructionProjectsTable).values({
    companyId: req.scopedCompanyId!,
    name: body.name,
    address: body.address,
    region: body.region,
    status: body.status || "planning",
    buildingType: body.buildingType || "apartment",
    constructionType: body.constructionType || "monolith",
    totalFloors: body.totalFloors ? parseInt(body.totalFloors) : null,
    totalUnits: body.totalUnits ? parseInt(body.totalUnits) : null,
    totalArea: body.totalArea ? String(totalArea) : null,
    costPerSqm: body.costPerSqm ? String(costPerSqm) : null,
    currency: body.currency || "KGS",
    exchangeRateSource: body.exchangeRateSource || "nbkr",
    exchangeRate: String(exchangeRate),
    estimatedCostKgs: estimatedCostKgs > 0 ? String(estimatedCostKgs) : null,
    startDate: body.startDate || null,
    plannedEndDate: body.plannedEndDate || null,
    description: body.description || null,
    documentMeta: body.documentMeta
      ? (typeof body.documentMeta === "string"
        ? body.documentMeta
        : JSON.stringify(body.documentMeta))
      : null,
  }).returning();

  // Invalidate cache
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);

  let unitsCreated = 0;
  if (row.totalFloors && row.totalUnits) {
    unitsCreated = await seedProjectUnits(
      req.scopedCompanyId!,
      row.id,
      row.totalFloors,
      row.totalUnits,
    );
  }

  res.status(201).json({ ...row, unitsCreated });
});

router.post("/projects/:id/generate-units", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [project] = await db
    .select()
    .from(constructionProjectsTable)
    .where(
      and(
        eq(constructionProjectsTable.id, id),
        eq(constructionProjectsTable.companyId, req.scopedCompanyId!),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }

  if (!project.totalFloors || !project.totalUnits) {
    res.status(400).json({
      error: "Укажите в проекте количество этажей и квартир, затем повторите",
    });
    return;
  }

  const force = req.query.force === "1" || req.query.force === "true";

  const [existing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.projectId, id),
        eq(constructionUnitsTable.companyId, req.scopedCompanyId!),
      ),
    );

  const existingCount = Number(existing?.n ?? 0);

  if (existingCount > 0 && !force) {
    res.status(409).json({
      error: "В шахматке уже есть квартиры. Подтвердите пересоздание или используйте «Заполнить шахматку».",
      existingUnits: existingCount,
    });
    return;
  }

  if (force && existingCount > 0) {
    await db
      .delete(constructionUnitsTable)
      .where(
        and(
          eq(constructionUnitsTable.projectId, id),
          eq(constructionUnitsTable.companyId, req.scopedCompanyId!),
        ),
      );
  }

  const unitsCreated = await seedProjectUnits(
    req.scopedCompanyId!,
    id,
    project.totalFloors,
    project.totalUnits,
  );

  res.json({ success: true, unitsCreated });
});

router.patch("/projects/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const body = req.body;
  const totalArea = parseFloat(body.totalArea || "0");
  const costPerSqm = parseFloat(body.costPerSqm || "0");
  const exchangeRate = parseFloat(body.exchangeRate || "1");
  const estimatedCostKgs = totalArea * costPerSqm * (body.currency === "KGS" ? 1 : exchangeRate);

  const [row] = await db.update(constructionProjectsTable)
    .set({
      name: body.name, address: body.address, region: body.region, status: body.status,
      buildingType: body.buildingType, constructionType: body.constructionType,
      totalFloors: body.totalFloors ? parseInt(body.totalFloors) : null,
      totalUnits: body.totalUnits ? parseInt(body.totalUnits) : null,
      totalArea: body.totalArea ? String(totalArea) : null,
      costPerSqm: body.costPerSqm ? String(costPerSqm) : null,
      currency: body.currency, exchangeRateSource: body.exchangeRateSource,
      exchangeRate: String(exchangeRate),
      estimatedCostKgs: estimatedCostKgs > 0 ? String(estimatedCostKgs) : null,
      startDate: body.startDate || null, plannedEndDate: body.plannedEndDate || null,
      description: body.description || null,
      documentMeta: body.documentMeta != null
        ? (typeof body.documentMeta === "string"
          ? body.documentMeta
          : JSON.stringify(body.documentMeta))
        : undefined,
      contractTemplateMeta: body.contractTemplateMeta != null
        ? (typeof body.contractTemplateMeta === "string"
          ? body.contractTemplateMeta
          : JSON.stringify(body.contractTemplateMeta))
        : undefined,
    })
    .where(and(eq(constructionProjectsTable.id, id), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let unitsCreated = 0;
  if (row.totalFloors && row.totalUnits) {
    unitsCreated = await seedProjectUnits(
      req.scopedCompanyId!,
      row.id,
      row.totalFloors,
      row.totalUnits,
    );
  }

  // Invalidate cache
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);
  cache.delete(cacheKeys.project(id));

  res.json({ ...row, unitsCreated });
});

router.delete("/projects/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionProjectsTable)
    .where(and(eq(constructionProjectsTable.id, id), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)));

  // Invalidate cache
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);
  cache.delete(cacheKeys.project(id));

  res.json({ ok: true });
});

// ── STAGES ────────────────────────────────────────────────────────────────────

router.get("/stages", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  let q = db.select().from(constructionStagesTable).where(eq(constructionStagesTable.companyId, req.scopedCompanyId!));
  const rows = await db.select().from(constructionStagesTable)
    .where(and(
      eq(constructionStagesTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionStagesTable.projectId, parseInt(projectId as string))] : [])
    ))
    .orderBy(asc(constructionStagesTable.sortOrder), asc(constructionStagesTable.createdAt));
  res.json(rows);
});

router.post("/stages", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, name, description, status, startDate, plannedEndDate, budgetAmount, sortOrder, parentStageId } = req.body;
  const parsedProjectId = parseInt(String(projectId), 10);
  const parsedParentId = parentStageId ? parseInt(String(parentStageId), 10) : null;

  let nextSortOrder =
    sortOrder != null && sortOrder !== ""
      ? parseInt(String(sortOrder), 10)
      : NaN;

  const projectScope = and(
    eq(constructionStagesTable.companyId, req.scopedCompanyId!),
    eq(constructionStagesTable.projectId, parsedProjectId),
  );

  if (!Number.isFinite(nextSortOrder)) {
    if (parsedParentId) {
      const [parent] = await db.select().from(constructionStagesTable)
        .where(and(projectScope, eq(constructionStagesTable.id, parsedParentId)));
      if (!parent) {
        res.status(404).json({ error: "Родительский этап не найден" });
        return;
      }

      const existingChildren = await db.select({ sortOrder: constructionStagesTable.sortOrder })
        .from(constructionStagesTable)
        .where(and(projectScope, eq(constructionStagesTable.parentStageId, parsedParentId)))
        .orderBy(desc(constructionStagesTable.sortOrder));

      const anchorOrder = existingChildren.length > 0
        ? (existingChildren[0].sortOrder ?? parent.sortOrder ?? 0)
        : (parent.sortOrder ?? 0);
      nextSortOrder = anchorOrder + 1;

      // Сдвигаем этапы ниже: подэтап встаёт между родителем и следующим этапом
      await db.update(constructionStagesTable)
        .set({ sortOrder: sql`${constructionStagesTable.sortOrder} + 1` })
        .where(and(projectScope, gte(constructionStagesTable.sortOrder, nextSortOrder)));
    } else {
      const all = await db.select({ sortOrder: constructionStagesTable.sortOrder })
        .from(constructionStagesTable)
        .where(projectScope);
      nextSortOrder = all.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0) + 1;
    }
  }

  const [row] = await db.insert(constructionStagesTable).values({
    companyId: req.scopedCompanyId!, projectId: parsedProjectId, name, description, status: status || "planned",
    startDate: startDate || null, plannedEndDate: plannedEndDate || null,
    budgetAmount: budgetAmount ? String(budgetAmount) : null,
    sortOrder: nextSortOrder,
    parentStageId: parsedParentId,
  }).returning();
  res.status(201).json(row);
});

router.patch("/stages/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, description, status, progress, startDate, plannedEndDate, actualEndDate, budgetAmount, sortOrder, parentStageId } = req.body;
  const [row] = await db.update(constructionStagesTable)
    .set({ name, description, status, progress, startDate, plannedEndDate, actualEndDate,
      budgetAmount: budgetAmount ? String(budgetAmount) : null, sortOrder,
      parentStageId: parentStageId ? parseInt(String(parentStageId), 10) : null })
    .where(and(eq(constructionStagesTable.id, id), eq(constructionStagesTable.companyId, req.scopedCompanyId!)))
    .returning();
  res.json(row);
});

router.post("/stages/reorder", async (req: AuthenticatedRequest, res): Promise<void> => {
  const body = req.body as {
    projectId?: number;
    stageIds?: number[];
    items?: { id: number; parentStageId?: number | null }[];
  };
  const { projectId, stageIds, items } = body;
  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }
  const parsedProjectId = parseInt(String(projectId), 10);
  const orderedItems = Array.isArray(items) && items.length > 0
    ? items
    : Array.isArray(stageIds) && stageIds.length > 0
      ? stageIds.map((id) => ({ id: parseInt(String(id), 10), parentStageId: undefined as number | null | undefined }))
      : null;
  if (!orderedItems) {
    res.status(400).json({ error: "items или stageIds обязательны" });
    return;
  }

  await Promise.all(
    orderedItems.map((item, index) =>
      db.update(constructionStagesTable)
        .set({
          sortOrder: (index + 1) * 10,
          ...(item.parentStageId !== undefined
            ? { parentStageId: item.parentStageId != null ? parseInt(String(item.parentStageId), 10) : null }
            : {}),
        })
        .where(and(
          eq(constructionStagesTable.id, parseInt(String(item.id), 10)),
          eq(constructionStagesTable.companyId, req.scopedCompanyId!),
          eq(constructionStagesTable.projectId, parsedProjectId),
        )),
    ),
  );
  res.json({ ok: true });
});

router.delete("/stages/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionStagesTable).where(and(eq(constructionStagesTable.id, id), eq(constructionStagesTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── TASKS ─────────────────────────────────────────────────────────────────────

router.get("/tasks", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, stageId } = req.query;
  const rows = await db.select().from(constructionTasksTable)
    .where(and(
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionTasksTable.projectId, parseInt(projectId as string))] : []),
      ...(stageId ? [eq(constructionTasksTable.stageId, parseInt(stageId as string))] : [])
    ))
    .orderBy(desc(constructionTasksTable.createdAt));
  res.json(rows);
});

// GET /tasks/:id — одиночная задача (для чата задачи)
router.get("/tasks/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const [row] = await db.select().from(constructionTasksTable)
    .where(and(
      eq(constructionTasksTable.id, id),
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
    ));
  if (!row) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  res.json(row);
});

router.post("/tasks", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, stageId, title, description, status, priority, dueDate, estimatedHours, assignedTo } = req.body;
  const assignedToId = assignedTo ? parseInt(assignedTo) : null;
  const [row] = await db.insert(constructionTasksTable).values({
    companyId: req.scopedCompanyId!, projectId, stageId: stageId || null, title, description,
    status: status || "todo", priority: priority || "medium",
    dueDate: dueDate || null,
    estimatedHours: estimatedHours ? String(estimatedHours) : null,
    assignedTo: assignedToId,
    createdBy: req.userId ?? null,
  }).returning();

  // Автоматический комментарий-системное сообщение о создании задачи
  if (row.id) {
    await db.insert(taskCommentsTable).values({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      userId: req.userId!,
      content: `Задача создана: «${title}»`,
      commentType: "status_change",
    }).catch(() => {});

    // Уведомление + email исполнителю (если назначен и это не сам автор)
    if (assignedToId && assignedToId !== req.userId) {
      void notifyTaskAssigned({
        companyId: req.scopedCompanyId!,
        taskId: row.id,
        assignedToId,
        assignerId: req.userId!,
        title,
        description,
        priority: row.priority,
        dueDate: row.dueDate,
        origin: req.headers.origin as string | undefined,
      });
    }
  }

  res.status(201).json(row);
});

router.patch("/tasks/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { title, description, status, priority, dueDate, estimatedHours, actualHours, completedAt, assignedTo } = req.body;

  // Текущая задача (для сравнения assignedTo)
  const [prev] = await db.select()
    .from(constructionTasksTable)
    .where(and(eq(constructionTasksTable.id, id), eq(constructionTasksTable.companyId, req.scopedCompanyId!)));

  const newAssignedTo = assignedTo !== undefined ? (assignedTo ? parseInt(assignedTo) : null) : undefined;

  const [row] = await db.update(constructionTasksTable)
    .set({ title, description, status, priority, dueDate, completedAt,
      estimatedHours: estimatedHours ? String(estimatedHours) : null,
      actualHours: actualHours ? String(actualHours) : null,
      assignedTo: newAssignedTo })
    .where(and(eq(constructionTasksTable.id, id), eq(constructionTasksTable.companyId, req.scopedCompanyId!)))
    .returning();

  // Если назначение изменилось — уведомить нового исполнителя
  if (
    row && newAssignedTo !== undefined && newAssignedTo !== null &&
    newAssignedTo !== prev?.assignedTo && newAssignedTo !== req.userId
  ) {
    void notifyTaskAssigned({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      assignedToId: newAssignedTo,
      assignerId: req.userId!,
      title: row.title,
      description: row.description,
      priority: row.priority,
      dueDate: row.dueDate,
      origin: req.headers.origin as string | undefined,
    });
  }

  res.json(row);
});

// Уведомление + email исполнителю при назначении задачи
async function notifyTaskAssigned(params: {
  companyId: number;
  taskId: number;
  assignedToId: number;
  assignerId: number;
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: string | null;
  origin?: string;
}): Promise<void> {
  const { companyId, taskId, assignedToId, assignerId, title, description, priority, dueDate, origin } = params;
  try {
    // 1) Push-уведомление в системе
    await db.insert(notificationsTable).values({
      companyId,
      userId: assignedToId,
      fromUserId: assignerId,
      type: "task_assigned",
      title: `Новая задача: ${title}`,
      body: description || null,
      message: description || null,
      icon: "clipboard-list",
      color: "amber",
      link: `/construction/tasks/${taskId}`,
      metadata: JSON.stringify({ taskId, priority }),
    } as any);

    // 2) Email — если у получателя есть email
    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, assignedToId));
    const [assigner] = await db.select().from(usersTable).where(eq(usersTable.id, assignerId));
    if (recipient?.email) {
      const baseOrigin = origin || "https://proptech-sigma-eight.vercel.app";
      const taskUrl = `${baseOrigin}/construction/tasks/${taskId}`;
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}`.trim() : "Коллега";
      // Fire-and-forget: не блокируем создание задачи на отправке email.
      // Email — информационный, неуспех не должен валить основной запрос.
      void sendTaskAssignedEmail({
        email: recipient.email,
        recipientFirstName: recipient.firstName,
        taskTitle: title,
        taskDescription: description,
        assignerName,
        dueDate,
        priority,
        taskUrl,
      }).catch(() => {});
    }
  } catch {
    // не валим основной запрос, если уведомление не отправилось
  }
}

router.delete("/tasks/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionTasksTable).where(and(eq(constructionTasksTable.id, id), eq(constructionTasksTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── WORKERS ───────────────────────────────────────────────────────────────────

router.get("/workers", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(constructionWorkersTable)
    .where(eq(constructionWorkersTable.companyId, req.scopedCompanyId!))
    .orderBy(desc(constructionWorkersTable.createdAt));
  res.json(rows);
});

router.post("/workers", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { fullName, brigade, specialization, phone, dailyRate, currency, status, projectId, notes } = req.body;
  const [row] = await db.insert(constructionWorkersTable).values({
    companyId: req.scopedCompanyId!, fullName, brigade, specialization, phone,
    dailyRate: dailyRate ? String(dailyRate) : null,
    currency: currency || "KGS", status: status || "active",
    projectId: projectId || null, notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/workers/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { fullName, brigade, specialization, phone, dailyRate, currency, status, projectId, notes } = req.body;
  const [row] = await db.update(constructionWorkersTable)
    .set({ fullName, brigade, specialization, phone, dailyRate: dailyRate ? String(dailyRate) : null, currency, status, projectId: projectId || null, notes })
    .where(and(eq(constructionWorkersTable.id, id), eq(constructionWorkersTable.companyId, req.scopedCompanyId!)))
    .returning();
  res.json(row);
});

router.delete("/workers/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionWorkersTable).where(and(eq(constructionWorkersTable.id, id), eq(constructionWorkersTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── CONTRACTORS ───────────────────────────────────────────────────────────────

router.get("/contractors", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(constructionContractorsTable)
    .where(eq(constructionContractorsTable.companyId, req.scopedCompanyId!))
    .orderBy(desc(constructionContractorsTable.createdAt));
  res.json(rows.map(mapContractorResponse));
});

router.post("/contractors", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { fullName, type, specialization, phone, email, inn, contractNumber, contractAmount, currency, status, rating, notes, okpo, bic, stageId, paymentMilestones, paidAmount, documentPath, counterpartyId } = req.body;
  const companyId = req.scopedCompanyId!;

  // Создаём/находим контрагента с ролью service_provider (Контроль строительства — только услуги)
  const cpId = await ensureCounterpartyWithRole({
    companyId,
    role: "service_provider",
    fullName,
    type: (type as "individual" | "company") || "company",
    iin: inn,
    phone,
    email,
    existingId: counterpartyId ?? null,
  });

  const [row] = await db.insert(constructionContractorsTable).values({
    companyId, counterpartyId: cpId,
    fullName, type: type || "company", specialization, phone, email, inn,
    contractNumber, contractAmount: contractAmount ? String(contractAmount) : null,
    currency: currency || "KGS", status: status || "active",
    rating: rating ? parseInt(rating) : null, notes,
    okpo: okpo || null, bic: bic || null,
    stageId: stageId ? parseInt(stageId) : null,
    paymentMilestones: paymentMilestones || null,
    paidAmount: paidAmount ? String(paidAmount) : "0",
    documentPath: documentPath || null,
  }).returning();
  res.status(201).json(mapContractorResponse(row));
});

router.patch("/contractors/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { fullName, type, specialization, phone, email, inn, contractNumber, contractAmount, currency, status, rating, notes, okpo, bic, stageId, paymentMilestones, paidAmount, documentPath } = req.body;
  const [row] = await db.update(constructionContractorsTable)
    .set({ fullName, type, specialization, phone, email, inn, contractNumber,
      contractAmount: contractAmount ? String(contractAmount) : null, currency, status,
      rating: rating ? parseInt(rating) : null, notes,
      okpo: okpo || null, bic: bic || null,
      stageId: stageId ? parseInt(stageId) : null,
      paymentMilestones: paymentMilestones || null,
      paidAmount: paidAmount !== undefined ? String(paidAmount) : undefined,
      documentPath: documentPath || null })
    .where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Подрядчик не найден" });
    return;
  }
  res.json(mapContractorResponse(row));
});

router.post("/contractors/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const built = buildContractDocumentMeta(req.body);
  if (built.error) {
    res.status(400).json({ error: built.error });
    return;
  }
  const [row] = await db.update(constructionContractorsTable)
    .set({ contractDocumentMeta: built.meta! })
    .where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Подрядчик не найден" });
    return;
  }
  res.json({ ok: true, contractDocument: built.summary });
});

router.get("/contractors/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.select().from(constructionContractorsTable)
    .where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)));
  if (!row) {
    res.status(404).json({ error: "Подрядчик не найден" });
    return;
  }
  const doc = parseContractDocumentMeta(row.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" });
    return;
  }
  res.json(doc);
});

router.delete("/contractors/:id/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.update(constructionContractorsTable)
    .set({ contractDocumentMeta: null })
    .where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Подрядчик не найден" });
    return;
  }
  res.json({ ok: true });
});

router.get("/contractors/:id/reconciliation", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)));
  if (!contractor) {
    res.status(404).json({ error: "Подрядчик не найден" });
    return;
  }

  const payments = await db.select({
    date: constructionExpensesTable.date,
    description: constructionExpensesTable.description,
    amount: constructionExpensesTable.amount,
    currency: constructionExpensesTable.currency,
    status: constructionExpensesTable.status,
  })
    .from(constructionExpensesTable)
    .where(and(
      eq(constructionExpensesTable.contractorId, id),
      eq(constructionExpensesTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(constructionExpensesTable.date));

  res.json({
    contractor: mapContractorResponse(contractor),
    reconciliation: buildContractorReconciliation(contractor, payments),
  });
});

router.delete("/contractors/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionContractorsTable).where(and(eq(constructionContractorsTable.id, id), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

const DEFAULT_CONTRACTOR_SPECIALIZATIONS = [
  "Монолит",
  "Кирпичная кладка",
  "Кровля",
  "Электромонтаж",
  "Сантехника",
  "Отделочные работы",
  "Фасадные работы",
  "Металлоконструкции",
  "Генподряд",
  "Дорожные работы",
  "Благоустройство",
];

async function ensureDefaultContractorSpecializations(companyId: number): Promise<void> {
  const existing = await db.select({ id: constructionContractorSpecializationsTable.id })
    .from(constructionContractorSpecializationsTable)
    .where(eq(constructionContractorSpecializationsTable.companyId, companyId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(constructionContractorSpecializationsTable).values(
    DEFAULT_CONTRACTOR_SPECIALIZATIONS.map((name, index) => ({
      companyId,
      name,
      sortOrder: index,
    })),
  );
}

router.get("/contractors/specializations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  await ensureDefaultContractorSpecializations(companyId);
  const rows = await db.select()
    .from(constructionContractorSpecializationsTable)
    .where(eq(constructionContractorSpecializationsTable.companyId, companyId))
    .orderBy(asc(constructionContractorSpecializationsTable.sortOrder), asc(constructionContractorSpecializationsTable.name));
  res.json(rows);
});

router.post("/contractors/specializations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const name = String(req.body.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Укажите название специализации" });
    return;
  }
  const companyId = req.scopedCompanyId!;
  const existing = await db.select()
    .from(constructionContractorSpecializationsTable)
    .where(and(
      eq(constructionContractorSpecializationsTable.companyId, companyId),
      eq(constructionContractorSpecializationsTable.name, name),
    ));
  if (existing.length > 0) {
    res.status(409).json({ error: "Такая специализация уже есть" });
    return;
  }
  const [maxOrder] = await db.select({
    max: sql<number>`coalesce(max(${constructionContractorSpecializationsTable.sortOrder}), -1)`,
  }).from(constructionContractorSpecializationsTable)
    .where(eq(constructionContractorSpecializationsTable.companyId, companyId));
  const [row] = await db.insert(constructionContractorSpecializationsTable).values({
    companyId,
    name,
    sortOrder: (maxOrder?.max ?? -1) + 1,
  }).returning();
  res.status(201).json(row);
});

router.delete("/contractors/specializations/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionContractorSpecializationsTable)
    .where(and(
      eq(constructionContractorSpecializationsTable.id, id),
      eq(constructionContractorSpecializationsTable.companyId, req.scopedCompanyId!),
    ));
  res.json({ ok: true });
});

router.post("/projects/:id/contract-template", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { fileName, dataBase64, label } = req.body;
  if (!fileName || !dataBase64) {
    res.status(400).json({ error: "Загрузите файл шаблона (.docx)" });
    return;
  }
  if (!String(fileName).toLowerCase().endsWith(".docx")) {
    res.status(400).json({ error: "Шаблон должен быть в формате .docx" });
    return;
  }
  const buf = Buffer.from(String(dataBase64), "base64");
  if (buf.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: "Файл шаблона не должен превышать 5 МБ" });
    return;
  }

  const meta = JSON.stringify({
    fileName: String(fileName),
    label: label ? String(label) : String(fileName),
    dataBase64: String(dataBase64),
    uploadedAt: new Date().toISOString(),
  });

  const [row] = await db.update(constructionProjectsTable)
    .set({ contractTemplateMeta: meta })
    .where(and(eq(constructionProjectsTable.id, id), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);
  cache.delete(cacheKeys.project(id));
  res.json({
    ok: true,
    contractTemplateMeta: {
      fileName: String(fileName),
      label: label ? String(label) : String(fileName),
      uploadedAt: JSON.parse(meta).uploadedAt,
    },
  });
});

router.delete("/projects/:id/contract-template", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.update(constructionProjectsTable)
    .set({ contractTemplateMeta: null })
    .where(and(eq(constructionProjectsTable.id, id), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);
  cache.delete(cacheKeys.project(id));
  res.json({ ok: true });
});

// ── MATERIALS ─────────────────────────────────────────────────────────────────

router.get("/materials", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  const rows = await db.select().from(constructionMaterialsTable)
    .where(and(
      eq(constructionMaterialsTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionMaterialsTable.projectId, parseInt(projectId as string))] : [])
    ))
    .orderBy(desc(constructionMaterialsTable.createdAt));
  res.json(rows);
});

router.post("/materials", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, name, category, unit, quantity, unitPrice, currency, supplierId, status, notes } = req.body;
  const qty = parseFloat(quantity || "0");
  const price = parseFloat(unitPrice || "0");
  const total = qty * price;
  const [row] = await db.insert(constructionMaterialsTable).values({
    companyId: req.scopedCompanyId!, projectId: projectId || null, name, category, unit: unit || "шт",
    quantity: String(qty), unitPrice: String(price), totalPrice: String(total),
    currency: currency || "KGS", supplierId: supplierId || null, status: status || "planned", notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/materials/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, category, unit, quantity, unitPrice, currency, status, deliveredAt, notes } = req.body;
  const qty = parseFloat(quantity || "0");
  const price = parseFloat(unitPrice || "0");
  const [row] = await db.update(constructionMaterialsTable)
    .set({ name, category, unit, quantity: String(qty), unitPrice: String(price),
      totalPrice: String(qty * price), currency, status, deliveredAt: deliveredAt || null, notes })
    .where(and(eq(constructionMaterialsTable.id, id), eq(constructionMaterialsTable.companyId, req.scopedCompanyId!)))
    .returning();
  res.json(row);
});

router.delete("/materials/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionMaterialsTable).where(and(eq(constructionMaterialsTable.id, id), eq(constructionMaterialsTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── BUDGET ────────────────────────────────────────────────────────────────────

router.get("/budget", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  const rows = await db.select().from(constructionBudgetItemsTable)
    .where(and(
      eq(constructionBudgetItemsTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionBudgetItemsTable.projectId, parseInt(projectId as string))] : [])
    ))
    .orderBy(constructionBudgetItemsTable.category, constructionBudgetItemsTable.createdAt);
  res.json(rows);
});

router.post("/budget", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, stageId, category, name, plannedAmount, currency, exchangeRateSource, exchangeRate, notes } = req.body;
  const [row] = await db.insert(constructionBudgetItemsTable).values({
    companyId: req.scopedCompanyId!, projectId, stageId: stageId || null,
    category, name, plannedAmount: String(plannedAmount || 0),
    currency: currency || "KGS", exchangeRateSource: exchangeRateSource || "nbkr",
    exchangeRate: String(exchangeRate || 1), notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/budget/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { category, name, plannedAmount, actualAmount, currency, exchangeRateSource, exchangeRate, notes } = req.body;
  const [row] = await db.update(constructionBudgetItemsTable)
    .set({ category, name, plannedAmount: String(plannedAmount || 0),
      actualAmount: actualAmount ? String(actualAmount) : undefined,
      currency, exchangeRateSource, exchangeRate: String(exchangeRate || 1), notes })
    .where(and(eq(constructionBudgetItemsTable.id, id), eq(constructionBudgetItemsTable.companyId, req.scopedCompanyId!)))
    .returning();
  res.json(row);
});

router.delete("/budget/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionBudgetItemsTable).where(and(eq(constructionBudgetItemsTable.id, id), eq(constructionBudgetItemsTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── EXPENSES ──────────────────────────────────────────────────────────────────

router.get("/expenses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  const rows = await db.select({
    id: constructionExpensesTable.id,
    companyId: constructionExpensesTable.companyId,
    projectId: constructionExpensesTable.projectId,
    stageId: constructionExpensesTable.stageId,
    category: constructionExpensesTable.category,
    description: constructionExpensesTable.description,
    amount: constructionExpensesTable.amount,
    currency: constructionExpensesTable.currency,
    exchangeRateSource: constructionExpensesTable.exchangeRateSource,
    exchangeRate: constructionExpensesTable.exchangeRate,
    amountKgs: constructionExpensesTable.amountKgs,
    contractorId: constructionExpensesTable.contractorId,
    date: constructionExpensesTable.date,
    paymentMethod: constructionExpensesTable.paymentMethod,
    status: constructionExpensesTable.status,
    notes: constructionExpensesTable.notes,
    createdAt: constructionExpensesTable.createdAt,
    contractorName: constructionContractorsTable.fullName,
    projectName: constructionProjectsTable.name,
  })
    .from(constructionExpensesTable)
    .leftJoin(constructionContractorsTable, eq(constructionExpensesTable.contractorId, constructionContractorsTable.id))
    .leftJoin(constructionProjectsTable, eq(constructionExpensesTable.projectId, constructionProjectsTable.id))
    .where(and(
      eq(constructionExpensesTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionExpensesTable.projectId, parseInt(projectId as string))] : [])
    ))
    .orderBy(desc(constructionExpensesTable.date));
  res.json(rows);
});

router.post("/expenses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, stageId, budgetItemId, category, description, amount, currency, exchangeRateSource, exchangeRate, contractorId, date, paymentMethod, notes } = req.body;
  const amt = parseFloat(amount || "0");
  const rate = parseFloat(exchangeRate || "1");
  const amtKgs = currency === "KGS" ? amt : amt * rate;
  const [row] = await db.insert(constructionExpensesTable).values({
    companyId: req.scopedCompanyId!, projectId, stageId: stageId || null,
    budgetItemId: budgetItemId || null, category, description,
    amount: String(amt), currency: currency || "KGS",
    exchangeRateSource: exchangeRateSource || "nbkr",
    exchangeRate: String(rate), amountKgs: String(amtKgs),
    contractorId: contractorId || null,
    date: date || new Date().toISOString().split("T")[0],
    paymentMethod: paymentMethod || "cash",
    status: "approved", notes,
  }).returning();
  res.status(201).json(row);
});

router.delete("/expenses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionExpensesTable).where(and(eq(constructionExpensesTable.id, id), eq(constructionExpensesTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── CHESS UNITS ───────────────────────────────────────────────────────────────

router.get("/units", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  const rows = await db.select().from(constructionUnitsTable)
    .where(and(
      eq(constructionUnitsTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionUnitsTable.projectId, parseInt(projectId as string))] : [])
    ))
    .orderBy(constructionUnitsTable.floor, constructionUnitsTable.unitNumber);
  res.json(rows);
});

router.post("/units", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, unitNumber, floor, block, unitType, roomCount, area, pricePerSqm, currency, status, notes } = req.body;
  const a = parseFloat(area || "0");
  const pps = parseFloat(pricePerSqm || "0");
  const [row] = await db.insert(constructionUnitsTable).values({
    companyId: req.scopedCompanyId!, projectId, unitNumber, floor: floor ? parseInt(floor) : null,
    block, unitType: unitType || "apartment", roomCount: roomCount ? parseInt(roomCount) : null,
    area: a > 0 ? String(a) : null, pricePerSqm: pps > 0 ? String(pps) : null,
    totalPrice: a > 0 && pps > 0 ? String(a * pps) : null,
    currency: currency || "KGS", status: status || "available", notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/units/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { unitNumber, floor, block, unitType, roomCount, area, pricePerSqm, currency, status, buyerId, contractDate, notes } = req.body;
  const a = parseFloat(area || "0");
  const pps = parseFloat(pricePerSqm || "0");
  const [row] = await db.update(constructionUnitsTable)
    .set({
      unitNumber, floor: floor ? parseInt(floor) : null, block,
      unitType, roomCount: roomCount ? parseInt(roomCount) : null,
      area: a > 0 ? String(a) : null, pricePerSqm: pps > 0 ? String(pps) : null,
      totalPrice: a > 0 && pps > 0 ? String(a * pps) : null,
      currency, status, buyerId: buyerId || null, contractDate: contractDate || null, notes,
    })
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, req.scopedCompanyId!)))
    .returning();
  res.json(row);
});

router.post("/units/bulk", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId, floors, unitsPerFloor, block, unitType, area, pricePerSqm, currency } = req.body;
  const a = parseFloat(area || "0");
  const pps = parseFloat(pricePerSqm || "0");
  const values: any[] = [];
  for (let f = 1; f <= parseInt(floors); f++) {
    for (let u = 1; u <= parseInt(unitsPerFloor); u++) {
      const unitNum = `${f}${String(u).padStart(2, "0")}`;
      values.push({
        companyId: req.scopedCompanyId!, projectId, unitNumber: unitNum,
        floor: f, block: block || null, unitType: unitType || "apartment",
        area: a > 0 ? String(a) : null,
        pricePerSqm: pps > 0 ? String(pps) : null,
        totalPrice: a > 0 && pps > 0 ? String(a * pps) : null,
        currency: currency || "KGS", status: "available",
      });
    }
  }
  const rows = await db.insert(constructionUnitsTable).values(values).returning();
  res.status(201).json(rows);
});

/** Квартиры + активный договор (покупатель, оплачено, остаток) для шахматки */
router.get("/units/overview", async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(String(req.query.projectId || ""), 10);
  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }
  const companyId = req.scopedCompanyId!;

  const [units, contracts] = await Promise.all([
    db.select().from(constructionUnitsTable).where(
      and(
        eq(constructionUnitsTable.companyId, companyId),
        eq(constructionUnitsTable.projectId, projectId),
      ),
    ).orderBy(constructionUnitsTable.floor, constructionUnitsTable.unitNumber),
    db.select().from(constructionSalesContractsTable).where(
      and(
        eq(constructionSalesContractsTable.companyId, companyId),
        eq(constructionSalesContractsTable.projectId, projectId),
      ),
    ).orderBy(desc(constructionSalesContractsTable.createdAt)),
  ]);

  const contractByUnit = new Map<number, typeof contracts[0]>();
  for (const c of contracts) {
    if (!c.unitId || c.status === "cancelled") continue;
    if (!contractByUnit.has(c.unitId)) contractByUnit.set(c.unitId, c);
  }

  res.json(
    units.map((u) => {
      const c = contractByUnit.get(u.id);
      return {
        ...u,
        contract: c
          ? {
              id: c.id,
              contractNumber: c.contractNumber,
              buyerName: c.buyerName,
              buyerPhone: c.buyerPhone,
              totalAmount: c.totalAmount,
              paidAmount: c.paidAmount,
              remainingAmount: c.remainingAmount,
              downPayment: c.downPayment,
              status: c.status,
              contractDate: c.contractDate,
              currency: c.currency,
            }
          : null,
      };
    }),
  );
});

/** Импорт квартир из Excel (JSON-строки) */
router.post("/units/import", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const projectId = parseInt(String(req.body.projectId || ""), 10);
  const rows: Record<string, unknown>[] = Array.isArray(req.body.rows) ? req.body.rows : [];

  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }
  if (rows.length === 0) {
    res.status(400).json({ error: "Нет строк для импорта" });
    return;
  }

  const existing = await db.select().from(constructionUnitsTable).where(
    and(
      eq(constructionUnitsTable.companyId, companyId),
      eq(constructionUnitsTable.projectId, projectId),
    ),
  );
  const byNumber = new Map(
    existing.map((u) => [String(u.unitNumber).trim().toLowerCase(), u]),
  );

  let created = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const unitNumber = String(row.unitNumber ?? row["Номер"] ?? "").trim();
    if (!unitNumber) {
      errors.push({ row: i + 2, message: "Не указан номер квартиры" });
      continue;
    }

    const floorRaw = row.floor ?? row["Этаж"];
    const block = String(row.block ?? row["Секция"] ?? "").trim() || null;
    const unitType = String(row.unitType ?? row["Тип"] ?? "apartment").trim() || "apartment";
    const roomCountRaw = row.roomCount ?? row["Комнат"];
    const area = parseFloat(String(row.area ?? row["Площадь м²"] ?? row["Площадь"] ?? "0"));
    const pricePerSqm = parseFloat(String(row.pricePerSqm ?? row["Цена за м²"] ?? "0"));
    const currency = String(row.currency ?? row["Валюта"] ?? "KGS").trim() || "KGS";
    const status = await resolveUnitStatus(
      companyId,
      String(row.status ?? row["Статус"] ?? "available"),
    );
    const notes = String(row.notes ?? row["Заметки"] ?? "").trim() || null;

    const payload = {
      unitNumber,
      floor: floorRaw != null && floorRaw !== "" ? parseInt(String(floorRaw), 10) : null,
      block,
      unitType,
      roomCount: roomCountRaw != null && roomCountRaw !== "" ? parseInt(String(roomCountRaw), 10) : null,
      area: area > 0 ? String(area) : null,
      pricePerSqm: pricePerSqm > 0 ? String(pricePerSqm) : null,
      totalPrice: area > 0 && pricePerSqm > 0 ? String(area * pricePerSqm) : null,
      currency,
      status,
      notes,
    };

    const key = unitNumber.toLowerCase();
    const prev = byNumber.get(key);
    try {
      if (prev) {
        await db.update(constructionUnitsTable)
          .set(payload)
          .where(and(eq(constructionUnitsTable.id, prev.id), eq(constructionUnitsTable.companyId, companyId)));
        updated++;
      } else {
        const [inserted] = await db.insert(constructionUnitsTable).values({
          companyId,
          projectId,
          ...payload,
        }).returning();
        byNumber.set(key, inserted);
        created++;
      }
    } catch (e) {
      errors.push({
        row: i + 2,
        message: e instanceof Error ? e.message : "Ошибка сохранения",
      });
    }
  }

  res.json({ created, updated, errors, total: rows.length });
});

// ── CURRENCY RATES ────────────────────────────────────────────────────────────

router.get("/currency-rates", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { date } = req.query;
  const today = (date as string) || new Date().toISOString().split("T")[0];
  const rows = await db.select().from(currencyRatesTable)
    .where(eq(currencyRatesTable.date, today))
    .orderBy(currencyRatesTable.currencyCode);
  res.json(rows);
});

router.post("/currency-rates", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { date, currencyCode, nbkrRate, optimaRate, rsbRate, bakaiRate, dobankRate, mBankRate } = req.body;
  const today = date || new Date().toISOString().split("T")[0];
  // Upsert: delete existing for same date+currency, then insert
  await db.delete(currencyRatesTable).where(
    and(eq(currencyRatesTable.date, today), eq(currencyRatesTable.currencyCode, currencyCode))
  );
  const [row] = await db.insert(currencyRatesTable).values({
    date: today, currencyCode,
    nbkrRate: nbkrRate ? String(nbkrRate) : null,
    optimaRate: optimaRate ? String(optimaRate) : null,
    rsbRate: rsbRate ? String(rsbRate) : null,
    bakaiRate: bakaiRate ? String(bakaiRate) : null,
    dobankRate: dobankRate ? String(dobankRate) : null,
    mBankRate: mBankRate ? String(mBankRate) : null,
  }).returning();
  res.status(201).json(row);
});

// ── PROJECT COST ANALYSIS ─────────────────────────────────────────────────────

router.get("/projects/:id/cost-analysis", async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.id as string);

  const [project] = await db.select().from(constructionProjectsTable)
    .where(and(eq(constructionProjectsTable.id, projectId), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Get all expenses for this project
  const expenses = await db.select().from(constructionExpensesTable)
    .where(and(eq(constructionExpensesTable.projectId, projectId), eq(constructionExpensesTable.companyId, req.scopedCompanyId!)));

  // Get all units for this project
  const units = await db.select().from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.projectId, projectId), eq(constructionUnitsTable.companyId, req.scopedCompanyId!)));

  // Calculate totals
  const totalArea = parseFloat(project.totalArea || "0");
  const totalBudget = parseFloat(project.totalBudget || "0");
  const plannedCostPerSqm = parseFloat(project.costPerSqm || "0");

  // Calculate spent amount
  const spentAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amountKgs || e.amount || "0"), 0);

  // Calculate actual cost per sqm
  const actualCostPerSqm = totalArea > 0 ? spentAmount / totalArea : 0;

  // Sales statistics
  const soldUnits = units.filter(u => u.status === "sold" || u.status === "registered");
  const reservedUnits = units.filter(u => u.status === "reserved");
  const availableUnits = units.filter(u => u.status === "available");

  const totalRevenue = soldUnits.reduce((sum, u) => sum + parseFloat(u.totalPrice || "0"), 0);
  const expectedRevenue = units.reduce((sum, u) => sum + parseFloat(u.totalPrice || "0"), 0);

  // Calculate profitability
  const profit = totalRevenue - spentAmount;
  const profitMargin = spentAmount > 0 ? (profit / spentAmount) * 100 : 0;
  const roi = totalBudget > 0 ? (profit / totalBudget) * 100 : 0;

  // Calculate progress
  const budgetProgress = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;
  const salesProgress = units.length > 0 ? (soldUnits.length / units.length) * 100 : 0;

  res.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      totalArea,
      totalBudget,
    },
    costs: {
      plannedCostPerSqm,
      actualCostPerSqm,
      costDeviation: plannedCostPerSqm > 0 ? ((actualCostPerSqm / plannedCostPerSqm - 1) * 100) : 0,
      totalBudget,
      spentAmount,
      remainingBudget: totalBudget - spentAmount,
      budgetProgress,
    },
    sales: {
      totalUnits: units.length,
      soldUnits: soldUnits.length,
      reservedUnits: reservedUnits.length,
      availableUnits: availableUnits.length,
      totalRevenue,
      expectedRevenue,
      salesProgress,
    },
    profitability: {
      profit,
      profitMargin,
      roi,
    },
  });
});

// ── UNIT STATUSES (шахматка) ───────────────────────────────────────────────────

router.get("/unit-statuses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await ensureUnitStatuses(req.scopedCompanyId!);
  res.json(rows);
});

router.post("/unit-statuses", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const label = String(req.body.label || "").trim();
  if (!label) {
    res.status(400).json({ error: "Укажите название статуса" });
    return;
  }

  const colorKey = String(req.body.colorKey || "slate");
  if (!(colorKey in UNIT_STATUS_COLOR_PRESETS)) {
    res.status(400).json({ error: "Недопустимый цвет" });
    return;
  }

  const saleMode = String(req.body.saleMode || "none");
  if (!["none", "reserved", "sold"].includes(saleMode)) {
    res.status(400).json({ error: "saleMode: none | reserved | sold" });
    return;
  }

  await ensureUnitStatuses(companyId);
  const existing = await db.select().from(constructionUnitStatusesTable)
    .where(eq(constructionUnitStatusesTable.companyId, companyId));

  let code = String(req.body.code || "").trim().toLowerCase() || slugifyStatusCode(label);
  const taken = new Set(existing.map((r) => r.code));
  let n = 1;
  const base = code;
  while (taken.has(code)) {
    code = `${base}_${++n}`;
  }

  const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), -1);

  const [row] = await db.insert(constructionUnitStatusesTable).values({
    companyId,
    code,
    label,
    colorKey,
    sortOrder: maxOrder + 1,
    isSystem: false,
    saleMode,
  }).returning();

  res.status(201).json(row);
});

router.patch("/unit-statuses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(String(req.params.id), 10);
  const [current] = await db.select().from(constructionUnitStatusesTable).where(
    and(eq(constructionUnitStatusesTable.id, id), eq(constructionUnitStatusesTable.companyId, companyId)),
  );
  if (!current) {
    res.status(404).json({ error: "Статус не найден" });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (req.body.label != null) {
    const label = String(req.body.label).trim();
    if (!label) {
      res.status(400).json({ error: "Пустое название" });
      return;
    }
    patch.label = label;
  }
  if (req.body.colorKey != null) {
    const colorKey = String(req.body.colorKey);
    if (!(colorKey in UNIT_STATUS_COLOR_PRESETS)) {
      res.status(400).json({ error: "Недопустимый цвет" });
      return;
    }
    patch.colorKey = colorKey as UnitStatusColorKey;
  }
  if (req.body.sortOrder != null) patch.sortOrder = parseInt(String(req.body.sortOrder), 10);
  if (req.body.saleMode != null) {
    const saleMode = String(req.body.saleMode);
    if (!["none", "reserved", "sold"].includes(saleMode)) {
      res.status(400).json({ error: "saleMode: none | reserved | sold" });
      return;
    }
    patch.saleMode = saleMode;
  }

  const [row] = await db.update(constructionUnitStatusesTable)
    .set(patch)
    .where(eq(constructionUnitStatusesTable.id, id))
    .returning();
  res.json(row);
});

router.delete("/unit-statuses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(String(req.params.id), 10);
  const [current] = await db.select().from(constructionUnitStatusesTable).where(
    and(eq(constructionUnitStatusesTable.id, id), eq(constructionUnitStatusesTable.companyId, companyId)),
  );
  if (!current) {
    res.status(404).json({ error: "Статус не найден" });
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.companyId, companyId),
        eq(constructionUnitsTable.status, current.code),
      ),
    );

  if (Number(count) > 0) {
    res.status(400).json({
      error: `Нельзя удалить: ${count} квартир(ы) с этим статусом`,
    });
    return;
  }

  await db.delete(constructionUnitStatusesTable).where(eq(constructionUnitStatusesTable.id, id));
  res.json({ ok: true });
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

router.get("/dashboard", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [projects, stages, tasks, expenses, budget, units] = await Promise.all([
    db.select().from(constructionProjectsTable).where(eq(constructionProjectsTable.companyId, req.scopedCompanyId!)),
    db.select().from(constructionStagesTable).where(eq(constructionStagesTable.companyId, req.scopedCompanyId!)),
    db.select().from(constructionTasksTable).where(eq(constructionTasksTable.companyId, req.scopedCompanyId!)),
    db.select().from(constructionExpensesTable).where(eq(constructionExpensesTable.companyId, req.scopedCompanyId!)),
    db.select().from(constructionBudgetItemsTable).where(eq(constructionBudgetItemsTable.companyId, req.scopedCompanyId!)),
    db.select().from(constructionUnitsTable).where(eq(constructionUnitsTable.companyId, req.scopedCompanyId!)),
  ]);

  const totalBudget = budget.reduce((s, b) => s + parseFloat(b.plannedAmount), 0);
  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amountKgs || e.amount), 0);
  const soldUnits = units.filter(u => u.status === "sold" || u.status === "reserved");
  const soldRevenue = soldUnits.reduce((s, u) => s + parseFloat(u.totalPrice || "0"), 0);

  res.json({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === "active").length,
    completedProjects: projects.filter(p => p.status === "completed").length,
    totalBudget,
    totalSpent,
    budgetRemaining: totalBudget - totalSpent,
    totalTasks: tasks.length,
    doneTasks: tasks.filter(t => t.status === "done").length,
    totalUnits: units.length,
    soldUnits: soldUnits.length,
    soldRevenue,
    projects: projects.slice(0, 5),
  });
});

// ── PTO: ИЗМЕНЕНИЕ ПЛОЩАДИ ПОМЕЩЕНИЯ ─────────────────────────────────────────

/** PATCH /units/:id/area — изменение площади от имени ПТО */
router.patch("/units/:id/area", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { area, reason, document } = req.body;
  const newArea = parseFloat(area);
  if (!newArea || newArea <= 0) {
    res.status(400).json({ error: "Укажите корректную площадь" });
    return;
  }
  const companyId = req.scopedCompanyId!;

  // Получаем текущую квартиру
  const [unit] = await db.select()
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, companyId)));

  if (!unit) { res.status(404).json({ error: "Помещение не найдено" }); return; }

  const oldArea = parseFloat(String(unit.area || "0"));
  const delta = newArea - oldArea;
  const pricePerSqm = parseFloat(String(unit.pricePerSqm || "0"));
  const newTotalPrice = pricePerSqm > 0 ? newArea * pricePerSqm : null;

  // Валидация документа: до 8 МБ в base64
  let docMeta: string | null = null;
  if (document && typeof document === "object" && document.base64) {
    if (String(document.base64).length > 12_000_000) {
      res.status(400).json({ error: "Файл слишком большой (макс. ~8 МБ)" });
      return;
    }
    docMeta = JSON.stringify({
      fileName: String(document.fileName || "document"),
      mimeType: String(document.mimeType || "application/pdf"),
      base64: String(document.base64),
      uploadedAt: new Date().toISOString(),
    });
  }

  // Обновляем помещение
  const [updated] = await db.update(constructionUnitsTable)
    .set({
      area: String(newArea),
      totalPrice: newTotalPrice ? String(newTotalPrice) : null,
      originalArea: unit.originalArea ?? String(oldArea),
      areaModified: true,
      areaModifiedBy: req.userId ?? null,
      areaModifiedAt: new Date(),
      areaDelta: String(delta),
      supplementStatus: "pending",
      ...(docMeta ? { areaChangeDocumentMeta: docMeta } : {}),
    })
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, companyId)))
    .returning();

  // Логируем изменение
  await db.insert(consolidatedLogsTable).values({
    companyId,
    module: "kontrol",
    operationType: "area_change",
    description: `Изменена площадь квартиры ${unit.unitNumber}: ${oldArea} → ${newArea} м² (Δ${delta > 0 ? "+" : ""}${delta.toFixed(2)})${reason ? `. ${reason}` : ""}`,
    sourceTable: "construction_units",
    sourceId: id,
    operationDate: new Date().toISOString().slice(0, 10),
  } as any);

  res.json({ ...updated, oldArea, delta });
});

/** POST /units/:id/supplement — создать доп. соглашение */
router.post("/units/:id/supplement", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { contractId, pricePerSqm } = req.body;
  const companyId = req.scopedCompanyId!;

  const [unit] = await db.select()
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, companyId)));

  if (!unit || !unit.areaModified) {
    res.status(400).json({ error: "Площадь не изменялась" });
    return;
  }

  const oldArea = parseFloat(String(unit.originalArea || "0"));
  const newArea = parseFloat(String(unit.area || "0"));
  const pps = parseFloat(String(pricePerSqm || unit.pricePerSqm || "0"));
  const balanceDelta = (newArea - oldArea) * pps;

  const [supplement] = await db.insert(constructionSupplementsTable).values({
    companyId,
    unitId: id,
    contractId: contractId ? parseInt(contractId) : null,
    oldArea: String(oldArea),
    newArea: String(newArea),
    pricePerSqm: String(pps),
    balanceDelta: String(balanceDelta),
    currency: unit.currency || "KGS",
    status: "draft",
  }).returning();

  // Обновить статус помещения
  await db.update(constructionUnitsTable)
    .set({ supplementStatus: "generated" })
    .where(eq(constructionUnitsTable.id, id));

  res.status(201).json(supplement);
});

/** GET /units/:id/supplements — список доп. соглашений по помещению */
router.get("/units/:id/supplements", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const rows = await db.select()
    .from(constructionSupplementsTable)
    .where(and(
      eq(constructionSupplementsTable.unitId, id),
      eq(constructionSupplementsTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(constructionSupplementsTable.createdAt));
  res.json(rows);
});

// ── TASK COMMENTS (ЧАТ) ──────────────────────────────────────────────────────

router.get("/tasks/:id/comments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string);
  const rows = await db.select()
    .from(taskCommentsTable)
    .where(and(
      eq(taskCommentsTable.taskId, taskId),
      eq(taskCommentsTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(asc(taskCommentsTable.createdAt));
  res.json(rows);
});

const ALLOWED_COMMENT_TYPES = ["message", "result", "return", "status_change"] as const;
const MAX_COMMENT_LENGTH = 4000;

router.post("/tasks/:id/comments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const { content, commentType } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Пустой комментарий" });
    return;
  }
  const trimmed = content.trim();
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    res.status(400).json({ error: `Комментарий слишком длинный (максимум ${MAX_COMMENT_LENGTH} символов)` });
    return;
  }
  const type = commentType || "message";
  if (!ALLOWED_COMMENT_TYPES.includes(type)) {
    res.status(400).json({ error: "Недопустимый тип комментария" });
    return;
  }
  // Только создатель может вернуть, только исполнитель может отправить result
  if (type === "return" || type === "result") {
    const [task] = await db.select()
      .from(constructionTasksTable)
      .where(and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, req.scopedCompanyId!),
      ));
    if (!task) {
      res.status(404).json({ error: "Задача не найдена" });
      return;
    }
    if (type === "return") {
      // Деректно отклоняем если автор null (legacy задачи) или не совпадает
      if (task.createdBy == null || task.createdBy !== req.userId) {
        res.status(403).json({ error: "Только создатель задачи может вернуть на доработку" });
        return;
      }
    }
    if (type === "result") {
      if (task.assignedTo == null || task.assignedTo !== req.userId) {
        res.status(403).json({ error: "Только исполнитель может отправить результат" });
        return;
      }
    }
  }

  const [comment] = await db.insert(taskCommentsTable).values({
    companyId: req.scopedCompanyId!,
    taskId,
    userId: req.userId!,
    content: trimmed,
    commentType: type,
  }).returning();

  // Изменение статуса задачи в зависимости от типа
  let nextStatus: string | null = null;
  if (type === "return") nextStatus = "todo";
  else if (type === "result") nextStatus = "review"; // на проверку создателю
  if (nextStatus) {
    await db.update(constructionTasksTable)
      .set({ status: nextStatus })
      .where(and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, req.scopedCompanyId!),
      ));
  }

  res.status(201).json(comment);
});

// ── CONSOLIDATED LOGS ─────────────────────────────────────────────────────────

router.get("/consolidated", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { module, counterpartyId, from, to, limit: lim = "100" } = req.query;

  const conditions: any[] = [eq(consolidatedLogsTable.companyId, companyId)];
  if (module) conditions.push(eq(consolidatedLogsTable.module, String(module)));
  if (counterpartyId) conditions.push(eq(consolidatedLogsTable.counterpartyId, parseInt(String(counterpartyId))));

  const rows = await db.select()
    .from(consolidatedLogsTable)
    .where(and(...conditions))
    .orderBy(desc(consolidatedLogsTable.createdAt))
    .limit(parseInt(String(lim), 10));

  res.json(rows);
});

export default router;
