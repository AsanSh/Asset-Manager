import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseIncomingTable = pgTable("warehouse_incoming", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  supplierId: integer("supplier_id"),
  documentNumber: text("document_number"),
  documentDate: text("document_date"),
  warehouseLocation: text("warehouse_location"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWarehouseIncomingSchema = createInsertSchema(warehouseIncomingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseIncoming = z.infer<typeof insertWarehouseIncomingSchema>;
export type WarehouseIncoming = typeof warehouseIncomingTable.$inferSelect;
