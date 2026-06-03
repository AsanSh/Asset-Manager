import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  leaseContractId: integer("lease_contract_id").notNull(),
  accrualId: integer("accrual_id"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KZT"),
  /** Сумма, зачисленная на расчётный счёт (в валюте счёта). */
  accountAmount: numeric("account_amount", { precision: 14, scale: 2 }),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 }),
  exchangeRateDate: text("exchange_rate_date"),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method"),
  accountId: integer("account_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
