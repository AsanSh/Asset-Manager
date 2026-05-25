import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionAccrualsTable = pgTable("construction_accruals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  contractId: integer("contract_id").notNull(),
  projectId: integer("project_id"),
  installmentNumber: integer("installment_number").notNull().default(1), // 1,2,3...
  dueDate: varchar("due_date", { length: 16 }).notNull(),
  amount: numeric("amount").notNull().default("0"),
  paidAmount: numeric("paid_amount").notNull().default("0"),
  remainingAmount: numeric("remaining_amount").notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending | paid | partial | overdue
  paidAt: varchar("paid_at", { length: 16 }),
  currency: varchar("currency", { length: 8 }).notNull().default("KGS"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConstructionAccrualSchema = createInsertSchema(constructionAccrualsTable).omit({ id: true, createdAt: true });
export type InsertConstructionAccrual = z.infer<typeof insertConstructionAccrualSchema>;
export type ConstructionAccrual = typeof constructionAccrualsTable.$inferSelect;
