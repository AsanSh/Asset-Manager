import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const financeReconciliationLinesTable = pgTable("finance_reconciliation_lines", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  source: varchar("source", { length: 16 }).notNull(), // one_c | bank | manual
  externalRef: varchar("external_ref", { length: 256 }),
  pairGroupId: varchar("pair_group_id", { length: 64 }),
  operationDate: varchar("operation_date", { length: 16 }).notNull(),
  amount: numeric("amount").notNull().default("0"),
  currency: varchar("currency", { length: 8 }).notNull().default("KGS"),
  counterpartyName: varchar("counterparty_name", { length: 256 }),
  counterpartyInn: varchar("counterparty_inn", { length: 32 }),
  description: text("description"),
  bankAccountRef: varchar("bank_account_ref", { length: 128 }),
  rawPayload: text("raw_payload"),
  matchStatus: varchar("match_status", { length: 32 }).notNull().default("unmatched"), // unmatched | matched | conflict
  reviewStatus: varchar("review_status", { length: 32 }).notNull().default("inbox"), // inbox | suggested | confirmed | posted | rejected
  suggestedProjectId: integer("suggested_project_id"),
  suggestedCategory: varchar("suggested_category", { length: 128 }),
  suggestedStageId: integer("suggested_stage_id"),
  suggestionReason: text("suggestion_reason"),
  confirmedProjectId: integer("confirmed_project_id"),
  confirmedCategory: varchar("confirmed_category", { length: 128 }),
  confirmedStageId: integer("confirmed_stage_id"),
  constructionOperationId: integer("construction_operation_id"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceReconciliationLineSchema = createInsertSchema(
  financeReconciliationLinesTable,
).omit({ id: true, createdAt: true });

export type InsertFinanceReconciliationLine = z.infer<
  typeof insertFinanceReconciliationLineSchema
>;
export type FinanceReconciliationLine =
  typeof financeReconciliationLinesTable.$inferSelect;
