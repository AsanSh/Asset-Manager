import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payrollApprovalRequestsTable = pgTable("payroll_approval_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  payrollEmployeeId: integer("payroll_employee_id").notNull(),
  requestType: varchar("request_type", { length: 24 }).default("salary_change"),
  requestedAmount: numeric("requested_amount", { precision: 15, scale: 2 }),
  currentAmount: numeric("current_amount", { precision: 15, scale: 2 }),
  reason: text("reason"),
  status: varchar("status", { length: 16 }).default("pending"), // pending | approved | rejected
  requestedBy: integer("requested_by"),
  directorComment: text("director_comment"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  effectiveDate: varchar("effective_date", { length: 16 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPayrollApprovalRequestSchema = createInsertSchema(payrollApprovalRequestsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollApprovalRequest = z.infer<typeof insertPayrollApprovalRequestSchema>;
export type PayrollApprovalRequest = typeof payrollApprovalRequestsTable.$inferSelect;
