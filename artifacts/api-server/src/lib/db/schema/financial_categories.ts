import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const financialCategoriesTable = pgTable("financial_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"),
  parentId: integer("parent_id"),
  module: text("module").notNull().default("all"),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertFinancialCategorySchema = createInsertSchema(financialCategoriesTable).omit({ id: true });
export type InsertFinancialCategory = z.infer<typeof insertFinancialCategorySchema>;
export type FinancialCategory = typeof financialCategoriesTable.$inferSelect;
