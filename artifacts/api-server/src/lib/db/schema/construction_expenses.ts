import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionExpensesTable = pgTable("construction_expenses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id"),
  budgetItemId: integer("budget_item_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  exchangeRateSource: text("exchange_rate_source").notNull().default("nbkr"),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }).default("1"),
  amountKgs: numeric("amount_kgs", { precision: 15, scale: 2 }),
  contractorId: integer("contractor_id"),
  date: text("date").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  status: text("status").notNull().default("pending"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionExpenseSchema = createInsertSchema(constructionExpensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionExpense = z.infer<typeof insertConstructionExpenseSchema>;
export type ConstructionExpense = typeof constructionExpensesTable.$inferSelect;
