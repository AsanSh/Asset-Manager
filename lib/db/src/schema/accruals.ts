import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accrualsTable = pgTable("accruals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  leaseContractId: integer("lease_contract_id").notNull(),
  period: text("period").notNull(),
  accrualType: text("accrual_type").notNull().default("rent"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  dueDate: text("due_date").notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  // Льготы / скидки
  discountType: text("discount_type"),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
  discountReason: text("discount_reason"),
  gracePeriodDays: integer("grace_period_days"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAccrualSchema = createInsertSchema(accrualsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccrual = z.infer<typeof insertAccrualSchema>;
export type Accrual = typeof accrualsTable.$inferSelect;
