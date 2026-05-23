import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionMaterialsTable = pgTable("construction_materials", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id"),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull().default("шт"),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  supplierId: integer("supplier_id"),
  status: text("status").notNull().default("planned"),
  deliveredAt: text("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionMaterialSchema = createInsertSchema(constructionMaterialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionMaterial = z.infer<typeof insertConstructionMaterialSchema>;
export type ConstructionMaterial = typeof constructionMaterialsTable.$inferSelect;
