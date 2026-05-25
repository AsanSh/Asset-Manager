import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionBudgetLineItemsTable = pgTable("construction_budget_line_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit"),                          // тонн, м³, м², шт
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  plannedAmount: numeric("planned_amount", { precision: 15, scale: 2 }).notNull(),
  spentAmount: numeric("spent_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  supplierId: integer("supplier_id"),          // связь с контрагентами
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionBudgetLineItemSchema = createInsertSchema(constructionBudgetLineItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionBudgetLineItem = z.infer<typeof insertConstructionBudgetLineItemSchema>;
export type ConstructionBudgetLineItem = typeof constructionBudgetLineItemsTable.$inferSelect;
