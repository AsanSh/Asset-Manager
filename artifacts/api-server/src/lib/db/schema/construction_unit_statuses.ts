import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const constructionUnitStatusesTable = pgTable("construction_unit_statuses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  code: text("code").notNull(),
  label: text("label").notNull(),
  colorKey: text("color_key").notNull().default("slate"),
  sortOrder: integer("sort_order").notNull().default(0),
  isSystem: boolean("is_system").notNull().default(false),
  /** none | reserved | sold — открывает оформление продажи */
  saleMode: text("sale_mode").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
