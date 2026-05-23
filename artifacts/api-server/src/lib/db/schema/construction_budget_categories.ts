import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionBudgetCategoriesTable = pgTable("construction_budget_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  plannedAmount: numeric("planned_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  spentAmount: numeric("spent_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  progressPercent: integer("progress_percent").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionBudgetCategorySchema = createInsertSchema(constructionBudgetCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionBudgetCategory = z.infer<typeof insertConstructionBudgetCategorySchema>;
export type ConstructionBudgetCategory = typeof constructionBudgetCategoriesTable.$inferSelect;
