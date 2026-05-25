import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectName: text("project_name").notNull(),
  block: text("block"),
  floor: integer("floor"),
  unitNumber: text("unit_number").notNull(),
  type: text("type").notNull().default("apartment"),
  area: numeric("area", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("available"),
  rentalStatus: text("rental_status"),
  marketValue: numeric("market_value", { precision: 18, scale: 2 }),
  comment: text("comment"),
  externalId: text("external_id"),
  sourceType: text("source_type"),
  syncStatus: text("sync_status"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
