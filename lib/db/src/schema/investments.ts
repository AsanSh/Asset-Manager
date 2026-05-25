import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  propertyId: integer("property_id").notNull(),
  investorId: integer("investor_id").notNull(),
  sharePercent: numeric("share_percent", { precision: 5, scale: 2 }).notNull(),
  capitalInvested: numeric("capital_invested", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  investedAt: text("invested_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;
