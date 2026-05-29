import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const counterpartiesTable = pgTable("counterparties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  // type: юридическое лицо / физическое лицо
  type: text("type").notNull().default("individual"),
  // category: legacy одиночная роль (deprecated, оставлено для обратной совместимости)
  category: text("category").notNull().default("other"),
  // categories: массив ролей контрагента (tenant, landlord, buyer, lead, material_supplier, service_provider, subcontractor, other)
  categories: text("categories").array(),
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
