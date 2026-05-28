import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionSupplementsTable = pgTable("construction_supplements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  unitId: integer("unit_id").notNull(),
  contractId: integer("contract_id"),
  oldArea: numeric("old_area", { precision: 10, scale: 2 }).notNull(),
  newArea: numeric("new_area", { precision: 10, scale: 2 }).notNull(),
  pricePerSqm: numeric("price_per_sqm", { precision: 15, scale: 2 }).notNull(),
  balanceDelta: numeric("balance_delta", { precision: 15, scale: 2 }).notNull(),
  // positive = client owes company, negative = company owes client
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("draft"),
  // draft | signed | cancelled
  documentMeta: text("document_meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
});

export const insertConstructionSupplementSchema = createInsertSchema(constructionSupplementsTable).omit({ id: true, createdAt: true });
export type InsertConstructionSupplement = z.infer<typeof insertConstructionSupplementSchema>;
export type ConstructionSupplement = typeof constructionSupplementsTable.$inferSelect;
