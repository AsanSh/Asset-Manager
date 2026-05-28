import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionSalesContractsTable = pgTable("construction_sales_contracts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  projectId: integer("project_id").notNull(),
  unitId: integer("unit_id"),
  buyerId: integer("buyer_id"), // references counterparties
  contractNumber: varchar("contract_number", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft | review | signed | cancelled | completed
  totalAmount: numeric("total_amount").notNull().default("0"),
  downPayment: numeric("down_payment").notNull().default("0"),
  remainingAmount: numeric("remaining_amount").notNull().default("0"),
  paidAmount: numeric("paid_amount").notNull().default("0"),
  installmentMonths: integer("installment_months").default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("KGS"),
  exchangeRate: numeric("exchange_rate").default("1"),
  contractDate: varchar("contract_date", { length: 16 }),
  signedAt: varchar("signed_at", { length: 16 }),
  handoverDate: varchar("handover_date", { length: 16 }),
  buyerName: varchar("buyer_name", { length: 256 }), // denormalized for quick display
  buyerPhone: varchar("buyer_phone", { length: 32 }),
  /** JSON: паспорт, дата рождения, род. падеж — дополнение к карточке контрагента */
  buyerMeta: text("buyer_meta"),
  contractDocumentMeta: text("contract_document_meta"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConstructionSalesContractSchema = createInsertSchema(constructionSalesContractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionSalesContract = z.infer<typeof insertConstructionSalesContractSchema>;
export type ConstructionSalesContract = typeof constructionSalesContractsTable.$inferSelect;
