import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investorsTable = pgTable("investors", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  fullName: text("full_name").notNull(),
  type: text("type").notNull().default("individual"),
  phone: text("phone"),
  email: text("email"),
  iin: text("iin"),
  telegramId: text("telegram_id"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  counterpartyId: integer("counterparty_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestorSchema = createInsertSchema(investorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investorsTable.$inferSelect;
