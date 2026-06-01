import { pgTable, serial, integer, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payrollEmployeesTable = pgTable("payroll_employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id"),
  fullName: text("full_name").notNull(),
  position: text("position"),
  department: text("department"),
  employmentType: varchar("employment_type", { length: 32 }).default("staff"), // staff | parttime | contract
  hireDate: varchar("hire_date", { length: 16 }),
  baseSalary: numeric("base_salary", { precision: 15, scale: 2 }).default("0"),
  currentSalary: numeric("current_salary", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 8 }).default("KGS"),
  status: varchar("status", { length: 16 }).default("active"), // active | dismissed
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const insertPayrollEmployeeSchema = createInsertSchema(payrollEmployeesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollEmployee = z.infer<typeof insertPayrollEmployeeSchema>;
export type PayrollEmployee = typeof payrollEmployeesTable.$inferSelect;
