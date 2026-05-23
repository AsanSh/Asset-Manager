import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crmSalesPropertiesTable = pgTable("crm_sales_properties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  propertyId: integer("property_id").notNull(),
  salePrice: numeric("sale_price", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("available"), // available/reserved/sold
  marketingDescription: text("marketing_description"),
  photos: jsonb("photos"), // Array of URLs
  availableFrom: timestamp("available_from", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCrmSalesPropertySchema = createInsertSchema(crmSalesPropertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmSalesProperty = z.infer<typeof insertCrmSalesPropertySchema>;
export type CrmSalesProperty = typeof crmSalesPropertiesTable.$inferSelect;
