import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  contractNumber: text("contract_number").notNull(),
  contractDate: text("contract_date"),
  type: text("type").notNull().default("sale"),
  counterpartyId: integer("counterparty_id"),
  propertyId: integer("property_id"),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  currency: text("currency").default("KZT"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  accrualDate: text("accrual_date"),
  deposit: numeric("deposit", { precision: 14, scale: 2 }),
  status: text("status").notNull().default("draft"),
  comment: text("comment"),
  externalId: text("external_id"),
  sourceType: text("source_type"),
  syncStatus: text("sync_status"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
