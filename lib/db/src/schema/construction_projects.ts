import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionProjectsTable = pgTable("construction_projects", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  name: text("name").notNull(),
  address: text("address"),
  region: text("region"),
  status: text("status").notNull().default("planning"),

  // Building characteristics
  buildingType: text("building_type").notNull().default("apartment"),
  constructionType: text("construction_type").notNull().default("monolith"),
  totalFloors: integer("total_floors"),
  totalUnits: integer("total_units"),
  totalArea: numeric("total_area", { precision: 12, scale: 2 }),

  // Extended area breakdown
  residentialArea: numeric("residential_area", { precision: 12, scale: 2 }),
  commercialArea: numeric("commercial_area", { precision: 12, scale: 2 }),
  commonArea: numeric("common_area", { precision: 12, scale: 2 }),

  // Units breakdown by type
  units1Room: integer("units_1room").default(0),
  units2Room: integer("units_2room").default(0),
  units3Room: integer("units_3room").default(0),
  unitsStudio: integer("units_studio").default(0),
  unitsCommercial: integer("units_commercial").default(0),

  // Cost calculation
  costPerSqm: numeric("cost_per_sqm", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("KGS"),
  exchangeRateSource: text("exchange_rate_source").notNull().default("nbkr"),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }).default("1"),
  estimatedCostKgs: numeric("estimated_cost_kgs", { precision: 18, scale: 2 }),

  // Budget
  totalBudget: numeric("total_budget", { precision: 18, scale: 2 }),
  spentAmount: numeric("spent_amount", { precision: 18, scale: 2 }).default("0"),

  // Legal entity
  legalEntityId: integer("legal_entity_id"),

  // Timeline
  startDate: text("start_date"),
  plannedEndDate: text("planned_end_date"),
  actualEndDate: text("actual_end_date"),

  description: text("description"),
  /** JSON: стадия, заказчик, ГАП и др. с титульного листа */
  documentMeta: text("document_meta"),
  /** JSON: шаблон договора продаж (.docx) для проекта */
  contractTemplateMeta: text("contract_template_meta"),
  managerId: integer("manager_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionProjectSchema = createInsertSchema(constructionProjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionProject = z.infer<typeof insertConstructionProjectSchema>;
export type ConstructionProject = typeof constructionProjectsTable.$inferSelect;
