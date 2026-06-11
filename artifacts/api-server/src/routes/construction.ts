import { Router } from "express";
import { eq, and, desc, sql, asc, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  constructionProjectsTable,
  constructionStagesTable,
  constructionTasksTable,
  constructionTaskAttachmentsTable,
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
  constructionTaskDependenciesTable,
  supplyRequestsTable,
  supplyRequestItemsTable,
} from "../lib/db";
import { sendTaskAssignedEmail } from "../lib/email";
import { logTaskActivity, taskFieldChanges } from "../lib/construction-task-work";
import { constructionSalesContractsTable } from "../lib/db";
import { ensureCounterpartyWithRole } from "../lib/counterparty-sync";
import { uploadFile } from "../lib/file-storage";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";
import { getPaginationParams, createPaginatedResponse, getPaginationQuery } from "../lib/pagination";
import { validateQuery, commonSchemas } from "../middleware/validation";
import { cache, cacheKeys } from "../lib/cache";
import { seedProjectUnits, syncProjectUnits } from "../lib/seed-project-units";
import { SALEABLE_UNIT_TYPES } from "../lib/unit-types";
import {
  constructionAccrualsTable,
  constructionOperationsTable,
} from "../lib/db";
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
import { resolveUnitType } from "../lib/unit-types";
import { UNIT_STATUS_COLOR_PRESETS, type UnitStatusColorKey } from "../lib/default-unit-statuses";
import {
  assertUnitStatusAllowed,
  approveUnitPrice,
  canEditUnitArea,
  canManagePricing,
  computeListPrice,
  enrichUnitPricing,
  isSalesRole,
  loadProjectForPricing,
  parseNum,
} from "../lib/unit-pricing";

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

