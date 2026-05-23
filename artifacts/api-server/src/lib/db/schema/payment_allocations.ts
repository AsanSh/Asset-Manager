import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentAllocationsTable = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  paymentId: integer("payment_id").notNull(),
  accrualId: integer("accrual_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocationsTable).omit({ id: true, createdAt: true });
export type InsertPaymentAllocation = z.infer<typeof insertPaymentAllocationSchema>;
export type PaymentAllocation = typeof paymentAllocationsTable.$inferSelect;
