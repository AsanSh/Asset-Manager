import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  constructionProjectsTable,
  constructionBudgetCategoriesTable,
  constructionBudgetLineItemsTable,
  constructionExpensesTable,
  notificationsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET CATEGORIES
// ══════════════════════════════════════════════════════════════════════════════

// GET /construction/projects/:projectId/budget - Get full budget structure
router.get("/projects/:projectId/budget", async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);

  const [project] = await db.select().from(constructionProjectsTable)
    .where(and(eq(constructionProjectsTable.id, projectId), eq(constructionProjectsTable.companyId, req.scopedCompanyId!)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Get categories
  const categories = await db.select().from(constructionBudgetCategoriesTable)
    .where(and(
      eq(constructionBudgetCategoriesTable.projectId, projectId),
      eq(constructionBudgetCategoriesTable.companyId, req.scopedCompanyId!)
    ))
    .orderBy(constructionBudgetCategoriesTable.sortOrder);

  // Get line items for all categories
  const lineItems = await db.select().from(constructionBudgetLineItemsTable)
    .where(and(
      eq(constructionBudgetLineItemsTable.projectId, projectId),
      eq(constructionBudgetLineItemsTable.companyId, req.scopedCompanyId!)
    ));

  // Calculate totals
  const totalPlanned = categories.reduce((sum, cat) => sum + parseFloat(cat.plannedAmount || "0"), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + parseFloat(cat.spentAmount || "0"), 0);
  const budgetProgress = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

  // Group line items by category
  const categoriesWithItems = categories.map(cat => {
    const items = lineItems.filter(item => item.categoryId === cat.id);
    const categoryPlanned = parseFloat(cat.plannedAmount || "0");
    const categorySpent = parseFloat(cat.spentAmount || "0");
    const progress = categoryPlanned > 0 ? (categorySpent / categoryPlanned) * 100 : 0;

    return {
      ...cat,
      items,
      progress,
      deviation: categorySpent - categoryPlanned,
      deviationPercent: categoryPlanned > 0 ? ((categorySpent / categoryPlanned - 1) * 100) : 0,
    };
  });

  res.json({
    project: {
      id: project.id,
      name: project.name,
      totalBudget: project.totalBudget,
    },
    summary: {
      totalPlanned,
      totalSpent,
      remaining: totalPlanned - totalSpent,
      budgetProgress,
      categoriesCount: categories.length,
      lineItemsCount: lineItems.length,
    },
    categories: categoriesWithItems,
  });
});

// POST /construction/projects/:projectId/budget/categories - Create category
router.post("/projects/:projectId/budget/categories", async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  const { name, description, plannedAmount } = req.body;

  const [category] = await db.insert(constructionBudgetCategoriesTable).values({
    companyId: req.scopedCompanyId!,
    projectId,
    name,
    description: description || null,
    plannedAmount: plannedAmount ? String(plannedAmount) : "0",
    spentAmount: "0",
    progressPercent: 0,
  }).returning();

  res.status(201).json(category);
});

// PATCH /construction/budget/categories/:id - Update category
router.patch("/budget/categories/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, description, plannedAmount } = req.body;

  const [category] = await db.update(constructionBudgetCategoriesTable)
    .set({
      name,
      description,
      plannedAmount: plannedAmount ? String(plannedAmount) : undefined,
    })
    .where(and(
      eq(constructionBudgetCategoriesTable.id, id),
      eq(constructionBudgetCategoriesTable.companyId, req.scopedCompanyId!)
    ))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(category);
});

// DELETE /construction/budget/categories/:id
router.delete("/budget/categories/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  // Delete line items first
  await db.delete(constructionBudgetLineItemsTable)
    .where(and(
      eq(constructionBudgetLineItemsTable.categoryId, id),
      eq(constructionBudgetLineItemsTable.companyId, req.scopedCompanyId!)
    ));

  // Delete category
  await db.delete(constructionBudgetCategoriesTable)
    .where(and(
      eq(constructionBudgetCategoriesTable.id, id),
      eq(constructionBudgetCategoriesTable.companyId, req.scopedCompanyId!)
    ));

  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET LINE ITEMS
// ══════════════════════════════════════════════════════════════════════════════

// POST /construction/projects/:projectId/budget/line-items
router.post("/projects/:projectId/budget/line-items", async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  const { categoryId, name, unit, quantity, unitPrice, plannedAmount, notes } = req.body;

  const [item] = await db.insert(constructionBudgetLineItemsTable).values({
    companyId: req.scopedCompanyId!,
    projectId,
    categoryId,
    name,
    unit: unit || null,
    quantity: quantity ? String(quantity) : null,
    unitPrice: unitPrice ? String(unitPrice) : null,
    plannedAmount: String(plannedAmount),
    spentAmount: "0",
    notes: notes || null,
  }).returning();

  // Update category planned amount
  await updateCategoryTotals(categoryId, req.scopedCompanyId!);

  res.status(201).json(item);
});

