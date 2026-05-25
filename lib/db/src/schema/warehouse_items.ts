import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseItemsTable = pgTable("warehouse_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("materials"),
  unit: text("unit").notNull().default("шт"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 12, scale: 3 }).default("0"),
  maxStock: numeric("max_stock", { precision: 12, scale: 3 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("KGS"),
  supplier: text("supplier"),
  sku: text("sku"),
  barcode: text("barcode"),
  location: text("location"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWarehouseItemSchema = createInsertSchema(warehouseItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseItem = z.infer<typeof insertWarehouseItemSchema>;
export type WarehouseItem = typeof warehouseItemsTable.$inferSelect;
