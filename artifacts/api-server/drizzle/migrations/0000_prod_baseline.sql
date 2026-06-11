CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"bin" text,
	"phone" text,
	"email" text,
	"address" text,
	"logo_url" text,
	"default_currency" text DEFAULT 'KGS' NOT NULL,
	"module_type" text,
	"inn_suffix" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"email" text,
	"phone" text,
	"password_hash" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"linked_investor_id" integer,
	"linked_tenant_id" integer,
	"linked_contractor_id" integer,
	"linked_supplier_id" integer,
	"linked_marketplace_supplier_id" integer,
	"linked_buyer_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counterparties" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"type" text DEFAULT 'individual' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"categories" text[],
	"full_name" text NOT NULL,
	"iin" text,
	"phone" text,
	"email" text,
	"address" text,
	"additional_contact" text,
	"comment" text,
	"client_segment_id" integer,
	"external_id" text,
	"source_type" text,
	"sync_status" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_name" text NOT NULL,
	"block" text,
	"floor" integer,
	"unit_number" text NOT NULL,
	"type" text DEFAULT 'apartment' NOT NULL,
	"area" numeric(10, 2),
	"status" text DEFAULT 'available' NOT NULL,
	"rental_status" text,
	"market_value" numeric(18, 2),
	"comment" text,
	"external_id" text,
	"source_type" text,
	"sync_status" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"contract_number" text NOT NULL,
	"contract_date" text,
	"type" text DEFAULT 'sale' NOT NULL,
	"counterparty_id" integer,
	"property_id" integer,
	"amount" numeric(14, 2),
	"currency" text DEFAULT 'KZT',
	"start_date" text,
	"end_date" text,
	"accrual_date" text,
	"deposit" numeric(14, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"comment" text,
	"external_id" text,
	"source_type" text,
	"sync_status" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"errors" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"counterparty_id" integer,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"iin" text,
	"type" text DEFAULT 'individual' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"contract_number" text NOT NULL,
	"sign_date" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"rent_amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"deposit_amount" numeric(14, 2),
	"accrual_day" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"comment" text,
	"grace_period_days" integer DEFAULT 0,
	"discount_type" text,
	"discount_value" numeric(10, 2),
	"discount_reason" text,
	"utilities_mode" text DEFAULT 'included',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accruals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"lease_contract_id" integer NOT NULL,
	"period" text NOT NULL,
	"accrual_type" text DEFAULT 'rent' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"due_date" text NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"discount_type" text,
	"discount_amount" numeric(14, 2),
	"discount_reason" text,
	"grace_period_days" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"lease_contract_id" integer NOT NULL,
	"accrual_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KZT' NOT NULL,
	"account_amount" numeric(14, 2),
	"exchange_rate" numeric(14, 6),
	"exchange_rate_date" text,
	"payment_date" text NOT NULL,
	"payment_method" text,
	"account_id" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"payment_id" integer NOT NULL,
	"accrual_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"lease_contract_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KZT' NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"received_date" text NOT NULL,
	"account_id" integer,
	"returned_amount" numeric(14, 2),
	"returned_date" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"lease_contract_id" integer,
	"category" text DEFAULT 'other' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'KZT' NOT NULL,
	"expense_date" text NOT NULL,
	"account_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"period" text NOT NULL,
	"rent_charged" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rent_received" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expenses" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KZT' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"module" text,
	"action_type" text,
	"snapshot" text,
	"restored_at" timestamp with time zone,
	"before_data" text,
	"after_data" text,
	"changed_fields" text
);
--> statement-breakpoint
CREATE TABLE "module_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"module_key" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp with time zone,
	"settings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"full_name" text NOT NULL,
	"type" text DEFAULT 'individual' NOT NULL,
	"phone" text,
	"email" text,
	"iin" text,
	"telegram_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"counterparty_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"investor_id" integer NOT NULL,
	"share_percent" numeric(5, 2) NOT NULL,
	"capital_invested" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"invested_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"period" text NOT NULL,
	"gross_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_profit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" text NOT NULL,
	"address" text,
	"region" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"building_type" text DEFAULT 'apartment' NOT NULL,
	"construction_type" text DEFAULT 'monolith' NOT NULL,
	"total_floors" integer,
	"total_units" integer,
	"total_area" numeric(12, 2),
	"total_construction_area" numeric(12, 2),
	"total_saleable_area" numeric(12, 2),
	"residential_area" numeric(12, 2),
	"commercial_area" numeric(12, 2),
	"common_area" numeric(12, 2),
	"units_1room" integer DEFAULT 0,
	"units_2room" integer DEFAULT 0,
	"units_3room" integer DEFAULT 0,
	"units_studio" integer DEFAULT 0,
	"units_commercial" integer DEFAULT 0,
	"base_sale_price_per_sqm" numeric(12, 2),
	"cost_per_sqm" numeric(12, 2),
	"currency" text DEFAULT 'KGS' NOT NULL,
	"exchange_rate_source" text DEFAULT 'nbkr' NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"estimated_cost_kgs" numeric(18, 2),
	"total_budget" numeric(18, 2),
	"spent_amount" numeric(18, 2) DEFAULT '0',
	"legal_entity_id" integer,
	"start_date" text,
	"planned_end_date" text,
	"actual_end_date" text,
	"description" text,
	"document_meta" text,
	"contract_template_meta" text,
	"manager_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"start_date" text,
	"planned_end_date" text,
	"actual_end_date" text,
	"budget_amount" numeric(15, 2),
	"parent_stage_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"parent_task_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" integer,
	"created_by" integer,
	"contractor_id" integer,
	"sales_contract_id" integer,
	"supply_request_id" integer,
	"due_date" text,
	"completed_at" text,
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"progress_mode" text DEFAULT 'checklist' NOT NULL,
	"planned_start_date" text,
	"planned_end_date" text,
	"actual_start_date" text,
	"actual_end_date" text,
	"work_type" text DEFAULT 'construction' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"assigned_to" integer,
	"due_date" text,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"uploaded_by" integer,
	"doc_type" text DEFAULT 'other' NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"file_size" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"uploaded_by" integer,
	"photo_type" text NOT NULL,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"taken_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_task_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"predecessor_task_id" integer NOT NULL,
	"successor_task_id" integer NOT NULL,
	"dependency_type" text DEFAULT 'FS' NOT NULL,
	"lag_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"full_name" text NOT NULL,
	"brigade" text,
	"specialization" text,
	"phone" text,
	"daily_rate" numeric(10, 2),
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"project_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"counterparty_id" integer,
	"full_name" text NOT NULL,
	"type" text DEFAULT 'company' NOT NULL,
	"specialization" text,
	"phone" text,
	"email" text,
	"inn" text,
	"contract_number" text,
	"contract_amount" numeric(15, 2),
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"rating" integer,
	"notes" text,
	"okpo" text,
	"bic" text,
	"stage_id" integer,
	"payment_milestones" text,
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"document_path" text,
	"contract_document_meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_contractor_specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer,
	"name" text NOT NULL,
	"category" text,
	"unit" text DEFAULT 'шт' NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"supplier_id" integer,
	"status" text DEFAULT 'planned' NOT NULL,
	"delivered_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_budget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"planned_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"exchange_rate_source" text DEFAULT 'nbkr' NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"construction_task_id" integer,
	"budget_item_id" integer,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"exchange_rate_source" text DEFAULT 'nbkr' NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"amount_kgs" numeric(15, 2),
	"contractor_id" integer,
	"date" text NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"status" text DEFAULT 'pending' NOT NULL,
	"receipt_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"unit_number" text NOT NULL,
	"floor" integer,
	"block" text,
	"unit_type" text DEFAULT 'apartment' NOT NULL,
	"room_count" integer,
	"area" numeric(8, 2),
	"price_per_sqm" numeric(12, 2),
	"price_coefficient" numeric(8, 4) DEFAULT '1',
	"price_approved" boolean DEFAULT false,
	"price_approved_by" integer,
	"price_approved_at" timestamp with time zone,
	"total_price" numeric(15, 2),
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"buyer_id" integer,
	"contract_date" text,
	"sales_contract_id" integer,
	"client_id" integer,
	"sale_price" numeric(15, 2),
	"sale_date" text,
	"registration_date" text,
	"progress_percent" integer DEFAULT 0,
	"notes" text,
	"original_area" numeric(10, 2),
	"area_modified" boolean DEFAULT false,
	"area_modified_by" integer,
	"area_modified_at" timestamp with time zone,
	"area_delta" numeric(10, 2),
	"recalculation_price" numeric(15, 2),
	"supplement_status" text DEFAULT 'none',
	"area_change_document_meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_unit_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"color_key" text DEFAULT 'slate' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sale_mode" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"currency_code" text NOT NULL,
	"nbkr_rate" numeric(12, 4),
	"optima_rate" numeric(12, 4),
	"rsb_rate" numeric(12, 4),
	"bakai_rate" numeric(12, 4),
	"dobank_rate" numeric(12, 4),
	"mbank_rate" numeric(12, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"module" varchar(32) DEFAULT 'construction' NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(32) DEFAULT 'cash' NOT NULL,
	"bank" varchar(256),
	"bik" varchar(64),
	"account_number" varchar(64),
	"currency" varchar(8) DEFAULT 'KGS' NOT NULL,
	"opening_balance" numeric DEFAULT '0' NOT NULL,
	"current_balance" numeric DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"project_id" integer,
	"type" varchar(32) DEFAULT 'expense' NOT NULL,
	"category" varchar(128),
	"from_account_id" integer,
	"to_account_id" integer,
	"contractor_id" integer,
	"counterparty_id" integer,
	"contract_id" integer,
	"accrual_id" integer,
	"amount" numeric DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'KGS' NOT NULL,
	"exchange_rate_source" varchar(32) DEFAULT 'nbkr',
	"exchange_rate" numeric DEFAULT '1' NOT NULL,
	"amount_kgs" numeric DEFAULT '0' NOT NULL,
	"date" varchar(16) NOT NULL,
	"description" text NOT NULL,
	"payment_method" varchar(32) DEFAULT 'cash',
	"status" varchar(32) DEFAULT 'approved' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barter_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"asset_type" varchar(32) DEFAULT 'vehicle' NOT NULL,
	"title" varchar(512) NOT NULL,
	"identifier" varchar(128),
	"project_id" integer,
	"contract_id" integer,
	"status" varchar(32) DEFAULT 'in_stock' NOT NULL,
	"accepted_amount_kgs" numeric DEFAULT '0' NOT NULL,
	"disposed_amount_kgs" numeric DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barter_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"direction" varchar(8) NOT NULL,
	"amount_kgs" numeric NOT NULL,
	"date" varchar(16) NOT NULL,
	"counterparty_id" integer,
	"contractor_id" integer,
	"project_id" integer,
	"contract_id" integer,
	"accrual_id" integer,
	"operation_id" integer,
	"purpose" text,
	"notes" text,
	"status" varchar(32) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_sales_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"unit_id" integer,
	"buyer_id" integer,
	"contract_number" varchar(64),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"down_payment" numeric DEFAULT '0' NOT NULL,
	"remaining_amount" numeric DEFAULT '0' NOT NULL,
	"paid_amount" numeric DEFAULT '0' NOT NULL,
	"installment_months" integer DEFAULT 0,
	"currency" varchar(8) DEFAULT 'KGS' NOT NULL,
	"exchange_rate" numeric DEFAULT '1',
	"contract_date" varchar(16),
	"signed_at" varchar(16),
	"handover_date" varchar(16),
	"buyer_name" varchar(256),
	"buyer_phone" varchar(32),
	"buyer_meta" text,
	"contract_document_meta" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_accruals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"contract_id" integer NOT NULL,
	"project_id" integer,
	"installment_number" integer DEFAULT 1 NOT NULL,
	"due_date" varchar(16) NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"paid_amount" numeric DEFAULT '0' NOT NULL,
	"remaining_amount" numeric DEFAULT '0' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"paid_at" varchar(16),
	"currency" varchar(8) DEFAULT 'KGS' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"from_user_id" integer,
	"type" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"message" text,
	"icon" text,
	"color" text,
	"link" text,
	"metadata" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"parent_id" integer,
	"module" text DEFAULT 'all' NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"module" text DEFAULT 'rental' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "legal_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"full_legal_name" text NOT NULL,
	"inn" varchar(64) NOT NULL,
	"address" text,
	"phone" varchar(64),
	"email" varchar(256),
	"director_name" varchar(256),
	"accountant" varchar(256),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"permissions" json DEFAULT '[]'::json NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'materials' NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"min_stock" numeric(12, 3) DEFAULT '0',
	"max_stock" numeric(12, 3),
	"unit_price" numeric(12, 2) DEFAULT '0',
	"currency" text DEFAULT 'KGS' NOT NULL,
	"supplier" text,
	"sku" text,
	"barcode" text,
	"location" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"counterparty_id" integer,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"address" text,
	"inn" text,
	"contract_number" text,
	"contract_document_meta" text,
	"contract_amount" numeric(15, 2),
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"currency" text DEFAULT 'KGS',
	"payment_terms" text,
	"rating" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_supplier_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"date" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_incoming" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"supplier_id" integer,
	"document_number" text,
	"document_date" text,
	"warehouse_location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_outgoing" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"recipient_type" text DEFAULT 'construction_project' NOT NULL,
	"recipient_id" integer,
	"purpose" text,
	"document_number" text,
	"issued_by" text,
	"issued_date" text,
	"notes" text,
	"construction_expense_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"inventory_date" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"items" jsonb NOT NULL,
	"conducted_by" text,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"property_type" text,
	"budget" numeric(15, 2),
	"currency" text DEFAULT 'KGS',
	"notes" text,
	"assigned_user_id" integer,
	"channel" text,
	"project_id" integer,
	"external_id" text,
	"created_by" integer,
	"lead_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contact_date" timestamp with time zone,
	"conversion_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"full_name" text NOT NULL,
	"type" text DEFAULT 'individual' NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"inn" text,
	"passport_data" text,
	"birth_date" timestamp with time zone,
	"budget" numeric(15, 2),
	"currency" text DEFAULT 'KGS',
	"credit_approved" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"client_id" integer NOT NULL,
	"property_id" integer,
	"deal_amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"stage" text DEFAULT 'lead' NOT NULL,
	"probability" integer DEFAULT 10,
	"expected_close_date" timestamp with time zone,
	"actual_close_date" timestamp with time zone,
	"assigned_user_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sales_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"contract_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"payment_schedule" jsonb,
	"sign_date" timestamp with time zone,
	"registration_date" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sales_properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"property_id" integer NOT NULL,
	"sale_price" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"marketing_description" text,
	"photos" jsonb,
	"available_from" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_progress_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"floor_number" integer,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"description" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_budget_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planned_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"spent_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"progress_percent" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_budget_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"project_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"quantity" numeric(10, 2),
	"unit_price" numeric(12, 2),
	"planned_amount" numeric(15, 2) NOT NULL,
	"spent_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"supplier_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"comment_type" text DEFAULT 'message' NOT NULL,
	"parent_comment_id" integer,
	"mentions" text,
	"attachment_ids" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidated_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"module" text NOT NULL,
	"operation_type" text NOT NULL,
	"amount" numeric(15, 2),
	"currency" text DEFAULT 'KGS',
	"counterparty_id" integer,
	"counterparty_name" text,
	"description" text,
	"source_table" text,
	"source_id" integer,
	"operation_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_supplements" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"contract_id" integer,
	"old_area" numeric(10, 2) NOT NULL,
	"new_area" numeric(10, 2) NOT NULL,
	"price_per_sqm" numeric(15, 2) NOT NULL,
	"balance_delta" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document_meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"purpose" text DEFAULT 'login' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"route" text NOT NULL,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"supplier_type" text DEFAULT 'seller' NOT NULL,
	"code" text,
	"phone" text,
	"email" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer,
	"sku" text,
	"last_import_id" integer,
	"name" text NOT NULL,
	"category" text DEFAULT 'materials' NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"description" text,
	"image_url" text,
	"min_order_qty" numeric(12, 3) DEFAULT '1',
	"stock_available" numeric(12, 3),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"project_id" integer,
	"requested_by_user_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_price_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"file_name" text,
	"status" text DEFAULT 'review' NOT NULL,
	"stats" text,
	"rows_preview" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_reconciliation_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"source" varchar(16) NOT NULL,
	"external_ref" varchar(256),
	"pair_group_id" varchar(64),
	"operation_date" varchar(16) NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'KGS' NOT NULL,
	"counterparty_name" varchar(256),
	"counterparty_inn" varchar(32),
	"description" text,
	"bank_account_ref" varchar(128),
	"raw_payload" text,
	"match_status" varchar(32) DEFAULT 'unmatched' NOT NULL,
	"review_status" varchar(32) DEFAULT 'inbox' NOT NULL,
	"suggested_project_id" integer,
	"suggested_category" varchar(128),
	"suggested_stage_id" integer,
	"suggestion_reason" text,
	"confirmed_project_id" integer,
	"confirmed_category" varchar(128),
	"confirmed_stage_id" integer,
	"construction_operation_id" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"full_name" text NOT NULL,
	"position" text,
	"department" text,
	"employment_type" varchar(32) DEFAULT 'staff',
	"hire_date" varchar(16),
	"base_salary" numeric(15, 2) DEFAULT '0',
	"current_salary" numeric(15, 2) DEFAULT '0',
	"currency" varchar(8) DEFAULT 'KGS',
	"status" varchar(16) DEFAULT 'active',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payroll_salary_changes" (
	"id" serial PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "payroll_approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "project_legal_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"legal_entity_id" integer NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_supplier_credit_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"limit_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"used_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"term_days" integer DEFAULT 0 NOT NULL,
	"markup_percent" numeric(7, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"principal_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"markup_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"comment" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"request_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_type" text DEFAULT 'prepaid' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"notes" text,
	"created_by" integer,
	"construction_expense_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"global_product_id" integer,
	"supplier_product_id" integer,
	"custom_name" text,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"project_id" integer,
	"construction_stage_id" integer,
	"construction_task_id" integer,
	"requested_by" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"needed_by_date" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_portal_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"contract_id" integer,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_portal_publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"segment_id" integer,
	"project_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_product_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"global_product_id" integer NOT NULL,
	"alias" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"slug" text NOT NULL,
	"name_ru" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"unit_default" text DEFAULT 'шт' NOT NULL,
	"attributes_schema" text,
	"attributes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"search_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_price_import_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"raw" text,
	"parsed_name" text,
	"parsed_unit" text,
	"parsed_price" numeric(15, 2),
	"suggested_global_product_id" integer,
	"match_confidence" numeric(6, 4),
	"match_status" text DEFAULT 'pending' NOT NULL,
	"supplier_product_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_price_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"source_type" text DEFAULT 'excel' NOT NULL,
	"file_name" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"stats" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"global_product_id" integer,
	"local_name" text NOT NULL,
	"local_sku" text,
	"unit" text DEFAULT 'шт' NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KGS' NOT NULL,
	"min_order_qty" numeric(12, 3) DEFAULT '1',
	"lead_time_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	"last_import_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_table_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"table_id" text NOT NULL,
	"layout" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_supplier_id_marketplace_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."marketplace_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_price_imports" ADD CONSTRAINT "marketplace_price_imports_supplier_id_marketplace_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."marketplace_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_table_views" ADD CONSTRAINT "user_table_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_table_views_user_table_idx" ON "user_table_views" USING btree ("user_id","table_id");