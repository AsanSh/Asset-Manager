import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payrollSalaryChangesTable = pgTable("payroll_salary_changes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  payrollEmployeeId: integer("payroll_employee_id").notNull(),
  effectiveDate: varchar("effective_date", { length: 16 }),
  previousAmount: numeric("previous_amount", { precision: 15, scale: 2 }),
  newAmount: numeric("new_amount", { precision: 15, scale: 2 }),
  delta: numeric("delta", { precision: 15, scale: 2 }),
  reason: text("reason"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPayrollSalaryChangeSchema = createInsertSchema(payrollSalaryChangesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollSalaryChange = z.infer<typeof insertPayrollSalaryChangeSchema>;
export type PayrollSalaryChange = typeof payrollSalaryChangesTable.$inferSelect;
