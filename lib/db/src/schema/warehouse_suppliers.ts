import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseSuppliersTable = pgTable("warehouse_suppliers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  inn: text("inn"),
  contractNumber: text("contract_number"),
  contractDocumentMeta: text("contract_document_meta"),
  contractAmount: numeric("contract_amount", { precision: 15, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("KGS"),
  paymentTerms: text("payment_terms"),
  rating: integer("rating"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWarehouseSupplierSchema = createInsertSchema(warehouseSuppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseSupplier = z.infer<typeof insertWarehouseSupplierSchema>;
export type WarehouseSupplier = typeof warehouseSuppliersTable.$inferSelect;
