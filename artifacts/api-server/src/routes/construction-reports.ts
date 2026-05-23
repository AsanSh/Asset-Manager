import { Router } from "express";
import { eq, and } from "drizzle-orm";
import ExcelJS from "exceljs";
import {
  db,
  constructionProjectsTable,
  constructionBudgetCategoriesTable,
  constructionBudgetLineItemsTable,
  constructionUnitsTable,
  constructionExpensesTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT - PROJECT COST ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/projects/:id/reports/cost-analysis/excel", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.id as string);

  const [project] = await db.select().from(constructionProjectsTable)
    .where(and(eq(constructionProjectsTable.id, projectId), eq(constructionProjectsTable.companyId, req.companyId!)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const expenses = await db.select().from(constructionExpensesTable)
    .where(and(eq(constructionExpensesTable.projectId, projectId), eq(constructionExpensesTable.companyId, req.companyId!)));

  const units = await db.select().from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.projectId, projectId), eq(constructionUnitsTable.companyId, req.companyId!)));

  // Calculations
  const totalArea = parseFloat(project.totalArea || "0");
  const totalBudget = parseFloat(project.totalBudget || "0");
  const plannedCostPerSqm = parseFloat(project.costPerSqm || "0");
  const spentAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amountKgs || e.amount || "0"), 0);
  const actualCostPerSqm = totalArea > 0 ? spentAmount / totalArea : 0;
  const soldUnits = units.filter(u => u.status === "sold" || u.status === "registered");
  const totalRevenue = soldUnits.reduce((sum, u) => sum + parseFloat(u.totalPrice || "0"), 0);
  const profit = totalRevenue - spentAmount;
  const profitMargin = spentAmount > 0 ? (profit / spentAmount) * 100 : 0;

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Asset Manager";
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Сводка");
  summarySheet.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];

  summarySheet.addRows([
    { metric: "Название проекта", value: project.name },
    { metric: "Адрес", value: project.address || "—" },
    { metric: "Статус", value: project.status },
    { metric: "", value: "" },
    { metric: "ОБЩАЯ ИНФОРМАЦИЯ", value: "" },
    { metric: "Общая площадь, м²", value: totalArea.toLocaleString() },
    { metric: "Общий бюджет, сом", value: totalBudget.toLocaleString() },
    { metric: "Потрачено, сом", value: spentAmount.toLocaleString() },
    { metric: "", value: "" },
    { metric: "СЕБЕСТОИМОСТЬ", value: "" },
    { metric: "План за м², сом", value: plannedCostPerSqm.toLocaleString() },
    { metric: "Факт за м², сом", value: actualCostPerSqm.toLocaleString() },
    { metric: "Отклонение, %", value: plannedCostPerSqm > 0 ? ((actualCostPerSqm / plannedCostPerSqm - 1) * 100).toFixed(1) + "%" : "—" },
    { metric: "", value: "" },
    { metric: "ПРОДАЖИ", value: "" },
    { metric: "Всего юнитов", value: units.length },
    { metric: "Продано", value: soldUnits.length },
    { metric: "Выручка, сом", value: totalRevenue.toLocaleString() },
    { metric: "", value: "" },
    { metric: "ПРИБЫЛЬНОСТЬ", value: "" },
    { metric: "Прибыль, сом", value: profit.toLocaleString() },
    { metric: "Маржа, %", value: profitMargin.toFixed(1) + "%" },
    { metric: "ROI, %", value: totalBudget > 0 ? ((profit / totalBudget) * 100).toFixed(1) + "%" : "—" },
  ]);

  // Style header
  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Sheet 2: Expenses
  const expensesSheet = workbook.addWorksheet("Расходы");
  expensesSheet.columns = [
    { header: "Дата", key: "date", width: 12 },
    { header: "Категория", key: "category", width: 20 },
    { header: "Описание", key: "description", width: 40 },
    { header: "Сумма, сом", key: "amount", width: 15 },
  ];

  expenses.forEach(exp => {
    expensesSheet.addRow({
      date: exp.date || "—",
      category: exp.category || "—",
      description: exp.description || "—",
      amount: parseFloat(exp.amountKgs || exp.amount || "0").toLocaleString(),
    });
  });

  expensesSheet.getRow(1).font = { bold: true };
  expensesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  expensesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Sheet 3: Units
  const unitsSheet = workbook.addWorksheet("Юниты");
  unitsSheet.columns = [
    { header: "Номер", key: "unitNumber", width: 15 },
    { header: "Этаж", key: "floor", width: 10 },
    { header: "Площадь, м²", key: "area", width: 12 },
    { header: "Цена, сом", key: "price", width: 15 },
    { header: "Статус", key: "status", width: 15 },
  ];

  units.forEach(unit => {
    unitsSheet.addRow({
      unitNumber: unit.unitNumber,
      floor: unit.floor || "—",
      area: unit.area ? parseFloat(unit.area).toFixed(2) : "—",
      price: unit.totalPrice ? parseFloat(unit.totalPrice).toLocaleString() : "—",
      status: unit.status === "sold" ? "Продан" : unit.status === "reserved" ? "Забронирован" : "Доступен",
    });
  });

  unitsSheet.getRow(1).font = { bold: true };
  unitsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  unitsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Send file
  const filename = `${project.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_cost_analysis_${new Date().toISOString().split("T")[0]}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT - BUDGET PLAN/FACT
// ══════════════════════════════════════════════════════════════════════════════

router.get("/projects/:id/reports/budget/excel", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.id as string);

  const [project] = await db.select().from(constructionProjectsTable)
    .where(and(eq(constructionProjectsTable.id, projectId), eq(constructionProjectsTable.companyId, req.companyId!)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const categories = await db.select().from(constructionBudgetCategoriesTable)
    .where(and(eq(constructionBudgetCategoriesTable.projectId, projectId), eq(constructionBudgetCategoriesTable.companyId, req.companyId!)));

  const lineItems = await db.select().from(constructionBudgetLineItemsTable)
    .where(and(eq(constructionBudgetLineItemsTable.projectId, projectId), eq(constructionBudgetLineItemsTable.companyId, req.companyId!)));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Бюджет план/факт");

  sheet.columns = [
    { header: "Категория / Статья", key: "name", width: 40 },
    { header: "Ед.изм.", key: "unit", width: 10 },
    { header: "Кол-во", key: "quantity", width: 10 },
    { header: "Цена", key: "unitPrice", width: 12 },
    { header: "План, сом", key: "planned", width: 15 },
    { header: "Факт, сом", key: "spent", width: 15 },
    { header: "Отклонение, сом", key: "deviation", width: 15 },
    { header: "%", key: "percent", width: 10 },
  ];

  // Header
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

  categories.forEach(cat => {
    const planned = parseFloat(cat.plannedAmount || "0");
    const spent = parseFloat(cat.spentAmount || "0");
    const deviation = spent - planned;
    const percent = planned > 0 ? (spent / planned * 100).toFixed(1) : "0";

    // Category row
    const catRow = sheet.addRow({
      name: cat.name,
      unit: "",
      quantity: "",
      unitPrice: "",
      planned: planned.toLocaleString(),
      spent: spent.toLocaleString(),
      deviation: deviation.toLocaleString(),
      percent: percent + "%",
    });
    catRow.font = { bold: true };
    catRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };

    // Line items
    const items = lineItems.filter(item => item.categoryId === cat.id);
    items.forEach(item => {
      const itemPlanned = parseFloat(item.plannedAmount || "0");
      const itemSpent = parseFloat(item.spentAmount || "0");
      const itemDeviation = itemSpent - itemPlanned;
      const itemPercent = itemPlanned > 0 ? (itemSpent / itemPlanned * 100).toFixed(1) : "0";

      sheet.addRow({
        name: "  " + item.name,
        unit: item.unit || "",
        quantity: item.quantity ? parseFloat(item.quantity).toString() : "",
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice).toLocaleString() : "",
        planned: itemPlanned.toLocaleString(),
        spent: itemSpent.toLocaleString(),
        deviation: itemDeviation.toLocaleString(),
        percent: itemPercent + "%",
      });
    });
  });

  // Totals
  const totalPlanned = categories.reduce((sum, cat) => sum + parseFloat(cat.plannedAmount || "0"), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + parseFloat(cat.spentAmount || "0"), 0);
  const totalDeviation = totalSpent - totalPlanned;
  const totalPercent = totalPlanned > 0 ? (totalSpent / totalPlanned * 100).toFixed(1) : "0";

  sheet.addRow({});
  const totalRow = sheet.addRow({
    name: "ИТОГО",
    unit: "",
    quantity: "",
    unitPrice: "",
    planned: totalPlanned.toLocaleString(),
    spent: totalSpent.toLocaleString(),
    deviation: totalDeviation.toLocaleString(),
    percent: totalPercent + "%",
  });
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  totalRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${project.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_budget_${new Date().toISOString().split("T")[0]}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});

export default router;
