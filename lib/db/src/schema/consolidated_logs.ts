import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const consolidatedLogsTable = pgTable("consolidated_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  module: text("module").notNull(),
  // arenda | kontrol | zakup | crm
  operationType: text("operation_type").notNull(),
  // income | expense | contract | payment | accrual
  amount: numeric("amount", { precision: 15, scale: 2 }),
  currency: text("currency").default("KGS"),
  counterpartyId: integer("counterparty_id"),
  counterpartyName: text("counterparty_name"),
  description: text("description"),
  sourceTable: text("source_table"),
  sourceId: integer("source_id"),
  operationDate: date("operation_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConsolidatedLogSchema = createInsertSchema(consolidatedLogsTable).omit({ id: true, createdAt: true });
export type InsertConsolidatedLog = z.infer<typeof insertConsolidatedLogSchema>;
export type ConsolidatedLog = typeof consolidatedLogsTable.$inferSelect;
