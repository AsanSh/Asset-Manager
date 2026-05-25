import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moduleSettingsTable = pgTable("module_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  moduleKey: text("module_key").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  settings: text("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertModuleSettingSchema = createInsertSchema(moduleSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertModuleSetting = z.infer<typeof insertModuleSettingSchema>;
export type ModuleSetting = typeof moduleSettingsTable.$inferSelect;
