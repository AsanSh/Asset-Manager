import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Chess-board units for construction projects (apartments, offices, etc.)
export const constructionUnitsTable = pgTable("construction_units", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  unitNumber: text("unit_number").notNull(),
  floor: integer("floor"),
  block: text("block"),
  unitType: text("unit_type").notNull().default("apartment"),
  roomCount: integer("room_count"),
  area: numeric("area", { precision: 8, scale: 2 }),
  pricePerSqm: numeric("price_per_sqm", { precision: 12, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("available"),
  buyerId: integer("buyer_id"),
  contractDate: text("contract_date"),

  // Sales integration
  salesContractId: integer("sales_contract_id"),
  clientId: integer("client_id"),
  salePrice: numeric("sale_price", { precision: 15, scale: 2 }),
  saleDate: text("sale_date"),
  registrationDate: text("registration_date"),

  // Construction progress
  progressPercent: integer("progress_percent").default(0),

  notes: text("notes"),

  // PTO area modification tracking
  originalArea: numeric("original_area", { precision: 10, scale: 2 }),
  areaModified: boolean("area_modified").default(false),
  areaModifiedBy: integer("area_modified_by"),
  areaModifiedAt: timestamp("area_modified_at", { withTimezone: true }),
  areaDelta: numeric("area_delta", { precision: 10, scale: 2 }),
  recalculationPrice: numeric("recalculation_price", { precision: 15, scale: 2 }),
  supplementStatus: text("supplement_status").default("none"),
  areaChangeDocumentMeta: text("area_change_document_meta"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionUnitSchema = createInsertSchema(constructionUnitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionUnit = z.infer<typeof insertConstructionUnitSchema>;
export type ConstructionUnit = typeof constructionUnitsTable.$inferSelect;
