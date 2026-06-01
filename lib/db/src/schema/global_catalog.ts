import { pgTable, serial, integer, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Иерархия категорий глобального строительного каталога (platform scope). */
export const globalProductCategoriesTable = pgTable("global_product_categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  slug: text("slug").notNull(),
  nameRu: text("name_ru").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Канонический товар (platform scope). */
export const globalProductsTable = pgTable("global_products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  canonicalName: text("canonical_name").notNull(),
  slug: text("slug").notNull(),
  unitDefault: text("unit_default").notNull().default("шт"),
  attributesSchema: text("attributes_schema"), // JSON schema string
  attributes: text("attributes"), // JSON payload string
  status: text("status").notNull().default("active"), // draft | active | deprecated
  searchText: text("search_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Синонимы и варианты названия канонического товара. */
export const globalProductAliasesTable = pgTable("global_product_aliases", {
  id: serial("id").primaryKey(),
  globalProductId: integer("global_product_id").notNull(),
  alias: text("alias").notNull(),
  source: text("source").notNull().default("manual"), // manual | supplier_import
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Прайс/карточка товара конкретного поставщика внутри компании. */
export const supplierProductsTable = pgTable("supplier_products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  globalProductId: integer("global_product_id"),
  localName: text("local_name").notNull(),
  localSku: text("local_sku"),
  unit: text("unit").notNull().default("шт"),
  price: numeric("price", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  minOrderQty: numeric("min_order_qty", { precision: 12, scale: 3 }).default("1"),
  leadTimeDays: integer("lead_time_days"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: text("metadata"), // JSON payload string
  lastImportAt: timestamp("last_import_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Шапка импорта прайса поставщика. */
export const supplierPriceImportsTable = pgTable("supplier_price_imports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  sourceType: text("source_type").notNull().default("excel"), // excel | csv | api | one_c
  fileName: text("file_name"),
  status: text("status").notNull().default("uploaded"), // uploaded | parsing | review | committed | failed
  stats: text("stats"), // JSON payload string
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Строки импорта прайса поставщика + автосопоставление. */
export const supplierPriceImportRowsTable = pgTable("supplier_price_import_rows", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  raw: text("raw"), // JSON payload string
  parsedName: text("parsed_name"),
  parsedUnit: text("parsed_unit"),
  parsedPrice: numeric("parsed_price", { precision: 15, scale: 2 }),
  suggestedGlobalProductId: integer("suggested_global_product_id"),
  matchConfidence: numeric("match_confidence", { precision: 6, scale: 4 }),
  matchStatus: text("match_status").notNull().default("pending"), // pending | auto | manual | skipped | committed
  supplierProductId: integer("supplier_product_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGlobalProductCategorySchema = createInsertSchema(globalProductCategoriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertGlobalProductSchema = createInsertSchema(globalProductsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertGlobalProductAliasSchema = createInsertSchema(globalProductAliasesTable).omit({
  id: true,
  createdAt: true,
});
export const insertSupplierProductSchema = createInsertSchema(supplierProductsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierPriceImportSchema = createInsertSchema(supplierPriceImportsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierPriceImportRowSchema = createInsertSchema(supplierPriceImportRowsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGlobalProductCategory = z.infer<typeof insertGlobalProductCategorySchema>;
export type GlobalProductCategory = typeof globalProductCategoriesTable.$inferSelect;
export type InsertGlobalProduct = z.infer<typeof insertGlobalProductSchema>;
export type GlobalProduct = typeof globalProductsTable.$inferSelect;
export type InsertGlobalProductAlias = z.infer<typeof insertGlobalProductAliasSchema>;
export type GlobalProductAlias = typeof globalProductAliasesTable.$inferSelect;
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>;
export type SupplierProduct = typeof supplierProductsTable.$inferSelect;
export type InsertSupplierPriceImport = z.infer<typeof insertSupplierPriceImportSchema>;
export type SupplierPriceImport = typeof supplierPriceImportsTable.$inferSelect;
export type InsertSupplierPriceImportRow = z.infer<typeof insertSupplierPriceImportRowSchema>;
export type SupplierPriceImportRow = typeof supplierPriceImportRowsTable.$inferSelect;
