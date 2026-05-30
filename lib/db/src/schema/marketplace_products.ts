import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Каталог материалов платформы (B2B-маркетплейс). Без company_id — общий для всех компаний. */
export const marketplaceProductsTable = pgTable("marketplace_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("materials"),
  unit: text("unit").notNull().default("шт"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  description: text("description"),
  imageUrl: text("image_url"),
  minOrderQty: numeric("min_order_qty", { precision: 12, scale: 3 }).default("1"),
  stockAvailable: numeric("stock_available", { precision: 12, scale: 3 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketplaceProductSchema = createInsertSchema(marketplaceProductsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceProduct = z.infer<typeof insertMarketplaceProductSchema>;
export type MarketplaceProduct = typeof marketplaceProductsTable.$inferSelect;
