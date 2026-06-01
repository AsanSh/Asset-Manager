import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** M:N связь проектов и юрлиц (ОсОО). */
export const projectLegalEntitiesTable = pgTable("project_legal_entities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  projectId: integer("project_id").notNull(),
  legalEntityId: integer("legal_entity_id").notNull(),
  role: text("role").notNull().default("owner"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectLegalEntitySchema = createInsertSchema(projectLegalEntitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectLegalEntity = z.infer<typeof insertProjectLegalEntitySchema>;
export type ProjectLegalEntity = typeof projectLegalEntitiesTable.$inferSelect;
