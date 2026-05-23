import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const counterpartiesTable = pgTable("counterparties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  // type: юридическое лицо / физическое лицо
  type: text("type").notNull().default("individual"),
  // category: роль контрагента в системе
  category: text("category").notNull().default("other"),
  fullName: text("full_name").notNull(),
  iin: text("iin"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  additionalContact: text("additional_contact"),
  comment: text("comment"),
  externalId: text("external_id"),
  sourceType: text("source_type"),
  syncStatus: text("sync_status"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCounterpartySchema = createInsertSchema(counterpartiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCounterparty = z.infer<typeof insertCounterpartySchema>;
export type Counterparty = typeof counterpartiesTable.$inferSelect;
