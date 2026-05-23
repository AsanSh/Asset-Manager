import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseOutgoingTable = pgTable("warehouse_outgoing", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  recipientType: text("recipient_type").notNull().default("construction_project"),
  recipientId: integer("recipient_id"),
  purpose: text("purpose"),
  documentNumber: text("document_number"),
  issuedBy: text("issued_by"),
  issuedDate: text("issued_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWarehouseOutgoingSchema = createInsertSchema(warehouseOutgoingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseOutgoing = z.infer<typeof insertWarehouseOutgoingSchema>;
export type WarehouseOutgoing = typeof warehouseOutgoingTable.$inferSelect;
