import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crmLeadsTable = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  source: text("source"), // call/website/referral/advertising/other
  status: text("status").notNull().default("new"), // new/contacted/qualified/lost/converted
  propertyType: text("property_type"), // apartment/commercial/land/etc
  budget: numeric("budget", { precision: 15, scale: 2 }),
  currency: text("currency").default("KGS"),
  notes: text("notes"),
  assignedUserId: integer("assigned_user_id"),
  createdBy: integer("created_by"),
  leadDate: timestamp("lead_date", { withTimezone: true }).notNull().defaultNow(),
  lastContactDate: timestamp("last_contact_date", { withTimezone: true }),
  conversionDate: timestamp("conversion_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCrmLeadSchema = createInsertSchema(crmLeadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeadsTable.$inferSelect;