/** Сводка для вкладки «ПРОГРЕСС» на странице проектов. */
router.get("/projects/progress-summary", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const today = new Date().toISOString().slice(0, 10);
  const saleableList = SALEABLE_UNIT_TYPES.map((t) => `'${t}'`).join(",");
  const soldStatuses = sql.raw(`'sold','registered'`);
  const activeContractStatuses = sql.raw(`'signed','completed','review'`);

  const projects = await db.select({
    id: constructionProjectsTable.id,
    name: constructionProjectsTable.name,
    totalSaleableArea: constructionProjectsTable.totalSaleableArea,
    totalConstructionArea: constructionProjectsTable.totalConstructionArea,
    totalArea: constructionProjectsTable.totalArea,
    costPerSqm: constructionProjectsTable.costPerSqm,
    totalBudget: constructionProjectsTable.totalBudget,
  })
    .from(constructionProjectsTable)
    .where(eq(constructionProjectsTable.companyId, companyId))
    .orderBy(desc(constructionProjectsTable.createdAt));

  const unitAgg = await db.select({
    projectId: constructionUnitsTable.projectId,
    totalConstructionArea: sql<string>`coalesce(sum(${constructionUnitsTable.area}::numeric), 0)`,
    totalSaleableArea: sql<string>`coalesce(sum(case when ${constructionUnitsTable.unitType} in (${sql.raw(saleableList)}) then ${constructionUnitsTable.area}::numeric else 0 end), 0)`,
    soldArea: sql<string>`coalesce(sum(case when ${constructionUnitsTable.status} in (${soldStatuses}) and ${constructionUnitsTable.unitType} in (${sql.raw(saleableList)}) then ${constructionUnitsTable.area}::numeric else 0 end), 0)`,
    soldRevenue: sql<string>`coalesce(sum(case when ${constructionUnitsTable.status} in (${soldStatuses}) then ${constructionUnitsTable.totalPrice}::numeric else 0 end), 0)`,
    futureSales: sql<string>`coalesce(sum(case when ${constructionUnitsTable.status} in ('available','reserved') and ${constructionUnitsTable.unitType} in (${sql.raw(saleableList)}) then ${constructionUnitsTable.totalPrice}::numeric else 0 end), 0)`,
  })
    .from(constructionUnitsTable)
    .where(eq(constructionUnitsTable.companyId, companyId))
    .groupBy(constructionUnitsTable.projectId);

  const contractAgg = await db.select({
    projectId: constructionSalesContractsTable.projectId,
    contracted: sql<string>`coalesce(sum(case when ${constructionSalesContractsTable.status} in (${activeContractStatuses}) then ${constructionSalesContractsTable.totalAmount}::numeric else 0 end), 0)`,
    collected: sql<string>`coalesce(sum(${constructionSalesContractsTable.paidAmount}::numeric), 0)`,
    remainder: sql<string>`coalesce(sum(${constructionSalesContractsTable.remainingAmount}::numeric), 0)`,
  })
    .from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, companyId))
    .groupBy(constructionSalesContractsTable.projectId);

  const spentAgg = await db.select({
    projectId: constructionOperationsTable.projectId,
    totalSpent: sql<string>`coalesce(sum(amount_kgs::numeric), 0)`,
  })
    .from(constructionOperationsTable)
    .where(and(
      eq(constructionOperationsTable.companyId, companyId),
      eq(constructionOperationsTable.type, "expense"),
      sql`project_id is not null`,
    ))
    .groupBy(constructionOperationsTable.projectId);

  const expenseRows = await db.select({
    projectId: constructionExpensesTable.projectId,
    category: constructionExpensesTable.category,
    amountKgs: constructionExpensesTable.amountKgs,
    amount: constructionExpensesTable.amount,
  })
    .from(constructionExpensesTable)
    .where(eq(constructionExpensesTable.companyId, companyId));

  const accrualRows = await db.select({
    projectId: constructionAccrualsTable.projectId,
    dueDate: constructionAccrualsTable.dueDate,
    remainingAmount: constructionAccrualsTable.remainingAmount,
    status: constructionAccrualsTable.status,
  })
    .from(constructionAccrualsTable)
    .where(eq(constructionAccrualsTable.companyId, companyId));

  const num = (v: unknown) => parseFloat(String(v ?? "0")) || 0;

  const unitByProject = new Map(unitAgg.map((r) => [Number(r.projectId), r]));
  const contractByProject = new Map(contractAgg.map((r) => [Number(r.projectId), r]));
  const spentByProject = new Map(spentAgg.map((r) => [Number(r.projectId), num(r.totalSpent)]));

  type ExpenseBuckets = { construction: number; land: number; documentation: number; other: number };
  const emptyExpenseBuckets = (): ExpenseBuckets => ({
    construction: 0,
    land: 0,
    documentation: 0,
    other: 0,
  });
  const expenseByProject = new Map<number, ExpenseBuckets>();
  const bucketExpense = (projectId: number, category: string, amount: number) => {
    const cat = String(category || "").toLowerCase();
    let bucket: keyof ExpenseBuckets;
    if (/земл|land/.test(cat)) bucket = "land";
    else if (/документ|проектир|разреш/.test(cat)) bucket = "documentation";
    else if (/прочее|other|misc/.test(cat)) bucket = "other";
    else bucket = "construction";
    const entry = expenseByProject.get(projectId) ?? emptyExpenseBuckets();
    entry[bucket] += amount;
    expenseByProject.set(projectId, entry);
  };

  for (const e of expenseRows) {
    const pid = Number(e.projectId);
    const amt = num(e.amountKgs ?? e.amount);
    if (amt <= 0) continue;
    bucketExpense(pid, e.category, amt);
  }

  const overdueByProject = new Map<number, number>();
  for (const a of accrualRows) {
    const pid = Number(a.projectId);
    if (!pid) continue;
    const remaining = num(a.remainingAmount);
    if (remaining <= 0) continue;
    const overdue = a.status === "overdue" || (a.dueDate && a.dueDate < today);
    if (!overdue) continue;
    overdueByProject.set(pid, (overdueByProject.get(pid) ?? 0) + remaining);
  }

  const rows = projects.map((p) => {
    const pid = Number(p.id);
    const units = unitByProject.get(pid);
    const contracts = contractByProject.get(pid);
    const spent = spentByProject.get(pid) ?? 0;
    const expenses = expenseByProject.get(pid) ?? emptyExpenseBuckets();

    const manualSaleable = num(p.totalSaleableArea);
    const manualConstruction = num(p.totalConstructionArea) || num(p.totalArea);
    const unitSaleable = num(units?.totalSaleableArea);
    const unitConstruction = num(units?.totalConstructionArea);
    const totalSaleableArea = manualSaleable > 0 ? manualSaleable : unitSaleable;
    const totalConstructionArea = manualConstruction > 0 ? manualConstruction : unitConstruction;
    const soldArea = num(units?.soldArea);
    const unsoldArea = Math.max(0, totalSaleableArea - soldArea);
    const nonSaleableArea = Math.max(0, totalConstructionArea - totalSaleableArea);

    const soldRevenue = num(units?.soldRevenue);
    const avgSalePricePerSqm = soldArea > 0 ? soldRevenue / soldArea : 0;

    const contracted = num(contracts?.contracted);
    const collected = num(contracts?.collected);
    const collectionsRemainder = num(contracts?.remainder);
    const futureSales = num(units?.futureSales);
    const totalRevenue = contracted > 0 ? contracted + futureSales : soldRevenue + futureSales;

    const grossProfit = totalRevenue - spent;
    const marginPerSqm = soldArea > 0 ? grossProfit / soldArea : 0;
    const overdueDebt = overdueByProject.get(pid) ?? 0;
    const pdPercent = contracted > 0 ? (overdueDebt / contracted) * 100 : 0;

    const approvedCostPerSqm = num(p.costPerSqm);
    const actualCostPerSqm = totalConstructionArea > 0 ? spent / totalConstructionArea : 0;
    const projectBudget = num(p.totalBudget);
    const requiredAmount = Math.max(0, projectBudget - spent);

    return {
      projectId: pid,
      projectName: p.name,
      totalSaleableArea,
      nonSaleableArea,
      soldArea,
      unsoldArea,
      avgSalePricePerSqm,
      contracted,
      collected,
      collectionsRemainder,
      futureSales,
      totalRevenue,
      grossProfit,
      marginPerSqm,
      overdueDebt,
      pdPercent,
      approvedCostPerSqm,
      actualCostPerSqm,
      currentCostPerSqm: actualCostPerSqm,
      constructionCosts: expenses.construction,
      landCosts: expenses.land,
      documentationCosts: expenses.documentation,
      otherCosts: expenses.other,
      requiredAmount,
      projectBudget,
      totalSpent: spent,
    };
  });

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
    totalConstructionArea: body.totalConstructionArea ? String(parseFloat(body.totalConstructionArea)) : null,
    totalSaleableArea: body.totalSaleableArea ? String(parseFloat(body.totalSaleableArea)) : null,
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
      totalConstructionArea: body.totalConstructionArea ? String(parseFloat(body.totalConstructionArea)) : null,
      totalSaleableArea: body.totalSaleableArea ? String(parseFloat(body.totalSaleableArea)) : null,
      costPerSqm: body.costPerSqm ? String(costPerSqm) : null,
      baseSalePricePerSqm:
        body.baseSalePricePerSqm != null && body.baseSalePricePerSqm !== ""
          ? String(parseFloat(body.baseSalePricePerSqm))
          : undefined,
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
  let unitsRemoved = 0;
  let unitsSkipped = 0;
  if (row.totalFloors && row.totalUnits) {
    const sync = await syncProjectUnits(
      req.scopedCompanyId!,
      row.id,
      row.totalFloors,
      row.totalUnits,
    );
    unitsCreated = sync.created;
    unitsRemoved = sync.removed;
    unitsSkipped = sync.skipped;
  }

  // Invalidate cache
  cache.deletePattern(`projects:${req.scopedCompanyId!}:*`);
  cache.delete(cacheKeys.project(id));

  res.json({ ...row, unitsCreated, unitsRemoved, unitsSkipped });
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

  const parentById = new Map<number, number | null>();
  for (const item of orderedItems) {
    const id = parseInt(String(item.id), 10);
    const parent =
      item.parentStageId !== undefined
        ? item.parentStageId != null
          ? parseInt(String(item.parentStageId), 10)
          : null
        : undefined;
    if (parent !== undefined) parentById.set(id, parent);
  }
  for (const [id, parentId] of parentById) {
    if (parentId == null) continue;
    const seen = new Set<number>([id]);
    let cursor: number | null = parentId;
    while (cursor != null) {
      if (seen.has(cursor)) {
        res.status(400).json({ error: "Недопустимая иерархия: циклический родитель" });
        return;
      }
      seen.add(cursor);
      cursor = parentById.get(cursor) ?? null;
    }
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
  const { projectId, stageId, fromDate, toDate } = req.query;
  const dateFilter =
    fromDate && toDate
      ? sql`(
          ${constructionTasksTable.createdAt}::date BETWEEN ${String(fromDate)}::date AND ${String(toDate)}::date
          OR (${constructionTasksTable.dueDate} IS NOT NULL AND ${constructionTasksTable.dueDate}::date BETWEEN ${String(fromDate)}::date AND ${String(toDate)}::date)
          OR (${constructionTasksTable.plannedEndDate} IS NOT NULL AND ${constructionTasksTable.plannedEndDate}::date BETWEEN ${String(fromDate)}::date AND ${String(toDate)}::date)
          OR (${constructionTasksTable.plannedStartDate} IS NOT NULL AND ${constructionTasksTable.plannedStartDate}::date BETWEEN ${String(fromDate)}::date AND ${String(toDate)}::date)
        )`
      : undefined;
  const rows = await db.select().from(constructionTasksTable)
    .where(and(
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionTasksTable.projectId, parseInt(projectId as string))] : []),
      ...(stageId ? [eq(constructionTasksTable.stageId, parseInt(stageId as string))] : []),
      ...(dateFilter ? [dateFilter] : []),
    ))
    .orderBy(desc(constructionTasksTable.createdAt));
  const taskIds = rows.map((r) => r.id);
  if (taskIds.length === 0) {
    res.json(rows);
    return;
  }

  const [commentCounts, attachmentCounts, blockedByCounts] = await Promise.all([
    db
      .select({
        taskId: taskCommentsTable.taskId,
        count: sql<number>`count(*)::int`,
      })
      .from(taskCommentsTable)
      .where(and(
        eq(taskCommentsTable.companyId, req.scopedCompanyId!),
        inArray(taskCommentsTable.taskId, taskIds),
      ))
      .groupBy(taskCommentsTable.taskId),
    db
      .select({
        taskId: constructionTaskAttachmentsTable.taskId,
        count: sql<number>`count(*)::int`,
      })
      .from(constructionTaskAttachmentsTable)
      .where(and(
        eq(constructionTaskAttachmentsTable.companyId, req.scopedCompanyId!),
        inArray(constructionTaskAttachmentsTable.taskId, taskIds),
      ))
      .groupBy(constructionTaskAttachmentsTable.taskId),
    db
      .select({
        taskId: constructionTaskDependenciesTable.successorTaskId,
        count: sql<number>`count(*)::int`,
      })
      .from(constructionTaskDependenciesTable)
      .where(and(
        eq(constructionTaskDependenciesTable.companyId, req.scopedCompanyId!),
        inArray(constructionTaskDependenciesTable.successorTaskId, taskIds),
      ))
      .groupBy(constructionTaskDependenciesTable.successorTaskId),
  ]);

  const commentMap = Object.fromEntries(commentCounts.map((c) => [c.taskId, Number(c.count || 0)]));
  const attachmentMap = Object.fromEntries(attachmentCounts.map((c) => [c.taskId, Number(c.count || 0)]));
  const blockedByMap = Object.fromEntries(blockedByCounts.map((c) => [c.taskId, Number(c.count || 0)]));
  const stageRows = rows.filter((row) => row.stageId != null);
  const stageProgressMap = new Map<number, number>();
  if (stageRows.length > 0) {
    const byStage = new Map<number, number[]>();
    for (const row of stageRows) {
      const sid = Number(row.stageId);
      const arr = byStage.get(sid) ?? [];
      arr.push(Number(row.progressPercent ?? 0));
      byStage.set(sid, arr);
    }
    for (const [sid, list] of byStage.entries()) {
      const avg = list.reduce((sum, value) => sum + value, 0) / Math.max(list.length, 1);
      stageProgressMap.set(sid, Math.round(avg));
    }
  }

  res.json(
    rows.map((row) => ({
      ...row,
      commentCount: commentMap[row.id] ?? 0,
      attachmentCount: attachmentMap[row.id] ?? 0,
      blockedByCount: blockedByMap[row.id] ?? 0,
      stageProgressPercent: row.stageId != null ? (stageProgressMap.get(Number(row.stageId)) ?? 0) : 0,
    })),
  );
});

router.get("/tasks/dependencies", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { projectId } = req.query;
  const rows = await db
    .select({
      id: constructionTaskDependenciesTable.id,
      predecessorTaskId: constructionTaskDependenciesTable.predecessorTaskId,
      successorTaskId: constructionTaskDependenciesTable.successorTaskId,
      dependencyType: constructionTaskDependenciesTable.dependencyType,
      lagDays: constructionTaskDependenciesTable.lagDays,
      createdAt: constructionTaskDependenciesTable.createdAt,
    })
    .from(constructionTaskDependenciesTable)
    .innerJoin(
      constructionTasksTable,
      eq(constructionTasksTable.id, constructionTaskDependenciesTable.successorTaskId),
    )
    .where(and(
      eq(constructionTaskDependenciesTable.companyId, req.scopedCompanyId!),
      ...(projectId ? [eq(constructionTasksTable.projectId, parseInt(String(projectId), 10))] : []),
    ))
    .orderBy(desc(constructionTaskDependenciesTable.createdAt));
  res.json(rows);
});

