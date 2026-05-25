import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crmClientsTable = pgTable("crm_clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  fullName: text("full_name").notNull(),
  type: text("type").notNull().default("individual"), // individual/company
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  inn: text("inn"), // Tax ID
  passportData: text("passport_data"),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  budget: numeric("budget", { precision: 15, scale: 2 }),
  currency: text("currency").default("KGS"),
  creditApproved: text("credit_approved"), // yes/no/pending
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active/inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCrmClientSchema = createInsertSchema(crmClientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmClient = z.infer<typeof insertCrmClientSchema>;
export type CrmClient = typeof crmClientsTable.$inferSelect;
