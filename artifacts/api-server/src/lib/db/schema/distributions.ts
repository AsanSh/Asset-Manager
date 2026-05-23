import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const distributionsTable = pgTable("distributions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  propertyId: integer("property_id").notNull(),
  period: text("period").notNull(),
  grossIncome: numeric("gross_income", { precision: 15, scale: 2 }).notNull().default("0"),
  expenses: numeric("expenses", { precision: 15, scale: 2 }).notNull().default("0"),
  netProfit: numeric("net_profit", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDistributionSchema = createInsertSchema(distributionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type Distribution = typeof distributionsTable.$inferSelect;
