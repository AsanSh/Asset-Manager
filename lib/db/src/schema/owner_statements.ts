import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ownerStatementsTable = pgTable("owner_statements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  propertyId: integer("property_id").notNull(),
  period: text("period").notNull(),
  rentCharged: numeric("rent_charged", { precision: 14, scale: 2 }).notNull().default("0"),
  rentReceived: numeric("rent_received", { precision: 14, scale: 2 }).notNull().default("0"),
  expenses: numeric("expenses", { precision: 14, scale: 2 }).notNull().default("0"),
  netIncome: numeric("net_income", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KZT"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOwnerStatementSchema = createInsertSchema(ownerStatementsTable).omit({ id: true, generatedAt: true });
export type InsertOwnerStatement = z.infer<typeof insertOwnerStatementSchema>;
export type OwnerStatement = typeof ownerStatementsTable.$inferSelect;
