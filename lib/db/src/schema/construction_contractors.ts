import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionContractorsTable = pgTable("construction_contractors", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  counterpartyId: integer("counterparty_id"),
  fullName: text("full_name").notNull(),
  type: text("type").notNull().default("company"),
  specialization: text("specialization"),
  phone: text("phone"),
  email: text("email"),
  inn: text("inn"),
  contractNumber: text("contract_number"),
  contractAmount: numeric("contract_amount", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("active"),
  rating: integer("rating"),
  notes: text("notes"),
  okpo: text("okpo"),
  bic: text("bic"),
  stageId: integer("stage_id"),
  paymentMilestones: text("payment_milestones"),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  documentPath: text("document_path"),
  contractDocumentMeta: text("contract_document_meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionContractorSchema = createInsertSchema(constructionContractorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionContractor = z.infer<typeof insertConstructionContractorSchema>;
export type ConstructionContractor = typeof constructionContractorsTable.$inferSelect;
