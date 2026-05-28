import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseSupplierPaymentsTable = pgTable("warehouse_supplier_payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  date: text("date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWarehouseSupplierPaymentSchema = createInsertSchema(warehouseSupplierPaymentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWarehouseSupplierPayment = z.infer<typeof insertWarehouseSupplierPaymentSchema>;
export type WarehouseSupplierPayment = typeof warehouseSupplierPaymentsTable.$inferSelect;