router.post("/tasks/dependencies", async (req: AuthenticatedRequest, res): Promise<void> => {
  const predecessorTaskId = Number(req.body?.predecessorTaskId);
  const successorTaskId = Number(req.body?.successorTaskId);
  const dependencyType = String(req.body?.dependencyType || "FS").toUpperCase();
  const lagDays = Number(req.body?.lagDays ?? 0);
  if (!Number.isFinite(predecessorTaskId) || !Number.isFinite(successorTaskId)) {
    res.status(400).json({ error: "Укажите predecessorTaskId и successorTaskId" });
    return;
  }
  if (predecessorTaskId === successorTaskId) {
    res.status(400).json({ error: "Нельзя связать задачу саму с собой" });
    return;
  }
  if (!["FS", "SS"].includes(dependencyType)) {
    res.status(400).json({ error: "Допустимы типы зависимостей только FS и SS" });
    return;
  }

  const tasks = await db
    .select({
      id: constructionTasksTable.id,
      projectId: constructionTasksTable.projectId,
    })
    .from(constructionTasksTable)
    .where(and(
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
      inArray(constructionTasksTable.id, [predecessorTaskId, successorTaskId]),
    ));
  if (tasks.length !== 2) {
    res.status(404).json({ error: "Одна из задач не найдена" });
    return;
  }
  if (tasks[0].projectId !== tasks[1].projectId) {
    res.status(400).json({ error: "Связи допустимы только внутри одного проекта" });
    return;
  }

  const [row] = await db
    .insert(constructionTaskDependenciesTable)
    .values({
      companyId: req.scopedCompanyId!,
      predecessorTaskId,
      successorTaskId,
      dependencyType,
      lagDays: Number.isFinite(lagDays) ? lagDays : 0,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    res.status(409).json({ error: "Такая зависимость уже существует" });
    return;
  }
  res.status(201).json(row);
});

router.delete("/tasks/dependencies/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid dependency id" });
    return;
  }
  await db
    .delete(constructionTaskDependenciesTable)
    .where(and(
      eq(constructionTaskDependenciesTable.id, id),
      eq(constructionTaskDependenciesTable.companyId, req.scopedCompanyId!),
    ));
  res.json({ ok: true });
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
  const {
    projectId, stageId, title, description, status, priority, dueDate, estimatedHours, assignedTo,
    plannedStartDate, plannedEndDate, progressMode, progressPercent,
    contractorId, salesContractId, supplyRequestId,
  } = req.body;
  const parsedProjectId = parseInt(String(projectId), 10);
  const parsedStageId = stageId ? parseInt(String(stageId), 10) : null;
  if (!Number.isFinite(parsedProjectId)) {
    res.status(400).json({ error: "Укажите проект" });
    return;
  }
  if (!parsedStageId || !Number.isFinite(parsedStageId)) {
    res.status(400).json({ error: "Укажите этап или подэтап строительства" });
    return;
  }
  const [stageRow] = await db.select().from(constructionStagesTable).where(and(
    eq(constructionStagesTable.id, parsedStageId),
    eq(constructionStagesTable.companyId, req.scopedCompanyId!),
    eq(constructionStagesTable.projectId, parsedProjectId),
  ));
  if (!stageRow) {
    res.status(400).json({ error: "Этап не найден или не относится к проекту" });
    return;
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Укажите название задачи" });
    return;
  }
  const assignedToId = assignedTo ? parseInt(assignedTo) : null;
  const contractorIdNum = contractorId ? parseInt(String(contractorId), 10) : null;
  const salesContractIdNum = salesContractId ? parseInt(String(salesContractId), 10) : null;
  const supplyRequestIdNum = supplyRequestId ? parseInt(String(supplyRequestId), 10) : null;

  if (contractorIdNum) {
    const [contractor] = await db.select({ id: constructionContractorsTable.id })
      .from(constructionContractorsTable)
      .where(and(
        eq(constructionContractorsTable.id, contractorIdNum),
        eq(constructionContractorsTable.companyId, req.scopedCompanyId!),
      ));
    if (!contractor) {
      res.status(400).json({ error: "Подрядчик не найден" });
      return;
    }
  }
  if (salesContractIdNum) {
    const [salesContract] = await db.select({ id: constructionSalesContractsTable.id, projectId: constructionSalesContractsTable.projectId })
      .from(constructionSalesContractsTable)
      .where(and(
        eq(constructionSalesContractsTable.id, salesContractIdNum),
        eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
      ));
    if (!salesContract) {
      res.status(400).json({ error: "Договор продажи не найден" });
      return;
    }
    if (Number(salesContract.projectId) !== parsedProjectId) {
      res.status(400).json({ error: "Договор не относится к выбранному проекту" });
      return;
    }
  }
  if (supplyRequestIdNum) {
    const [supplyRequest] = await db.select({ id: supplyRequestsTable.id, projectId: supplyRequestsTable.projectId })
      .from(supplyRequestsTable)
      .where(and(
        eq(supplyRequestsTable.id, supplyRequestIdNum),
        eq(supplyRequestsTable.companyId, req.scopedCompanyId!),
      ));
    if (!supplyRequest) {
      res.status(400).json({ error: "Заявка снабжения не найдена" });
      return;
    }
    if (supplyRequest.projectId != null && Number(supplyRequest.projectId) !== parsedProjectId) {
      res.status(400).json({ error: "Заявка снабжения не относится к выбранному проекту" });
      return;
    }
  }
  const mode = progressMode || "checklist";
  const [row] = await db.insert(constructionTasksTable).values({
    companyId: req.scopedCompanyId!,
    projectId: parsedProjectId,
    stageId: parsedStageId,
    title: title.trim(),
    description,
    status: status || "todo",
    priority: priority || "medium",
    dueDate: dueDate || null,
    estimatedHours: estimatedHours ? String(estimatedHours) : null,
    assignedTo: assignedToId,
    contractorId: contractorIdNum,
    salesContractId: salesContractIdNum,
    supplyRequestId: supplyRequestIdNum,
    createdBy: req.userId ?? null,
    progressMode: mode,
    progressPercent: progressPercent != null ? Math.min(100, Math.max(0, parseInt(String(progressPercent), 10) || 0)) : 0,
    plannedStartDate: plannedStartDate || null,
    plannedEndDate: plannedEndDate || null,
    workType: "construction",
  }).returning();

  if (row.id) {
    await logTaskActivity({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      userId: req.userId!,
      action: "task_created",
      newValue: row.title,
    });
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
  const {
    title, description, status, priority, dueDate, estimatedHours, actualHours, completedAt, assignedTo,
    stageId, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, progressPercent,
    contractorId, salesContractId, supplyRequestId,
  } = req.body;

  const [prev] = await db.select()
    .from(constructionTasksTable)
    .where(and(eq(constructionTasksTable.id, id), eq(constructionTasksTable.companyId, req.scopedCompanyId!)));
  if (!prev) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  if (stageId !== undefined) {
    const parsedStageId = parseInt(String(stageId), 10);
    if (!Number.isFinite(parsedStageId)) {
      res.status(400).json({ error: "Укажите этап" });
      return;
    }
    const [stageRow] = await db.select().from(constructionStagesTable).where(and(
      eq(constructionStagesTable.id, parsedStageId),
      eq(constructionStagesTable.companyId, req.scopedCompanyId!),
      eq(constructionStagesTable.projectId, prev.projectId),
    ));
    if (!stageRow) {
      res.status(400).json({ error: "Этап не найден" });
      return;
    }
  }

  const newAssignedTo = assignedTo !== undefined ? (assignedTo ? parseInt(assignedTo) : null) : undefined;
  const parsedContractorId = contractorId !== undefined
    ? (contractorId ? parseInt(String(contractorId), 10) : null)
    : undefined;
  const parsedSalesContractId = salesContractId !== undefined
    ? (salesContractId ? parseInt(String(salesContractId), 10) : null)
    : undefined;
  const parsedSupplyRequestId = supplyRequestId !== undefined
    ? (supplyRequestId ? parseInt(String(supplyRequestId), 10) : null)
    : undefined;

  if (parsedContractorId) {
    const [contractor] = await db.select({ id: constructionContractorsTable.id })
      .from(constructionContractorsTable)
      .where(and(
        eq(constructionContractorsTable.id, parsedContractorId),
        eq(constructionContractorsTable.companyId, req.scopedCompanyId!),
      ));
    if (!contractor) {
      res.status(400).json({ error: "Подрядчик не найден" });
      return;
    }
  }
  if (parsedSalesContractId) {
    const [salesContract] = await db.select({ id: constructionSalesContractsTable.id, projectId: constructionSalesContractsTable.projectId })
      .from(constructionSalesContractsTable)
      .where(and(
        eq(constructionSalesContractsTable.id, parsedSalesContractId),
        eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
      ));
    if (!salesContract) {
      res.status(400).json({ error: "Договор продажи не найден" });
      return;
    }
    if (Number(salesContract.projectId) !== prev.projectId) {
      res.status(400).json({ error: "Договор не относится к проекту задачи" });
      return;
    }
  }
  if (parsedSupplyRequestId) {
    const [supplyRequest] = await db.select({ id: supplyRequestsTable.id, projectId: supplyRequestsTable.projectId })
      .from(supplyRequestsTable)
      .where(and(
        eq(supplyRequestsTable.id, parsedSupplyRequestId),
        eq(supplyRequestsTable.companyId, req.scopedCompanyId!),
      ));
    if (!supplyRequest) {
      res.status(400).json({ error: "Заявка снабжения не найдена" });
      return;
    }
    if (supplyRequest.projectId != null && Number(supplyRequest.projectId) !== prev.projectId) {
      res.status(400).json({ error: "Заявка снабжения не относится к проекту задачи" });
      return;
    }
  }

  const patchBody: Record<string, unknown> = {
    title: title !== undefined ? String(title).trim() : undefined,
    description,
    status,
    priority,
    dueDate,
    completedAt,
    estimatedHours: estimatedHours !== undefined ? (estimatedHours ? String(estimatedHours) : null) : undefined,
    actualHours: actualHours !== undefined ? (actualHours ? String(actualHours) : null) : undefined,
    assignedTo: newAssignedTo,
    contractorId: parsedContractorId,
    salesContractId: parsedSalesContractId,
    supplyRequestId: parsedSupplyRequestId,
    stageId: stageId !== undefined ? parseInt(String(stageId), 10) : undefined,
    plannedStartDate,
    plannedEndDate,
    actualStartDate,
    actualEndDate,
    progressPercent: progressPercent !== undefined
      ? Math.min(100, Math.max(0, parseInt(String(progressPercent), 10) || 0))
      : undefined,
  };
  const setFields = Object.fromEntries(
    Object.entries(patchBody).filter(([, v]) => v !== undefined),
  );

  const [row] = await db.update(constructionTasksTable)
    .set(setFields)
    .where(and(eq(constructionTasksTable.id, id), eq(constructionTasksTable.companyId, req.scopedCompanyId!)))
    .returning();

  const changes = taskFieldChanges(prev, patchBody);
  for (const ch of changes) {
    await logTaskActivity({
      companyId: req.scopedCompanyId!,
      taskId: id,
      userId: req.userId!,
      action: "field_change",
      fieldName: ch.field,
      oldValue: ch.oldValue,
      newValue: ch.newValue,
    });
  }

  const notifyRecipients = [row?.assignedTo, row?.createdBy].filter((v): v is number => typeof v === "number");
  if (row && status !== undefined && String(status) !== String(prev.status)) {
    await notifyTaskEvent({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      fromUserId: req.userId!,
      recipientIds: notifyRecipients,
      type: "task_status_changed",
      title: `Статус задачи изменён: ${row.title}`,
      body: `${String(prev.status)} → ${String(status)}`,
      color: "blue",
      metadata: { taskId: row.id, from: prev.status, to: status },
    });
  }
  if (row && dueDate !== undefined && String(dueDate || "") !== String(prev.dueDate || "")) {
    await notifyTaskEvent({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      fromUserId: req.userId!,
      recipientIds: notifyRecipients,
      type: "task_due_date_changed",
      title: `Срок задачи изменён: ${row.title}`,
      body: `Новый срок: ${dueDate || "без срока"}`,
      color: "amber",
      metadata: { taskId: row.id, previousDueDate: prev.dueDate, dueDate },
    });
  }
  if (
    row &&
    row.status !== "done" &&
    row.dueDate &&
    new Date(row.dueDate) < new Date()
  ) {
    await notifyTaskEvent({
      companyId: req.scopedCompanyId!,
      taskId: row.id,
      fromUserId: req.userId!,
      recipientIds: notifyRecipients,
      type: "task_overdue",
      title: `Задача просрочена: ${row.title}`,
      body: `Срок истёк: ${row.dueDate}`,
      color: "rose",
      metadata: { taskId: row.id, dueDate: row.dueDate },
    });
  }

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

router.post("/tasks/:id/quick-supply-request", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const [task] = await db.select().from(constructionTasksTable).where(and(
    eq(constructionTasksTable.id, id),
    eq(constructionTasksTable.companyId, req.scopedCompanyId!),
  ));
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const [request] = await db.insert(supplyRequestsTable).values({
    companyId: req.scopedCompanyId!,
    projectId: task.projectId,
    constructionStageId: task.stageId ?? null,
    requestedBy: req.userId!,
    status: "pending",
    priority: task.priority === "critical" || task.priority === "high" ? "high" : "normal",
    neededByDate: task.dueDate ?? null,
    notes: `Создано из задачи #${task.id}: ${task.title}`,
  }).returning();

  if (!request) {
    res.status(500).json({ error: "Не удалось создать заявку снабжения" });
    return;
  }

  await db.insert(supplyRequestItemsTable).values({
    requestId: request.id,
    customName: task.title,
    quantity: "1",
    unit: "шт",
    notes: task.description ?? null,
  }).catch(() => {});

  const [updatedTask] = await db.update(constructionTasksTable)
    .set({ supplyRequestId: request.id })
    .where(and(
      eq(constructionTasksTable.id, id),
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
    ))
    .returning();

  await logTaskActivity({
    companyId: req.scopedCompanyId!,
    taskId: id,
    userId: req.userId!,
    action: "linked_supply_request",
    newValue: String(request.id),
  });

  res.status(201).json({ request, task: updatedTask ?? task });
});

