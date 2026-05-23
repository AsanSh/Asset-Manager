import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crmSalesContractsTable = pgTable("crm_sales_contracts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  contractNumber: text("contract_number").notNull(),
  clientId: integer("client_id").notNull(),
  propertyId: integer("property_id").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  paymentSchedule: jsonb("payment_schedule"), // Array of {date, amount, status}
  signDate: timestamp("sign_date", { withTimezone: true }),
  registrationDate: timestamp("registration_date", { withTimezone: true }),
  status: text("status").notNull().default("draft"), // draft/signed/registered/cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCrmSalesContractSchema = createInsertSchema(crmSalesContractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmSalesContract = z.infer<typeof insertCrmSalesContractSchema>;
export type CrmSalesContract = typeof crmSalesContractsTable.$inferSelect;
