import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehouseInventoryTable = pgTable("warehouse_inventory", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  inventoryDate: text("inventory_date").notNull(),
  status: text("status").notNull().default("in_progress"),
  items: jsonb("items").notNull(),
  conductedBy: text("conducted_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWarehouseInventorySchema = createInsertSchema(warehouseInventoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseInventory = z.infer<typeof insertWarehouseInventorySchema>;
export type WarehouseInventory = typeof warehouseInventoryTable.$inferSelect;
