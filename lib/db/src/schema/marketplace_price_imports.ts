import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { marketplaceSuppliersTable } from "./marketplace_suppliers";

export const marketplacePriceImportsTable = pgTable("marketplace_price_imports", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => marketplaceSuppliersTable.id, { onDelete: "cascade" }),
  fileName: text("file_name"),
  status: text("status").notNull().default("review"),
  stats: text("stats"),
  rowsPreview: text("rows_preview"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketplacePriceImportSchema = createInsertSchema(marketplacePriceImportsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplacePriceImport = z.infer<typeof insertMarketplacePriceImportSchema>;
export type MarketplacePriceImport = typeof marketplacePriceImportsTable.$inferSelect;