router.post("/tasks/:id/quick-sales-contract", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const [task] = await db.select().from(constructionTasksTable).where(and(
    eq(constructionTasksTable.id, id),
    eq(constructionTasksTable.companyId, req.scopedCompanyId!),
  ));
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const [countRow] = await db.select({ cnt: sql<number>`count(*)` })
    .from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!));
  const num = (Number(countRow?.cnt ?? 0) + 1).toString().padStart(4, "0");
  const contractNumber = `ДКП-${new Date().getFullYear()}-${num}`;

  const [contract] = await db.insert(constructionSalesContractsTable).values({
    companyId: req.scopedCompanyId!,
    projectId: task.projectId,
    contractNumber,
    status: "draft",
    totalAmount: "0",
    downPayment: "0",
    remainingAmount: "0",
    paidAmount: "0",
    installmentMonths: 0,
    currency: "KGS",
    contractDate: new Date().toISOString().slice(0, 10),
    buyerName: `Черновик из задачи #${task.id}`,
    notes: task.title,
  }).returning();

  if (!contract) {
    res.status(500).json({ error: "Не удалось создать черновик договора" });
    return;
  }

  const [updatedTask] = await db.update(constructionTasksTable)
    .set({ salesContractId: contract.id })
    .where(and(
      eq(constructionTasksTable.id, id),
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
    ))
    .returning();

  await logTaskActivity({
    companyId: req.scopedCompanyId!,
    taskId: id,
    userId: req.userId!,
    action: "linked_sales_contract",
    newValue: String(contract.id),
  });

  res.status(201).json({ contract, task: updatedTask ?? task });
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

