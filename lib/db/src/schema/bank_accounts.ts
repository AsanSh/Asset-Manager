import { pgTable, serial, integer, varchar, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("cash"), // cash | bank | card
  bank: varchar("bank", { length: 256 }),
  bik: varchar("bik", { length: 64 }),
  accountNumber: varchar("account_number", { length: 64 }),
  currency: varchar("currency", { length: 8 }).notNull().default("KGS"),
  openingBalance: numeric("opening_balance").notNull().default("0"),
  currentBalance: numeric("current_balance").notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  notes: varchar("notes", { length: 1024 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({ id: true, createdAt: true });
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