// PATCH /construction/budget/line-items/:id
router.patch("/budget/line-items/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, unit, quantity, unitPrice, plannedAmount, spentAmount, notes } = req.body;

  const [item] = await db.update(constructionBudgetLineItemsTable)
    .set({
      name,
      unit,
      quantity: quantity ? String(quantity) : undefined,
      unitPrice: unitPrice ? String(unitPrice) : undefined,
      plannedAmount: plannedAmount ? String(plannedAmount) : undefined,
      spentAmount: spentAmount ? String(spentAmount) : undefined,
      notes,
    })
    .where(and(
      eq(constructionBudgetLineItemsTable.id, id),
      eq(constructionBudgetLineItemsTable.companyId, req.scopedCompanyId!)
    ))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }

  // Update category totals
  await updateCategoryTotals(item.categoryId, req.scopedCompanyId!);

  // Check for budget alerts
  await checkBudgetAlerts(item.projectId, req.scopedCompanyId!);

  res.json(item);
});

// DELETE /construction/budget/line-items/:id
router.delete("/budget/line-items/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const [item] = await db.select().from(constructionBudgetLineItemsTable)
    .where(and(
      eq(constructionBudgetLineItemsTable.id, id),
      eq(constructionBudgetLineItemsTable.companyId, req.scopedCompanyId!)
    ));

  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }

  await db.delete(constructionBudgetLineItemsTable)
    .where(and(
      eq(constructionBudgetLineItemsTable.id, id),
      eq(constructionBudgetLineItemsTable.companyId, req.scopedCompanyId!)
    ));

  // Update category totals
  await updateCategoryTotals(item.categoryId, req.scopedCompanyId!);

  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function updateCategoryTotals(categoryId: number, companyId: number) {
  // Get all line items for this category
  const items = await db.select().from(constructionBudgetLineItemsTable)
    .where(and(
      eq(constructionBudgetLineItemsTable.categoryId, categoryId),
      eq(constructionBudgetLineItemsTable.companyId, companyId)
    ));

  const totalPlanned = items.reduce((sum, item) => sum + parseFloat(item.plannedAmount || "0"), 0);
  const totalSpent = items.reduce((sum, item) => sum + parseFloat(item.spentAmount || "0"), 0);
  const progress = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  // Update category
  await db.update(constructionBudgetCategoriesTable)
    .set({
      plannedAmount: String(totalPlanned),
      spentAmount: String(totalSpent),
      progressPercent: progress,
    })
    .where(eq(constructionBudgetCategoriesTable.id, categoryId));
}

async function checkBudgetAlerts(projectId: number, companyId: number) {
  // Get project and budget
  const [project] = await db.select().from(constructionProjectsTable)
    .where(eq(constructionProjectsTable.id, projectId));

  if (!project) return;

  const categories = await db.select().from(constructionBudgetCategoriesTable)
    .where(eq(constructionBudgetCategoriesTable.projectId, projectId));

  const totalPlanned = categories.reduce((sum, cat) => sum + parseFloat(cat.plannedAmount || "0"), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + parseFloat(cat.spentAmount || "0"), 0);
  const budgetProgress = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

  // Alert if budget exceeded by 10%
  if (budgetProgress > 110) {
    await db.insert(notificationsTable).values({
      companyId,
      userId: null, // For all users
      type: "budget_exceeded",
      title: "Превышение бюджета!",
      body: `Бюджет проекта "${project.name}" превышен на ${Math.round(budgetProgress - 100)}%`,
      message: `Запланировано: ${totalPlanned.toLocaleString()} сом, Потрачено: ${totalSpent.toLocaleString()} сом`,
      icon: "alert-circle",
      color: "red",
      link: `/construction/projects/${projectId}/budget`,
      isRead: false,
      read: false,
    });
  }
  // Warning if budget approaching 90%
  else if (budgetProgress > 90 && budgetProgress <= 100) {
    await db.insert(notificationsTable).values({
      companyId,
      userId: null,
      type: "budget_warning",
      title: "Бюджет на исходе",
      body: `Бюджет проекта "${project.name}" израсходован на ${Math.round(budgetProgress)}%`,
      message: `Осталось: ${(totalPlanned - totalSpent).toLocaleString()} сом`,
      icon: "alert-triangle",
      color: "yellow",
      link: `/construction/projects/${projectId}/budget`,
      isRead: false,
      read: false,
    });
  }
}

export default router;
