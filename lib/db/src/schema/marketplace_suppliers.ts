import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Поставщик каталога платформенного маркетплейса (super_admin). */
export const marketplaceSuppliersTable = pgTable("marketplace_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketplaceSupplierSchema = createInsertSchema(marketplaceSuppliersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceSupplier = z.infer<typeof insertMarketplaceSupplierSchema>;
export type MarketplaceSupplier = typeof marketplaceSuppliersTable.$inferSelect;
