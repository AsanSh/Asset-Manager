import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Заявка снабжения (шапка). */
export const supplyRequestsTable = pgTable("supply_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  projectId: integer("project_id"),
  constructionStageId: integer("construction_stage_id"),
  requestedBy: integer("requested_by").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | ordered | cancelled
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  neededByDate: text("needed_by_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Позиции заявки снабжения. */
export const supplyRequestItemsTable = pgTable("supply_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  globalProductId: integer("global_product_id"),
  supplierProductId: integer("supplier_product_id"),
  customName: text("custom_name"),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull().default("шт"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Согласования по заявке (цепочка/история). */
export const supplyApprovalsTable = pgTable("supply_approvals", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  approverId: integer("approver_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  comment: text("comment"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Заказ поставщику на основе заявки (может быть и без заявки в будущем). */
export const supplyOrdersTable = pgTable("supply_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  requestId: integer("request_id"),
  status: text("status").notNull().default("draft"), // draft | placed | processing | delivered | closed
  paymentType: text("payment_type").notNull().default("prepaid"), // prepaid | postpaid | installment
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("KGS"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Лимиты и отсрочки от поставщика для компании. */
export const companySupplierCreditLimitsTable = pgTable("company_supplier_credit_limits", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  usedAmount: numeric("used_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  termDays: integer("term_days").notNull().default(0),
  markupPercent: numeric("markup_percent", { precision: 7, scale: 4 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // active | blocked | expired
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** План рассрочки по заказу (учёт, не кредитование платформой). */
export const installmentPlansTable = pgTable("installment_plans", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  orderId: integer("order_id").notNull(),
  principalAmount: numeric("principal_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  markupAmount: numeric("markup_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | overdue | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupplyRequestSchema = createInsertSchema(supplyRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplyRequestItemSchema = createInsertSchema(supplyRequestItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplyApprovalSchema = createInsertSchema(supplyApprovalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplyOrderSchema = createInsertSchema(supplyOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCompanySupplierCreditLimitSchema = createInsertSchema(companySupplierCreditLimitsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertInstallmentPlanSchema = createInsertSchema(installmentPlansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplyRequest = z.infer<typeof insertSupplyRequestSchema>;
export type SupplyRequest = typeof supplyRequestsTable.$inferSelect;
export type InsertSupplyRequestItem = z.infer<typeof insertSupplyRequestItemSchema>;
export type SupplyRequestItem = typeof supplyRequestItemsTable.$inferSelect;
export type InsertSupplyApproval = z.infer<typeof insertSupplyApprovalSchema>;
export type SupplyApproval = typeof supplyApprovalsTable.$inferSelect;
export type InsertSupplyOrder = z.infer<typeof insertSupplyOrderSchema>;
export type SupplyOrder = typeof supplyOrdersTable.$inferSelect;
export type InsertCompanySupplierCreditLimit = z.infer<typeof insertCompanySupplierCreditLimitSchema>;
export type CompanySupplierCreditLimit = typeof companySupplierCreditLimitsTable.$inferSelect;
export type InsertInstallmentPlan = z.infer<typeof insertInstallmentPlanSchema>;
export type InstallmentPlan = typeof installmentPlansTable.$inferSelect;
