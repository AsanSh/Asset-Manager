import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Заявка компании на покупку материала из маркетплейса. */
export const marketplaceOrdersTable = pgTable("marketplace_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  /** Связь со стройкой — куда пойдут материалы */
  projectId: integer("project_id"),
  requestedByUserId: integer("requested_by_user_id"),
  status: text("status").notNull().default("pending"),
  // pending | confirmed | shipped | fulfilled | cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketplaceOrderSchema = createInsertSchema(marketplaceOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceOrder = z.infer<typeof insertMarketplaceOrderSchema>;
export type MarketplaceOrder = typeof marketplaceOrdersTable.$inferSelect;