async function notifyTaskEvent(params: {
  companyId: number;
  taskId: number;
  fromUserId: number;
  recipientIds: number[];
  type: string;
  title: string;
  body?: string | null;
  color?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { companyId, taskId, fromUserId, recipientIds, type, title, body, color, metadata } = params;
  const unique = Array.from(new Set(recipientIds.filter((id) => Number.isFinite(id) && id !== fromUserId)));
  if (unique.length === 0) return;
  try {
    await Promise.all(
      unique.map((userId) =>
        db.insert(notificationsTable).values({
          companyId,
          userId,
          fromUserId,
          type,
          title,
          body: body || null,
          message: body || null,
          icon: "clipboard-list",
          color: color || "blue",
          link: `/construction/tasks/${taskId}`,
          metadata: metadata ? JSON.stringify(metadata) : null,
        } as any),
      ),
    );
  } catch {
    // уведомления не должны ломать основной сценарий
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
    budgetItemId: constructionExpensesTable.budgetItemId,
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
    stageName: constructionStagesTable.name,
  })
    .from(constructionExpensesTable)
    .leftJoin(constructionContractorsTable, eq(constructionExpensesTable.contractorId, constructionContractorsTable.id))
    .leftJoin(constructionProjectsTable, eq(constructionExpensesTable.projectId, constructionProjectsTable.id))
    .leftJoin(constructionStagesTable, eq(constructionExpensesTable.stageId, constructionStagesTable.id))
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

router.patch("/expenses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const {
    projectId, stageId, budgetItemId, category, description, amount, currency,
    exchangeRateSource, exchangeRate, contractorId, date, paymentMethod, notes,
  } = req.body;
  const amt = parseFloat(amount || "0");
  const rate = parseFloat(exchangeRate || "1");
  const amtKgs = (currency || "KGS") === "KGS" ? amt : amt * rate;
  const [row] = await db.update(constructionExpensesTable)
    .set({
      ...(projectId != null ? { projectId } : {}),
      stageId: stageId ?? null,
      budgetItemId: budgetItemId ?? null,
      category,
      description,
      amount: String(amt),
      currency: currency || "KGS",
      exchangeRateSource: exchangeRateSource || "nbkr",
      exchangeRate: String(rate),
      amountKgs: String(amtKgs),
      contractorId: contractorId || null,
      ...(date ? { date } : {}),
      paymentMethod: paymentMethod || "cash",
      notes,
    })
    .where(and(eq(constructionExpensesTable.id, id), eq(constructionExpensesTable.companyId, req.scopedCompanyId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/expenses/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(constructionExpensesTable).where(and(eq(constructionExpensesTable.id, id), eq(constructionExpensesTable.companyId, req.scopedCompanyId!)));
  res.json({ ok: true });
});

// ── CHESS UNITS ───────────────────────────────────────────────────────────────

router.get("/units", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { projectId } = req.query;
    const rows = await db.select().from(constructionUnitsTable)
      .where(and(
        eq(constructionUnitsTable.companyId, req.scopedCompanyId!),
        ...(projectId ? [eq(constructionUnitsTable.projectId, parseInt(projectId as string))] : [])
      ))
      .orderBy(asc(constructionUnitsTable.floor), asc(constructionUnitsTable.unitNumber));
    res.json(rows);
  } catch (e) {
    sendServerError(res, e, "Ошибка загрузки квартир");
  }
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
  const companyId = req.scopedCompanyId!;
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];

  const [existing] = await db
    .select()
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, companyId)));
  if (!existing) {
    res.status(404).json({ error: "Квартира не найдена" });
    return;
  }

  const {
    unitNumber, floor, block, unitType, roomCount, area, pricePerSqm, currency, status,
    buyerId, contractDate, notes, priceCoefficient,
  } = req.body;

  const nextStatus =
    status !== undefined ? await resolveUnitStatus(companyId, String(status)) : existing.status;

  if (status !== undefined && nextStatus !== existing.status) {
    const gate = await assertUnitStatusAllowed({
      companyId,
      role,
      unit: existing,
      nextStatus,
    });
    if (!gate.ok) {
      res.status(403).json({ error: gate.error });
      return;
    }
  }

  if (isSalesRole(role) && !existing.priceApproved) {
    res.status(403).json({ error: "Редактирование доступно после утверждения цены" });
    return;
  }

  const project = await loadProjectForPricing(companyId, existing.projectId);
  const a = parseNum(area !== undefined ? area : existing.area);
  let coef = parseNum(
    priceCoefficient !== undefined ? priceCoefficient : existing.priceCoefficient,
  );
  if (coef <= 0) coef = 1;

  const canPrice = canManagePricing(role, permissions);
  if (priceCoefficient !== undefined && !canPrice) {
    res.status(403).json({ error: "Коэффициент цены меняет коммерческий директор" });
    return;
  }

  const existingPps = parseNum(existing.pricePerSqm);
  const existingCoef = parseNum(existing.priceCoefficient) || 1;
  const recalcPrice = req.body.recalcPrice === true;
  const pricePerSqmChanged =
    pricePerSqm !== undefined && parseNum(pricePerSqm) !== existingPps;
  const coefChanged = priceCoefficient !== undefined && coef !== existingCoef;

  let pps = pricePerSqm !== undefined ? parseNum(pricePerSqm) : existingPps;
  let total = a > 0 && pps > 0 ? a * pps : parseNum(existing.totalPrice);

  if (canPrice && !pricePerSqmChanged && (recalcPrice || coefChanged)) {
    const list = computeListPrice(project, {
      ...existing,
      area: a > 0 ? String(a) : existing.area,
      priceCoefficient: String(coef),
    });
    if (list > 0) {
      total = list;
      pps = a > 0 ? list / a : pps;
    }
  }

  const patch: Record<string, unknown> = {
    unitNumber: unitNumber ?? existing.unitNumber,
    floor: floor !== undefined ? (floor ? parseInt(floor, 10) : null) : existing.floor,
    block: block !== undefined ? block : existing.block,
    unitType: unitType ?? existing.unitType,
    roomCount:
      roomCount !== undefined
        ? roomCount
          ? parseInt(roomCount, 10)
          : null
        : existing.roomCount,
    area: a > 0 ? String(a) : existing.area,
    pricePerSqm: pps > 0 ? String(pps) : existing.pricePerSqm,
    totalPrice: total > 0 ? String(total) : existing.totalPrice,
    currency: currency ?? existing.currency,
    status: nextStatus,
    buyerId: buyerId !== undefined ? buyerId || null : existing.buyerId,
    contractDate: contractDate !== undefined ? contractDate || null : existing.contractDate,
    notes: notes !== undefined ? notes : existing.notes,
  };
  if (priceCoefficient !== undefined && canPrice) {
    patch.priceCoefficient = String(coef);
    if (existing.priceApproved) {
      patch.priceApproved = false;
      patch.priceApprovedAt = null;
      patch.priceApprovedBy = null;
    }
  }

  const [row] = await db
    .update(constructionUnitsTable)
    .set(patch as typeof constructionUnitsTable.$inferInsert)
    .where(eq(constructionUnitsTable.id, id))
    .returning();

  res.json(enrichUnitPricing(project, row));
});

router.post("/units/:id/approve-price", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(req.params.id as string, 10);
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];

  if (!canManagePricing(role, permissions)) {
    res.status(403).json({ error: "Утверждение цены доступно коммерческому директору" });
    return;
  }

  const coef = req.body?.priceCoefficient !== undefined
    ? parseNum(req.body.priceCoefficient)
    : undefined;

  const updated = await approveUnitPrice({
    companyId,
    unitId: id,
    userId: req.userId!,
    coefficient: coef,
  });
  if (!updated) {
    res.status(404).json({ error: "Квартира не найдена" });
    return;
  }
  const project = await loadProjectForPricing(companyId, updated.projectId);
  res.json(enrichUnitPricing(project, updated));
});

/** Сохранение коммерческой цены из диалога шахматки (база проекта + коэффициент + утверждение). */
router.put("/units/:id/commercial-price", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = parseInt(req.params.id as string, 10);
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];

  if (!canManagePricing(role, permissions)) {
    res.status(403).json({ error: "Коммерческая цена доступна коммерческому директору" });
    return;
  }

  const [existing] = await db
    .select()
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.id, id), eq(constructionUnitsTable.companyId, companyId)));
  if (!existing) {
    res.status(404).json({ error: "Квартира не найдена" });
    return;
  }

  const baseRaw = req.body?.baseSalePricePerSqm;
  const coefRaw = req.body?.priceCoefficient;
  const areaRaw = req.body?.area;
  const activeForSale = req.body?.activeForSale !== false;

  if (areaRaw !== undefined && areaRaw !== null && String(areaRaw).trim() !== "") {
    const areaVal = parseNum(areaRaw);
    if (areaVal > 0) {
      await db
        .update(constructionUnitsTable)
        .set({ area: String(areaVal) })
        .where(eq(constructionUnitsTable.id, id));
      existing.area = String(areaVal);
    }
  }

  if (baseRaw !== undefined && baseRaw !== null && String(baseRaw).trim() !== "") {
    const baseVal = parseNum(baseRaw);
    if (baseVal > 0) {
      await db
        .update(constructionProjectsTable)
        .set({ baseSalePricePerSqm: String(baseVal) })
        .where(
          and(
            eq(constructionProjectsTable.id, existing.projectId),
            eq(constructionProjectsTable.companyId, companyId),
          ),
        );
    }
  }

  const coef =
    coefRaw !== undefined && coefRaw !== null && String(coefRaw).trim() !== ""
      ? parseNum(coefRaw)
      : parseNum(existing.priceCoefficient) || 1;
  if (coef <= 0) {
    res.status(400).json({ error: "Коэффициент должен быть больше нуля" });
    return;
  }

  let updated: typeof existing;
  if (activeForSale) {
    const approved = await approveUnitPrice({
      companyId,
      unitId: id,
      userId: req.userId!,
      coefficient: coef,
    });
    if (!approved) {
      res.status(404).json({ error: "Квартира не найдена" });
      return;
    }
    updated = approved;
  } else {
    const project = await loadProjectForPricing(companyId, existing.projectId);
    const listPrice = computeListPrice(project, {
      ...existing,
      priceCoefficient: String(coef),
    });
    const area = parseNum(existing.area);
    const pps = area > 0 ? listPrice / area : parseNum(existing.pricePerSqm);

    const [row] = await db
      .update(constructionUnitsTable)
      .set({
        priceCoefficient: String(coef),
        pricePerSqm: pps > 0 ? String(pps) : existing.pricePerSqm,
        totalPrice: listPrice > 0 ? String(listPrice) : existing.totalPrice,
        priceApproved: false,
        priceApprovedBy: null,
        priceApprovedAt: null,
      })
      .where(eq(constructionUnitsTable.id, id))
      .returning();
    updated = row ?? existing;
  }

  const project = await loadProjectForPricing(companyId, existing.projectId);
  res.json(enrichUnitPricing(project, updated));
});

