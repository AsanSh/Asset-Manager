-- Migration 0018: Зарплатная ведомость — сотрудники, изменения ЗП, запросы на одобрение

CREATE TABLE IF NOT EXISTS "payroll_employees" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "user_id" integer,
  "full_name" text NOT NULL,
  "position" text,
  "department" text,
  "employment_type" varchar(32) DEFAULT 'staff',
  "hire_date" varchar(16),
  "base_salary" numeric(15, 2) DEFAULT 0,
  "current_salary" numeric(15, 2) DEFAULT 0,
  "currency" varchar(8) DEFAULT 'KGS',
  "status" varchar(16) DEFAULT 'active',
  "notes" text,
  "created_by" integer,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "payroll_salary_changes" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "payroll_employee_id" integer NOT NULL,
  "effective_date" varchar(16),
  "previous_amount" numeric(15, 2),
  "new_amount" numeric(15, 2),
  "delta" numeric(15, 2),
  "reason" text,
  "created_by" integer,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payroll_approval_requests" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "payroll_employee_id" integer NOT NULL,
  "request_type" varchar(24) DEFAULT 'salary_change',
  "requested_amount" numeric(15, 2),
  "current_amount" numeric(15, 2),
  "reason" text,
  "status" varchar(16) DEFAULT 'pending',
  "requested_by" integer,
  "director_comment" text,
  "reviewed_by" integer,
  "reviewed_at" timestamp with time zone,
  "effective_date" varchar(16),
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_payroll_employees_company"
  ON "payroll_employees" ("company_id");

CREATE INDEX IF NOT EXISTS "idx_payroll_salary_changes_company"
  ON "payroll_salary_changes" ("company_id");

CREATE INDEX IF NOT EXISTS "idx_payroll_salary_changes_employee"
  ON "payroll_salary_changes" ("payroll_employee_id");

CREATE INDEX IF NOT EXISTS "idx_payroll_approval_requests_company"
  ON "payroll_approval_requests" ("company_id");

CREATE INDEX IF NOT EXISTS "idx_payroll_approval_requests_status"
  ON "payroll_approval_requests" ("company_id", "status");
