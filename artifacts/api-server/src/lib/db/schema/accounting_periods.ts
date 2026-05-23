import { pgTable, serial, integer, text, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountingPeriodsTable = pgTable("accounting_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  module: text("module").notNull().default("rental"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
});

export const insertAccountingPeriodSchema = createInsertSchema(accountingPeriodsTable).omit({ id: true });
export type InsertAccountingPeriod = z.infer<typeof insertAccountingPeriodSchema>;
export type AccountingPeriod = typeof accountingPeriodsTable.$inferSelect;
