import { pgTable, text, serial, timestamp, boolean, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const legalEntitiesTable = pgTable("legal_entities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  fullLegalName: text("full_legal_name").notNull(),
  inn: varchar("inn", { length: 64 }).notNull(), // ИНН/ИНО
  address: text("address"),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 256 }),
  directorName: varchar("director_name", { length: 256 }),
  accountant: varchar("accountant", { length: 256 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLegalEntitySchema = createInsertSchema(legalEntitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = typeof legalEntitiesTable.$inferSelect;
