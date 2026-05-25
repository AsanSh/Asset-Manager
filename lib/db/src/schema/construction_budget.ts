import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionBudgetItemsTable = pgTable("construction_budget_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id"),
  category: text("category").notNull(),
  name: text("name").notNull(),
  plannedAmount: numeric("planned_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  actualAmount: numeric("actual_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  exchangeRateSource: text("exchange_rate_source").notNull().default("nbkr"),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }).default("1"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionBudgetItemSchema = createInsertSchema(constructionBudgetItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionBudgetItem = z.infer<typeof insertConstructionBudgetItemSchema>;
export type ConstructionBudgetItem = typeof constructionBudgetItemsTable.$inferSelect;
