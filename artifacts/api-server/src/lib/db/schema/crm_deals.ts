import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crmDealsTable = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  clientId: integer("client_id").notNull(),
  propertyId: integer("property_id"),
  dealAmount: numeric("deal_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  stage: text("stage").notNull().default("lead"), // lead/viewing/negotiation/contract/closed_won/closed_lost
  probability: integer("probability").default(10), // 0-100%
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  actualCloseDate: timestamp("actual_close_date", { withTimezone: true }),
  assignedUserId: integer("assigned_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCrmDealSchema = createInsertSchema(crmDealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmDeal = typeof crmDealsTable.$inferSelect;