/** Массовое применение коммерческой цены и/или публикация для продажи (этаж или выбранные юниты). */
router.post("/units/bulk-pricing", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];

  if (!canManagePricing(role, permissions)) {
    res.status(403).json({ error: "Массовое ценообразование доступно коммерческому директору" });
    return;
  }

  const projectId = parseInt(String(req.body?.projectId ?? ""), 10);
  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }

  const unitIdsRaw = req.body?.unitIds;
  const unitIds: number[] = Array.isArray(unitIdsRaw)
    ? unitIdsRaw
        .map((id: unknown) => parseInt(String(id), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const floorRaw = req.body?.floor;
  const floor =
    floorRaw !== undefined && floorRaw !== null && String(floorRaw).trim() !== ""
      ? parseInt(String(floorRaw), 10)
      : undefined;

  if (unitIds.length === 0 && floor === undefined) {
    res.status(400).json({ error: "Укажите unitIds или floor" });
    return;
  }

  const baseRaw = req.body?.baseSalePricePerSqm ?? req.body?.pricePerSqm;
  const coefRaw = req.body?.priceCoefficient ?? req.body?.coefficient;
  const hasBase = baseRaw !== undefined && baseRaw !== null && String(baseRaw).trim() !== "";
  const hasCoef = coefRaw !== undefined && coefRaw !== null && String(coefRaw).trim() !== "";
  const publishForSale =
    req.body?.publishForSale === true ||
    req.body?.activeForSale === true ||
    req.body?.approvePrice === true;
  const savePriceOnly = req.body?.savePriceOnly === true;

  if (!hasBase && !hasCoef && !publishForSale) {
    res.status(400).json({ error: "Укажите цену, коэффициент или публикацию для продажи" });
    return;
  }

  const [projectRow] = await db
    .select()
    .from(constructionProjectsTable)
    .where(
      and(
        eq(constructionProjectsTable.id, projectId),
        eq(constructionProjectsTable.companyId, companyId),
      ),
    );
  if (!projectRow) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }

  const unitFilters = [
    eq(constructionUnitsTable.companyId, companyId),
    eq(constructionUnitsTable.projectId, projectId),
  ];
  if (unitIds.length > 0) {
    unitFilters.push(inArray(constructionUnitsTable.id, unitIds));
  } else if (floor !== undefined) {
    unitFilters.push(eq(constructionUnitsTable.floor, floor));
  }

  const units = await db
    .select()
    .from(constructionUnitsTable)
    .where(and(...unitFilters));

  if (units.length === 0) {
    res.status(404).json({ error: "Квартиры не найдены" });
    return;
  }

  if (hasBase) {
    const baseVal = parseNum(baseRaw);
    if (baseVal <= 0) {
      res.status(400).json({ error: "Базовая цена за м² должна быть больше нуля" });
      return;
    }
    await db
      .update(constructionProjectsTable)
      .set({ baseSalePricePerSqm: String(baseVal) })
      .where(
        and(
          eq(constructionProjectsTable.id, projectId),
          eq(constructionProjectsTable.companyId, companyId),
        ),
      );
    projectRow.baseSalePricePerSqm = String(baseVal);
  }

  const coefDefault = hasCoef ? parseNum(coefRaw) : undefined;
  if (coefDefault !== undefined && coefDefault <= 0) {
    res.status(400).json({ error: "Коэффициент должен быть больше нуля" });
    return;
  }

  const activeForSale = publishForSale && !savePriceOnly;
  let updated = 0;
  let skipped = 0;
  const errors: { unitId: number; unitNumber?: string; error: string }[] = [];

  for (const unit of units) {
    const coef = coefDefault ?? (parseNum(unit.priceCoefficient) || 1);

    if (activeForSale) {
      if (parseNum(unit.area) <= 0) {
        skipped += 1;
        errors.push({
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          error: "Не указана площадь",
        });
        continue;
      }
      const approved = await approveUnitPrice({
        companyId,
        unitId: unit.id,
        userId: req.userId!,
        coefficient: coef,
      });
      if (approved) {
        updated += 1;
      } else {
        skipped += 1;
        errors.push({ unitId: unit.id, unitNumber: unit.unitNumber, error: "Не удалось утвердить" });
      }
      continue;
    }

    if (hasBase || hasCoef) {
      const project = projectRow;
      const listPrice = computeListPrice(project, {
        ...unit,
        priceCoefficient: String(coef),
      });
      const area = parseNum(unit.area);
      const pps = area > 0 ? listPrice / area : parseNum(unit.pricePerSqm);

      await db
        .update(constructionUnitsTable)
        .set({
          priceCoefficient: String(coef),
          pricePerSqm: pps > 0 ? String(pps) : unit.pricePerSqm,
          totalPrice: listPrice > 0 ? String(listPrice) : unit.totalPrice,
          priceApproved: false,
          priceApprovedBy: null,
          priceApprovedAt: null,
        })
        .where(eq(constructionUnitsTable.id, unit.id));
      updated += 1;
      continue;
    }

    skipped += 1;
  }

  res.json({ updated, skipped, total: units.length, errors: errors.length ? errors : undefined });
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
  try {
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
      ).orderBy(asc(constructionUnitsTable.floor), asc(constructionUnitsTable.unitNumber)),
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

    const [project] = await db
      .select()
      .from(constructionProjectsTable)
      .where(
        and(
          eq(constructionProjectsTable.id, projectId),
          eq(constructionProjectsTable.companyId, companyId),
        ),
      );

    res.json(
      units.map((u) => {
        const c = contractByUnit.get(u.id);
        const enriched = enrichUnitPricing(project ?? null, u);
        return {
          ...enriched,
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
  } catch (e) {
    sendServerError(res, e, "Ошибка загрузки обзора квартир");
  }
});

const SALES_GRID_VISIBLE_FOR_SALES = ["available", "reserved", "sold"];

function salesGridKpiBucket(statusCode: string): string {
  const map: Record<string, string> = {
    available: "free",
    reserved: "reserved",
    sold: "sold",
    registered: "sold",
    occupied: "settled",
    construction: "building",
    closed: "closed",
    draft: "closed",
    unavailable: "closed",
  };
  return map[statusCode] ?? "closed";
}

function sanitizeSalesGridUnit(role: string, row: Record<string, unknown>) {
  if (!isSalesRole(role)) return row;
  const { priceCoefficient, ...rest } = row;
  return rest;
}

async function loadProjectUnitsWithContracts(
  companyId: number,
  projectId: number,
) {
  const [units, contracts, project] = await Promise.all([
    db.select().from(constructionUnitsTable).where(
      and(
        eq(constructionUnitsTable.companyId, companyId),
        eq(constructionUnitsTable.projectId, projectId),
      ),
    ).orderBy(asc(constructionUnitsTable.floor), asc(constructionUnitsTable.unitNumber)),
    db.select().from(constructionSalesContractsTable).where(
      and(
        eq(constructionSalesContractsTable.companyId, companyId),
        eq(constructionSalesContractsTable.projectId, projectId),
      ),
    ).orderBy(desc(constructionSalesContractsTable.createdAt)),
    loadProjectForPricing(companyId, projectId),
  ]);

  const contractByUnit = new Map<number, (typeof contracts)[0]>();
  for (const c of contracts) {
    if (!c.unitId || c.status === "cancelled") continue;
    if (!contractByUnit.has(c.unitId)) contractByUnit.set(c.unitId, c);
  }

  return units.map((u) => {
    const c = contractByUnit.get(u.id);
    const enriched = enrichUnitPricing(project ?? null, u);
    return {
      ...enriched,
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
  });
}

/** SalesGrid: квартиры проекта с договорами, фильтр по роли и поиску */
router.get("/projects/:id/units", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (!projectId) {
      res.status(400).json({ error: "projectId обязателен" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const role = req.userRole || "";
    const statusFilter = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();

    let rows = await loadProjectUnitsWithContracts(companyId, projectId);

    if (isSalesRole(role)) {
      rows = rows.filter((u) => SALES_GRID_VISIBLE_FOR_SALES.includes(u.status));
    }

    if (statusFilter) {
      const bucket = statusFilter;
      rows = rows.filter((u) => salesGridKpiBucket(u.status) === bucket);
    }

    if (search) {
      rows = rows.filter((u) => {
        const hay = [
          u.unitNumber,
          u.contract?.buyerName,
          u.contract?.buyerPhone,
          u.contract?.contractNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }

    res.json(rows.map((u) => sanitizeSalesGridUnit(role, u as Record<string, unknown>)));
  } catch (e) {
    sendServerError(res, e, "Ошибка загрузки квартир проекта");
  }
});

/** SalesGrid: KPI по статусам */
router.get("/projects/:id/units/stats", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (!projectId) {
      res.status(400).json({ error: "projectId обязателен" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const role = req.userRole || "";

    let rows = await loadProjectUnitsWithContracts(companyId, projectId);
    if (isSalesRole(role)) {
      rows = rows.filter((u) => SALES_GRID_VISIBLE_FOR_SALES.includes(u.status));
    }

    const stats = {
      total: rows.length,
      free: 0,
      reserved: 0,
      sold: 0,
      settled: 0,
      building: 0,
      closed: 0,
    };
    for (const u of rows) {
      const bucket = salesGridKpiBucket(u.status) as keyof typeof stats;
      if (bucket in stats && bucket !== "total") {
        stats[bucket] += 1;
      }
    }
    res.json(stats);
  } catch (e) {
    sendServerError(res, e, "Ошибка загрузки статистики квартир");
  }
});

/** SalesGrid: массовое обновление (цены / статус по этажу или выборке) */
router.patch("/projects/:id/units/bulk", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];
  const projectId = parseInt(String(req.params.id), 10);

  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }

  const filter = req.body?.filter ?? {};
  const update = req.body?.update ?? {};
  const unitIds: number[] = Array.isArray(filter.unitIds)
    ? filter.unitIds.map((id: unknown) => parseInt(String(id), 10)).filter((n: number) => n > 0)
    : [];
  const floor =
    filter.floor !== undefined && filter.floor !== null && String(filter.floor).trim() !== ""
      ? parseInt(String(filter.floor), 10)
      : undefined;

  const hasPrice =
    update.basePrice !== undefined ||
    update.baseSalePricePerSqm !== undefined ||
    update.coefficient !== undefined ||
    update.priceCoefficient !== undefined;
  const hasStatus = update.status !== undefined;

  if (hasPrice) {
    if (!canManagePricing(role, permissions)) {
      res.status(403).json({ error: "Массовое ценообразование доступно коммерческому директору" });
      return;
    }

    const baseRaw = update.basePrice ?? update.baseSalePricePerSqm;
    const coefRaw = update.coefficient ?? update.priceCoefficient;
    const hasBase = baseRaw !== undefined && baseRaw !== null && String(baseRaw).trim() !== "";
    const hasCoef = coefRaw !== undefined && coefRaw !== null && String(coefRaw).trim() !== "";
    const publishForSale = update.publishForSale === true || update.activeForSale === true;
    const savePriceOnly = update.savePriceOnly === true;

    if (!hasBase && !hasCoef && !publishForSale) {
      res.status(400).json({ error: "Укажите цену, коэффициент или публикацию для продажи" });
      return;
    }
    if (unitIds.length === 0 && floor === undefined) {
      res.status(400).json({ error: "Укажите filter.unitIds или filter.floor" });
      return;
    }

    const [projectRow] = await db
      .select()
      .from(constructionProjectsTable)
      .where(
        and(
          eq(constructionProjectsTable.id, projectId),
          eq(constructionProjectsTable.companyId, companyId),
        ),
      );
    if (!projectRow) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }

    const unitFilters = [
      eq(constructionUnitsTable.companyId, companyId),
      eq(constructionUnitsTable.projectId, projectId),
    ];
    if (unitIds.length > 0) unitFilters.push(inArray(constructionUnitsTable.id, unitIds));
    else if (floor !== undefined) unitFilters.push(eq(constructionUnitsTable.floor, floor));

    const units = await db.select().from(constructionUnitsTable).where(and(...unitFilters));
    if (units.length === 0) {
      res.status(404).json({ error: "Квартиры не найдены" });
      return;
    }

    if (hasBase) {
      const baseVal = parseNum(baseRaw);
      if (baseVal <= 0) {
        res.status(400).json({ error: "Базовая цена за м² должна быть больше нуля" });
        return;
      }
      await db
        .update(constructionProjectsTable)
        .set({ baseSalePricePerSqm: String(baseVal) })
        .where(
          and(
            eq(constructionProjectsTable.id, projectId),
            eq(constructionProjectsTable.companyId, companyId),
          ),
        );
      projectRow.baseSalePricePerSqm = String(baseVal);
    }

    const coefDefault = hasCoef ? parseNum(coefRaw) : undefined;
    if (coefDefault !== undefined && coefDefault <= 0) {
      res.status(400).json({ error: "Коэффициент должен быть больше нуля" });
      return;
    }

    const activeForSale = publishForSale && !savePriceOnly;
    let updated = 0;
    let skipped = 0;
    const errors: { unitId: number; unitNumber?: string; error: string }[] = [];

    for (const unit of units) {
      const coef = coefDefault ?? (parseNum(unit.priceCoefficient) || 1);

      if (activeForSale) {
        if (parseNum(unit.area) <= 0) {
          skipped += 1;
          errors.push({ unitId: unit.id, unitNumber: unit.unitNumber, error: "Не указана площадь" });
          continue;
        }
        const approved = await approveUnitPrice({
          companyId,
          unitId: unit.id,
          userId: req.userId!,
          coefficient: coef,
        });
        if (approved) updated += 1;
        else {
          skipped += 1;
          errors.push({ unitId: unit.id, unitNumber: unit.unitNumber, error: "Не удалось утвердить" });
        }
        continue;
      }

      if (hasBase || hasCoef) {
        const listPrice = computeListPrice(projectRow, { ...unit, priceCoefficient: String(coef) });
        const area = parseNum(unit.area);
        const pps = area > 0 ? listPrice / area : parseNum(unit.pricePerSqm);

        await db
          .update(constructionUnitsTable)
          .set({
            priceCoefficient: String(coef),
            pricePerSqm: pps > 0 ? String(pps) : unit.pricePerSqm,
            totalPrice: listPrice > 0 ? String(listPrice) : unit.totalPrice,
            priceApproved: false,
            priceApprovedBy: null,
            priceApprovedAt: null,
          })
          .where(eq(constructionUnitsTable.id, unit.id));
        updated += 1;
        continue;
      }

      skipped += 1;
    }

    res.json({ updated, skipped, total: units.length, errors: errors.length ? errors : undefined });
    return;
  }

  if (hasStatus) {
    if (!canManagePricing(role, permissions) && !["super_admin", "admin", "company_admin", "owner"].includes(role)) {
      res.status(403).json({ error: "Массовая смена статуса недоступна" });
      return;
    }
    const unitFilters = [
      eq(constructionUnitsTable.companyId, companyId),
      eq(constructionUnitsTable.projectId, projectId),
    ];
    if (unitIds.length) unitFilters.push(inArray(constructionUnitsTable.id, unitIds));
    else if (floor !== undefined) unitFilters.push(eq(constructionUnitsTable.floor, floor));

    const units = await db.select().from(constructionUnitsTable).where(and(...unitFilters));
    const nextStatus = await resolveUnitStatus(companyId, String(update.status));
    let updated = 0;
    for (const unit of units) {
      if (unit.status === nextStatus) continue;
      const gate = await assertUnitStatusAllowed({ companyId, role, unit, nextStatus });
      if (!gate.ok) continue;
      await db
        .update(constructionUnitsTable)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(constructionUnitsTable.id, unit.id));
      updated += 1;
    }
    res.json({ updated, total: units.length });
    return;
  }

  res.status(400).json({ error: "Укажите update.basePrice, coefficient или status" });
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
    const unitType = resolveUnitType(String(row.unitType ?? row["Тип"] ?? "apartment"));
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

/** SalesGrid: массовое обновление площади (и опционально цены/м²) по номеру квартиры */
router.post("/projects/:id/units/bulk-update", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];
  const projectId = parseInt(String(req.params.id), 10);
  const updates: Record<string, unknown>[] = Array.isArray(req.body?.updates)
    ? req.body.updates
    : Array.isArray(req.body?.rows)
      ? req.body.rows
      : [];

  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }
  if (!canEditUnitArea(role, permissions)) {
    res.status(403).json({ error: "Изменение площади доступно коммерческому директору или ПТО" });
    return;
  }
  if (updates.length === 0) {
    res.status(400).json({ error: "Нет строк для обновления" });
    return;
  }

  const [projectRow] = await db
    .select()
    .from(constructionProjectsTable)
    .where(
      and(
        eq(constructionProjectsTable.id, projectId),
        eq(constructionProjectsTable.companyId, companyId),
      ),
    );
  if (!projectRow) {
    res.status(404).json({ error: "Проект не найден" });
    return;
  }

  const existing = await db.select().from(constructionUnitsTable).where(
    and(
      eq(constructionUnitsTable.companyId, companyId),
      eq(constructionUnitsTable.projectId, projectId),
    ),
  );

  const byNumber = new Map<string, typeof existing>();
  for (const u of existing) {
    const key = String(u.unitNumber).trim().toLowerCase();
    const list = byNumber.get(key) ?? [];
    list.push(u);
    byNumber.set(key, list);
  }

  const areaOnly = req.body?.mode === "area_only" || req.body?.areaOnly === true;
  const canPrice = canManagePricing(role, permissions);
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; unitNumber?: string; message: string }[] = [];

  for (let i = 0; i < updates.length; i++) {
    const row = updates[i];
    const unitNumber = String(row.unitNumber ?? row["Номер"] ?? "").trim();
    if (!unitNumber) {
      errors.push({ row: i + 2, message: "Не указан номер квартиры" });
      skipped += 1;
      continue;
    }

    const floorRaw = row.floor ?? row["Этаж"];
    const floor =
      floorRaw != null && floorRaw !== "" ? parseInt(String(floorRaw), 10) : undefined;
    const areaVal = parseFloat(String(row.area ?? row["Площадь м²"] ?? row["Площадь"] ?? "0"));
    const priceRaw = row.pricePerSqm ?? row["Цена за м²"] ?? row["Цена/м²"];
    const hasPrice =
      priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== "";
    const pricePerSqm = hasPrice ? parseFloat(String(priceRaw)) : 0;

    if (!areaVal || areaVal <= 0) {
      if (!areaOnly || !hasPrice) {
        errors.push({ row: i + 2, unitNumber, message: "Укажите корректную площадь" });
        skipped += 1;
        continue;
      }
    }

    const candidates = byNumber.get(unitNumber.toLowerCase()) ?? [];
    let unit = candidates.length === 1 ? candidates[0] : undefined;
    if (!unit && floor !== undefined && !Number.isNaN(floor)) {
      unit = candidates.find((u) => Number(u.floor) === floor);
    }
    if (!unit && candidates.length > 0) {
      unit = candidates[0];
    }

    if (!unit) {
      if (areaOnly) {
        errors.push({ row: i + 2, unitNumber, message: "Квартира не найдена в проекте" });
        skipped += 1;
        continue;
      }
      errors.push({ row: i + 2, unitNumber, message: "Квартира не найдена" });
      skipped += 1;
      continue;
    }

    const newArea = areaVal > 0 ? areaVal : parseNum(unit.area);
    const pps =
      hasPrice && canPrice && pricePerSqm > 0
        ? pricePerSqm
        : parseNum(unit.pricePerSqm);
    let total = newArea > 0 && pps > 0 ? newArea * pps : parseNum(unit.totalPrice);

    if (canPrice && !hasPrice && newArea > 0) {
      const list = computeListPrice(projectRow, {
        ...unit,
        area: String(newArea),
      });
      if (list > 0) {
        total = list;
      }
    }

    const patch: Record<string, unknown> = {
      area: newArea > 0 ? String(newArea) : unit.area,
      totalPrice: total > 0 ? String(total) : unit.totalPrice,
    };
    if (hasPrice && canPrice && pricePerSqm > 0) {
      patch.pricePerSqm = String(pricePerSqm);
      if (newArea > 0) patch.totalPrice = String(newArea * pricePerSqm);
    }

    if (["pto", "engineer"].includes(role) && newArea > 0) {
      const oldArea = parseNum(unit.area);
      if (Math.abs(newArea - oldArea) > 0.001) {
        patch.originalArea = unit.originalArea ?? String(oldArea);
        patch.areaModified = true;
        patch.areaModifiedBy = req.userId ?? null;
        patch.areaModifiedAt = new Date();
        patch.areaDelta = String(newArea - oldArea);
      }
    }

    try {
      await db
        .update(constructionUnitsTable)
        .set(patch as typeof constructionUnitsTable.$inferInsert)
        .where(
          and(eq(constructionUnitsTable.id, unit.id), eq(constructionUnitsTable.companyId, companyId)),
        );
      updated += 1;
    } catch (e) {
      errors.push({
        row: i + 2,
        unitNumber,
        message: e instanceof Error ? e.message : "Ошибка сохранения",
      });
      skipped += 1;
    }
  }

  res.json({ updated, skipped, errors, total: updates.length });
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

/** PATCH /units/:id/area — изменение площади (ПТО / коммерческий директор) */
router.patch("/units/:id/area", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const role = req.userRole || "";
  const permissions = req.userPermissions || [];
  if (!canEditUnitArea(role, permissions)) {
    res.status(403).json({ error: "Изменение площади доступно коммерческому директору или ПТО" });
    return;
  }
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
  const {
    content,
    commentType,
    parentCommentId,
    mentions,
    attachments,
  } = req.body as {
    content: string;
    commentType?: string;
    parentCommentId?: number | null;
    mentions?: number[];
    attachments?: Array<{ fileName: string; mimeType: string; base64: string }>;
  };
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

  const [taskForComment] = await db.select()
    .from(constructionTasksTable)
    .where(and(
      eq(constructionTasksTable.id, taskId),
      eq(constructionTasksTable.companyId, req.scopedCompanyId!),
    ));
  if (!taskForComment) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const mentionIds = Array.isArray(mentions)
    ? Array.from(
      new Set(
        mentions
          .map((m) => Number(m))
          .filter((m) => Number.isFinite(m) && m > 0),
      ),
    )
    : [];

  const uploadedAttachmentIds: number[] = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const file of attachments.slice(0, 5)) {
      if (!file?.fileName || !file?.mimeType || !file?.base64) continue;
      const uploaded = await uploadFile({
        fileName: String(file.fileName),
        mimeType: String(file.mimeType),
        base64: String(file.base64),
        pathname: `construction-tasks/${req.scopedCompanyId!}/${taskId}/comments`,
      });
      if (uploaded.storage !== "blob") {
        res.status(500).json({
          error:
            "Blob-хранилище не настроено. Пожалуйста, включите BLOB_READ_WRITE_TOKEN в Vercel env.",
        });
        return;
      }
      const raw = Buffer.from(String(file.base64), "base64");
      const [attachment] = await db.insert(constructionTaskAttachmentsTable).values({
        companyId: req.scopedCompanyId!,
        taskId,
        uploadedBy: req.userId!,
        docType: String(file.mimeType).startsWith("image/") ? "photo" : "other",
        fileUrl: uploaded.url,
        fileName: String(file.fileName),
        mimeType: String(file.mimeType),
        fileSize: BigInt(raw.length),
      }).returning();
      if (attachment?.id) uploadedAttachmentIds.push(attachment.id);
    }
  }

  const [comment] = await db.insert(taskCommentsTable).values({
    companyId: req.scopedCompanyId!,
    taskId,
    userId: req.userId!,
    content: trimmed,
    commentType: type,
    parentCommentId: parentCommentId ? Number(parentCommentId) : null,
    mentions: mentionIds.length ? JSON.stringify(mentionIds) : null,
    attachmentIds: uploadedAttachmentIds.length
      ? JSON.stringify(uploadedAttachmentIds)
      : null,
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

  await logTaskActivity({
    companyId: req.scopedCompanyId!,
    taskId,
    userId: req.userId!,
    action: "comment_added",
    newValue: type,
    meta: {
      commentId: comment.id,
      mentions: mentionIds,
      attachmentIds: uploadedAttachmentIds,
      parentCommentId: parentCommentId ?? null,
    },
  });

  const recipients = [
    taskForComment.createdBy,
    taskForComment.assignedTo,
    ...mentionIds,
  ].filter((v): v is number => typeof v === "number");

  await notifyTaskEvent({
    companyId: req.scopedCompanyId!,
    taskId,
    fromUserId: req.userId!,
    recipientIds: recipients,
    type: mentionIds.length > 0 ? "task_comment_mention" : "task_comment",
    title: mentionIds.length > 0
      ? `Вас упомянули в задаче: ${taskForComment.title}`
      : `Новый комментарий по задаче: ${taskForComment.title}`,
    body: trimmed.slice(0, 220),
    color: "blue",
    metadata: {
      taskId,
      commentId: comment.id,
      mentions: mentionIds,
    },
  });

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

/** Себестоимость по проекту / этапу / задаче (операции + расходы + снабжение). */
router.get("/cost-summary", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const projectId = parseInt(String(req.query.projectId || ""), 10);
  if (!projectId) {
    res.status(400).json({ error: "projectId обязателен" });
    return;
  }

  const stageId = req.query.stageId ? parseInt(String(req.query.stageId), 10) : null;
  const taskId = req.query.taskId ? parseInt(String(req.query.taskId), 10) : null;

  const expenseFilters = [
    eq(constructionExpensesTable.companyId, companyId),
    eq(constructionExpensesTable.projectId, projectId),
  ];
  if (stageId) expenseFilters.push(eq(constructionExpensesTable.stageId, stageId));
  if (taskId) expenseFilters.push(eq(constructionExpensesTable.constructionTaskId, taskId));

  const expenses = await db
    .select()
    .from(constructionExpensesTable)
    .where(and(...expenseFilters));

  const stages = await db
    .select({ id: constructionStagesTable.id, name: constructionStagesTable.name })
    .from(constructionStagesTable)
    .where(
      and(
        eq(constructionStagesTable.companyId, companyId),
        eq(constructionStagesTable.projectId, projectId),
      ),
    );

  const tasks = await db
    .select({
      id: constructionTasksTable.id,
      title: constructionTasksTable.title,
      stageId: constructionTasksTable.stageId,
    })
    .from(constructionTasksTable)
    .where(
      and(
        eq(constructionTasksTable.companyId, companyId),
        eq(constructionTasksTable.projectId, projectId),
        ...(stageId ? [eq(constructionTasksTable.stageId, stageId)] : []),
        ...(taskId ? [eq(constructionTasksTable.id, taskId)] : []),
      ),
    );

  const expenseTotal = expenses.reduce((s, e) => s + parseNum(e.amountKgs ?? e.amount), 0);

  const byStage = new Map<number, number>();
  const byTask = new Map<number, number>();
  for (const e of expenses) {
    const amt = parseNum(e.amountKgs ?? e.amount);
    if (e.stageId) byStage.set(e.stageId, (byStage.get(e.stageId) ?? 0) + amt);
    if (e.constructionTaskId) {
      byTask.set(e.constructionTaskId, (byTask.get(e.constructionTaskId) ?? 0) + amt);
    }
  }

  res.json({
    projectId,
    totalKgs: expenseTotal,
    expensesCount: expenses.length,
    stages: stages.map((s) => ({
      ...s,
      costKgs: byStage.get(s.id) ?? 0,
    })),
    tasks: tasks.map((t) => ({
      ...t,
      costKgs: byTask.get(t.id) ?? 0,
      stageCostKgs: t.stageId ? byStage.get(t.stageId) ?? 0 : 0,
    })),
  });
});

export default router;
