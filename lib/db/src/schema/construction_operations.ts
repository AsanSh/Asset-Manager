import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionOperationsTable = pgTable("construction_operations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  projectId: integer("project_id"),
  type: varchar("type", { length: 32 }).notNull().default("expense"), // income | expense | transfer
  category: varchar("category", { length: 128 }),
  fromAccountId: integer("from_account_id"),
  toAccountId: integer("to_account_id"),
  contractorId: integer("contractor_id"),
  contractId: integer("contract_id"),
  amount: numeric("amount").notNull().default("0"),
  currency: varchar("currency", { length: 8 }).notNull().default("KGS"),
  exchangeRateSource: varchar("exchange_rate_source", { length: 32 }).default("nbkr"),
  exchangeRate: numeric("exchange_rate").notNull().default("1"),
  amountKgs: numeric("amount_kgs").notNull().default("0"),
  date: varchar("date", { length: 16 }).notNull(),
  description: text("description").notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).default("cash"), // cash | transfer | card
  status: varchar("status", { length: 32 }).notNull().default("approved"), // pending | approved | cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConstructionOperationSchema = createInsertSchema(constructionOperationsTable).omit({ id: true, createdAt: true });
export type InsertConstructionOperation = z.infer<typeof insertConstructionOperationSchema>;
export type ConstructionOperation = typeof constructionOperationsTable.$inferSelect;
