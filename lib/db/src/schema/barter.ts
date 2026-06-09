import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Карточка бартерного актива (машина, техника и т.д.) */
export const barterAssetsTable = pgTable("barter_assets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  /** vehicle | equipment | other */
  assetType: varchar("asset_type", { length: 32 }).notNull().default("vehicle"),
  title: varchar("title", { length: 512 }).notNull(),
  /** VIN, госномер, серийный номер */
  identifier: varchar("identifier", { length: 128 }),
  projectId: integer("project_id"),
  contractId: integer("contract_id"),
  /** in_stock | partial | disposed | cancelled */
  status: varchar("status", { length: 32 }).notNull().default("in_stock"),
  acceptedAmountKgs: numeric("accepted_amount_kgs").notNull().default("0"),
  disposedAmountKgs: numeric("disposed_amount_kgs").notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Движение по бартеру: приём от покупателя (in) или выдача подрядчику (out) */
export const barterMovementsTable = pgTable("barter_movements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  assetId: integer("asset_id").notNull(),
  /** in | out */
  direction: varchar("direction", { length: 8 }).notNull(),
  amountKgs: numeric("amount_kgs").notNull(),
  date: varchar("date", { length: 16 }).notNull(),
  counterpartyId: integer("counterparty_id"),
  contractorId: integer("contractor_id"),
  projectId: integer("project_id"),
  contractId: integer("contract_id"),
  accrualId: integer("accrual_id"),
  operationId: integer("operation_id"),
  purpose: text("purpose"),
  notes: text("notes"),
  /** approved | cancelled */
  status: varchar("status", { length: 32 }).notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBarterAssetSchema = createInsertSchema(barterAssetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBarterMovementSchema = createInsertSchema(barterMovementsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBarterAsset = z.infer<typeof insertBarterAssetSchema>;
export type BarterAsset = typeof barterAssetsTable.$inferSelect;
export type InsertBarterMovement = z.infer<typeof insertBarterMovementSchema>;
export type BarterMovement = typeof barterMovementsTable.$inferSelect;
