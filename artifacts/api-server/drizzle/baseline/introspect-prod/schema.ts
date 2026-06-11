import { pgTable, index, serial, integer, text, timestamp, numeric, uniqueIndex, foreignKey, boolean, varchar, date, json, jsonb, bigint, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const counterparties = pgTable("counterparties", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	type: text().default('individual').notNull(),
	category: text().default('other').notNull(),
	fullName: text("full_name").notNull(),
	iin: text(),
	phone: text(),
	email: text(),
	address: text(),
	additionalContact: text("additional_contact"),
	comment: text(),
	externalId: text("external_id"),
	sourceType: text("source_type"),
	syncStatus: text("sync_status"),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	categories: text().array().default(["RAY"]),
	clientSegmentId: integer("client_segment_id"),
}, (table) => [
	index("counterparties_categories_gin").using("gin", table.categories.asc().nullsLast().op("array_ops")),
]);

export const tenants = pgTable("tenants", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	phone: text(),
	email: text(),
	iin: text(),
	type: text().default('individual').notNull(),
	status: text().default('active').notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	counterpartyId: integer("counterparty_id"),
}, (table) => [
	index("tenants_counterparty_id_idx").using("btree", table.counterpartyId.asc().nullsLast().op("int4_ops")),
]);

export const contracts = pgTable("contracts", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	contractNumber: text("contract_number").notNull(),
	contractDate: text("contract_date"),
	type: text().default('sale').notNull(),
	counterpartyId: integer("counterparty_id"),
	propertyId: integer("property_id"),
	amount: numeric({ precision: 14, scale:  2 }),
	currency: text().default('KZT'),
	startDate: text("start_date"),
	endDate: text("end_date"),
	accrualDate: text("accrual_date"),
	deposit: numeric({ precision: 14, scale:  2 }),
	status: text().default('draft').notNull(),
	comment: text(),
	externalId: text("external_id"),
	sourceType: text("source_type"),
	syncStatus: text("sync_status"),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	entityType: text("entity_type").notNull(),
	entityId: integer("entity_id").notNull(),
	name: text().notNull(),
	fileUrl: text("file_url").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	uploadedBy: integer("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const importJobs = pgTable("import_jobs", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	type: text().notNull(),
	status: text().default('pending').notNull(),
	totalRows: integer("total_rows").default(0).notNull(),
	successRows: integer("success_rows").default(0).notNull(),
	errorRows: integer("error_rows").default(0).notNull(),
	errors: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	email: text(),
	passwordHash: text("password_hash"),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	role: text().default('staff').notNull(),
	linkedInvestorId: integer("linked_investor_id"),
	linkedTenantId: integer("linked_tenant_id"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	linkedContractorId: integer("linked_contractor_id"),
	linkedSupplierId: integer("linked_supplier_id"),
	linkedBuyerId: integer("linked_buyer_id"),
	phone: text(),
	linkedMarketplaceSupplierId: integer("linked_marketplace_supplier_id"),
}, (table) => [
	index("idx_users_linked_marketplace_supplier").using("btree", table.linkedMarketplaceSupplierId.asc().nullsLast().op("int4_ops")).where(sql`(linked_marketplace_supplier_id IS NOT NULL)`),
	uniqueIndex("users_email_unique_idx").using("btree", table.email.asc().nullsLast().op("text_ops")).where(sql`(email IS NOT NULL)`),
	uniqueIndex("users_phone_unique_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")).where(sql`(phone IS NOT NULL)`),
	foreignKey({
			columns: [table.linkedMarketplaceSupplierId],
			foreignColumns: [marketplaceSuppliers.id],
			name: "users_linked_marketplace_supplier_id_fkey"
		}).onDelete("set null"),
]);

export const companies = pgTable("companies", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	legalName: text("legal_name"),
	bin: text(),
	phone: text(),
	email: text(),
	address: text(),
	logoUrl: text("logo_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	defaultCurrency: text("default_currency").default('KGS').notNull(),
	moduleType: text("module_type"),
	innSuffix: text("inn_suffix"),
});

export const leaseContracts = pgTable("lease_contracts", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	tenantId: integer("tenant_id").notNull(),
	contractNumber: text("contract_number").notNull(),
	signDate: text("sign_date"),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	rentAmount: numeric("rent_amount", { precision: 14, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	depositAmount: numeric("deposit_amount", { precision: 14, scale:  2 }),
	accrualDay: integer("accrual_day"),
	status: text().default('draft').notNull(),
	comment: text(),
	gracePeriodDays: integer("grace_period_days").default(0),
	discountType: text("discount_type"),
	discountValue: numeric("discount_value", { precision: 10, scale:  2 }),
	discountReason: text("discount_reason"),
	utilitiesMode: text("utilities_mode").default('included'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lease_contracts_company").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_lease_contracts_tenant").using("btree", table.tenantId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("text_ops")),
]);

export const accruals = pgTable("accruals", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	leaseContractId: integer("lease_contract_id").notNull(),
	period: text().notNull(),
	accrualType: text("accrual_type").default('rent').notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	dueDate: text("due_date").notNull(),
	paidAmount: numeric("paid_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	balance: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	status: text().default('pending').notNull(),
	discountType: text("discount_type"),
	discountAmount: numeric("discount_amount", { precision: 14, scale:  2 }),
	discountReason: text("discount_reason"),
	gracePeriodDays: integer("grace_period_days"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_accruals_lease").using("btree", table.leaseContractId.asc().nullsLast().op("int4_ops"), table.dueDate.asc().nullsLast().op("int4_ops")),
]);

export const paymentAllocations = pgTable("payment_allocations", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	paymentId: integer("payment_id").notNull(),
	accrualId: integer("accrual_id").notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const deposits = pgTable("deposits", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	leaseContractId: integer("lease_contract_id").notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	currency: text().default('KZT').notNull(),
	status: text().default('held').notNull(),
	receivedDate: text("received_date").notNull(),
	accountId: integer("account_id"),
	returnedAmount: numeric("returned_amount", { precision: 14, scale:  2 }),
	returnedDate: text("returned_date"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	leaseContractId: integer("lease_contract_id"),
	category: text().default('other').notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	currency: text().default('KZT').notNull(),
	expenseDate: text("expense_date").notNull(),
	accountId: integer("account_id"),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const ownerStatements = pgTable("owner_statements", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	period: text().notNull(),
	rentCharged: numeric("rent_charged", { precision: 14, scale:  2 }).default('0').notNull(),
	rentReceived: numeric("rent_received", { precision: 14, scale:  2 }).default('0').notNull(),
	expenses: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	netIncome: numeric("net_income", { precision: 14, scale:  2 }).default('0').notNull(),
	currency: text().default('KZT').notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const moduleSettings = pgTable("module_settings", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	moduleKey: text("module_key").notNull(),
	isEnabled: boolean("is_enabled").default(false).notNull(),
	enabledAt: timestamp("enabled_at", { withTimezone: true, mode: 'string' }),
	settings: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	token: text().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
});

export const investors = pgTable("investors", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	type: text().default('individual').notNull(),
	phone: text(),
	email: text(),
	iin: text(),
	telegramId: text("telegram_id"),
	status: text().default('active').notNull(),
	notes: text(),
	counterpartyId: integer("counterparty_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const investments = pgTable("investments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	investorId: integer("investor_id").notNull(),
	sharePercent: numeric("share_percent", { precision: 5, scale:  2 }).notNull(),
	capitalInvested: numeric("capital_invested", { precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	investedAt: text("invested_at"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const distributions = pgTable("distributions", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	period: text().notNull(),
	grossIncome: numeric("gross_income", { precision: 15, scale:  2 }).default('0').notNull(),
	expenses: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	netProfit: numeric("net_profit", { precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	status: text().default('pending').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionProjects = pgTable("construction_projects", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	name: text().notNull(),
	address: text(),
	region: text(),
	status: text().default('planning').notNull(),
	buildingType: text("building_type").default('apartment').notNull(),
	constructionType: text("construction_type").default('monolith').notNull(),
	totalFloors: integer("total_floors"),
	totalUnits: integer("total_units"),
	totalArea: numeric("total_area", { precision: 12, scale:  2 }),
	residentialArea: numeric("residential_area", { precision: 12, scale:  2 }),
	commercialArea: numeric("commercial_area", { precision: 12, scale:  2 }),
	commonArea: numeric("common_area", { precision: 12, scale:  2 }),
	units1Room: integer("units_1room").default(0),
	units2Room: integer("units_2room").default(0),
	units3Room: integer("units_3room").default(0),
	unitsStudio: integer("units_studio").default(0),
	unitsCommercial: integer("units_commercial").default(0),
	costPerSqm: numeric("cost_per_sqm", { precision: 12, scale:  2 }),
	currency: text().default('KGS').notNull(),
	exchangeRateSource: text("exchange_rate_source").default('nbkr').notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 10, scale:  4 }).default('1'),
	estimatedCostKgs: numeric("estimated_cost_kgs", { precision: 18, scale:  2 }),
	totalBudget: numeric("total_budget", { precision: 18, scale:  2 }),
	spentAmount: numeric("spent_amount", { precision: 18, scale:  2 }).default('0'),
	legalEntityId: integer("legal_entity_id"),
	startDate: text("start_date"),
	plannedEndDate: text("planned_end_date"),
	actualEndDate: text("actual_end_date"),
	description: text(),
	managerId: integer("manager_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	documentMeta: text("document_meta"),
	contractTemplateMeta: text("contract_template_meta"),
	baseSalePricePerSqm: numeric("base_sale_price_per_sqm", { precision: 12, scale:  2 }),
	totalConstructionArea: numeric("total_construction_area", { precision: 12, scale:  2 }),
	totalSaleableArea: numeric("total_saleable_area", { precision: 12, scale:  2 }),
}, (table) => [
	index("idx_construction_projects_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
]);

export const constructionWorkers = pgTable("construction_workers", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	brigade: text(),
	specialization: text(),
	phone: text(),
	dailyRate: numeric("daily_rate", { precision: 10, scale:  2 }),
	currency: text().default('KGS').notNull(),
	status: text().default('active').notNull(),
	projectId: integer("project_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionMaterials = pgTable("construction_materials", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id"),
	name: text().notNull(),
	category: text(),
	unit: text().default('шт').notNull(),
	quantity: numeric({ precision: 12, scale:  3 }).default('0').notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).default('0').notNull(),
	totalPrice: numeric("total_price", { precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	supplierId: integer("supplier_id"),
	status: text().default('planned').notNull(),
	deliveredAt: text("delivered_at"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionBudgetItems = pgTable("construction_budget_items", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	stageId: integer("stage_id"),
	category: text().notNull(),
	name: text().notNull(),
	plannedAmount: numeric("planned_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	actualAmount: numeric("actual_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	exchangeRateSource: text("exchange_rate_source").default('nbkr').notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 10, scale:  4 }).default('1'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionSalesContracts = pgTable("construction_sales_contracts", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	projectId: integer("project_id").notNull(),
	unitId: integer("unit_id"),
	buyerId: integer("buyer_id"),
	contractNumber: varchar("contract_number", { length: 64 }),
	status: varchar({ length: 32 }).default('draft').notNull(),
	totalAmount: numeric("total_amount").default('0').notNull(),
	downPayment: numeric("down_payment").default('0').notNull(),
	remainingAmount: numeric("remaining_amount").default('0').notNull(),
	paidAmount: numeric("paid_amount").default('0').notNull(),
	installmentMonths: integer("installment_months").default(0),
	currency: varchar({ length: 8 }).default('KGS').notNull(),
	exchangeRate: numeric("exchange_rate").default('1'),
	contractDate: varchar("contract_date", { length: 16 }),
	signedAt: varchar("signed_at", { length: 16 }),
	handoverDate: varchar("handover_date", { length: 16 }),
	buyerName: varchar("buyer_name", { length: 256 }),
	buyerPhone: varchar("buyer_phone", { length: 32 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	buyerMeta: text("buyer_meta"),
	contractDocumentMeta: text("contract_document_meta"),
}, (table) => [
	index("idx_construction_sales_contracts_company").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_construction_sales_contracts_unit").using("btree", table.unitId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("one_active_sales_contract_per_unit").using("btree", table.unitId.asc().nullsLast().op("int4_ops")).where(sql`((unit_id IS NOT NULL) AND ((status)::text = ANY ((ARRAY['signed'::character varying, 'review'::character varying])::text[])))`),
]);

export const currencyRates = pgTable("currency_rates", {
	id: serial().primaryKey().notNull(),
	date: text().notNull(),
	currencyCode: text("currency_code").notNull(),
	nbkrRate: numeric("nbkr_rate", { precision: 12, scale:  4 }),
	optimaRate: numeric("optima_rate", { precision: 12, scale:  4 }),
	rsbRate: numeric("rsb_rate", { precision: 12, scale:  4 }),
	bakaiRate: numeric("bakai_rate", { precision: 12, scale:  4 }),
	dobankRate: numeric("dobank_rate", { precision: 12, scale:  4 }),
	mbankRate: numeric("mbank_rate", { precision: 12, scale:  4 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionOperations = pgTable("construction_operations", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	projectId: integer("project_id"),
	type: varchar({ length: 32 }).default('expense').notNull(),
	category: varchar({ length: 128 }),
	fromAccountId: integer("from_account_id"),
	toAccountId: integer("to_account_id"),
	contractorId: integer("contractor_id"),
	contractId: integer("contract_id"),
	amount: numeric().default('0').notNull(),
	currency: varchar({ length: 8 }).default('KGS').notNull(),
	exchangeRateSource: varchar("exchange_rate_source", { length: 32 }).default('nbkr'),
	exchangeRate: numeric("exchange_rate").default('1').notNull(),
	amountKgs: numeric("amount_kgs").default('0').notNull(),
	date: varchar({ length: 16 }).notNull(),
	description: text().notNull(),
	paymentMethod: varchar("payment_method", { length: 32 }).default('cash'),
	status: varchar({ length: 32 }).default('approved').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	accrualId: integer("accrual_id"),
	counterpartyId: integer("counterparty_id"),
}, (table) => [
	index("construction_operations_company_counterparty_idx").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.counterpartyId.asc().nullsLast().op("int4_ops")).where(sql`(counterparty_id IS NOT NULL)`),
	index("idx_construction_operations_accounts").using("btree", table.fromAccountId.asc().nullsLast().op("int4_ops"), table.toAccountId.asc().nullsLast().op("int4_ops")),
	index("idx_construction_operations_company").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.date.desc().nullsFirst().op("int4_ops")),
	index("idx_construction_operations_contract").using("btree", table.contractId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
]);

export const constructionExpenses = pgTable("construction_expenses", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	stageId: integer("stage_id"),
	budgetItemId: integer("budget_item_id"),
	category: text().notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	exchangeRateSource: text("exchange_rate_source").default('nbkr').notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 10, scale:  4 }).default('1'),
	amountKgs: numeric("amount_kgs", { precision: 15, scale:  2 }),
	contractorId: integer("contractor_id"),
	date: text().notNull(),
	paymentMethod: text("payment_method").default('cash'),
	status: text().default('pending').notNull(),
	receiptUrl: text("receipt_url"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	constructionTaskId: integer("construction_task_id"),
}, (table) => [
	index("idx_construction_expenses_task").using("btree", table.constructionTaskId.asc().nullsLast().op("int4_ops")),
]);

export const bankAccounts = pgTable("bank_accounts", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: varchar({ length: 256 }).notNull(),
	type: varchar({ length: 32 }).default('cash').notNull(),
	bank: varchar({ length: 256 }),
	bik: varchar({ length: 64 }),
	accountNumber: varchar("account_number", { length: 64 }),
	currency: varchar({ length: 8 }).default('KGS').notNull(),
	openingBalance: numeric("opening_balance").default('0').notNull(),
	currentBalance: numeric("current_balance").default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	notes: varchar({ length: 1024 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	module: varchar({ length: 32 }),
});

export const constructionAccruals = pgTable("construction_accruals", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	contractId: integer("contract_id").notNull(),
	projectId: integer("project_id"),
	installmentNumber: integer("installment_number").default(1).notNull(),
	dueDate: varchar("due_date", { length: 16 }).notNull(),
	amount: numeric().default('0').notNull(),
	paidAmount: numeric("paid_amount").default('0').notNull(),
	remainingAmount: numeric("remaining_amount").default('0').notNull(),
	status: varchar({ length: 32 }).default('pending').notNull(),
	paidAt: varchar("paid_at", { length: 16 }),
	currency: varchar({ length: 8 }).default('KGS').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_construction_accruals_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.dueDate.asc().nullsLast().op("int4_ops")),
	index("idx_construction_accruals_contract").using("btree", table.contractId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("text_ops")),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	userId: integer("user_id"),
	fromUserId: integer("from_user_id"),
	type: text().default('info').notNull(),
	title: text().notNull(),
	body: text(),
	message: text(),
	icon: text(),
	color: text(),
	link: text(),
	metadata: text(),
	isRead: boolean("is_read").default(false).notNull(),
	read: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_user_unread").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.isRead.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("bool_ops")),
]);

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	fromUserId: integer("from_user_id").notNull(),
	toUserId: integer("to_user_id"),
	content: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const financialCategories = pgTable("financial_categories", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	type: text().default('expense').notNull(),
	parentId: integer("parent_id"),
	module: text().default('all').notNull(),
	color: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const accountingPeriods = pgTable("accounting_periods", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	module: text().default('rental').notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: text().default('open').notNull(),
	notes: text(),
});

export const legalEntities = pgTable("legal_entities", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: varchar({ length: 256 }).notNull(),
	fullLegalName: text("full_legal_name").notNull(),
	inn: varchar({ length: 64 }).notNull(),
	address: text(),
	phone: varchar({ length: 64 }),
	email: varchar({ length: 256 }),
	directorName: varchar("director_name", { length: 256 }),
	accountant: varchar({ length: 256 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: varchar({ length: 128 }).notNull(),
	description: text(),
	permissions: json().default([]).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const warehouseItems = pgTable("warehouse_items", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	category: text().default('materials').notNull(),
	unit: text().default('шт').notNull(),
	currentStock: numeric("current_stock", { precision: 12, scale:  3 }).default('0').notNull(),
	minStock: numeric("min_stock", { precision: 12, scale:  3 }).default('0'),
	maxStock: numeric("max_stock", { precision: 12, scale:  3 }),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).default('0'),
	currency: text().default('KGS').notNull(),
	supplier: text(),
	sku: text(),
	barcode: text(),
	location: text(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_warehouse_items_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
]);

export const warehouseOutgoing = pgTable("warehouse_outgoing", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	itemId: integer("item_id").notNull(),
	quantity: numeric({ precision: 12, scale:  3 }).notNull(),
	recipientType: text("recipient_type").default('construction_project').notNull(),
	recipientId: integer("recipient_id"),
	purpose: text(),
	documentNumber: text("document_number"),
	issuedBy: text("issued_by"),
	issuedDate: text("issued_date"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	constructionExpenseId: integer("construction_expense_id"),
}, (table) => [
	index("idx_warehouse_outgoing_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.issuedDate.desc().nullsFirst().op("int4_ops")),
	index("idx_warehouse_outgoing_expense").using("btree", table.constructionExpenseId.asc().nullsLast().op("int4_ops")).where(sql`(construction_expense_id IS NOT NULL)`),
]);

export const warehouseIncoming = pgTable("warehouse_incoming", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	itemId: integer("item_id").notNull(),
	quantity: numeric({ precision: 12, scale:  3 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	supplierId: integer("supplier_id"),
	documentNumber: text("document_number"),
	documentDate: text("document_date"),
	warehouseLocation: text("warehouse_location"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_warehouse_incoming_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.documentDate.desc().nullsFirst().op("int4_ops")),
]);

export const warehouseInventory = pgTable("warehouse_inventory", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	inventoryDate: text("inventory_date").notNull(),
	status: text().default('in_progress').notNull(),
	items: jsonb().notNull(),
	conductedBy: text("conducted_by"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const crmClients = pgTable("crm_clients", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	type: text().default('individual').notNull(),
	phone: text(),
	email: text(),
	address: text(),
	inn: text(),
	passportData: text("passport_data"),
	birthDate: timestamp("birth_date", { withTimezone: true, mode: 'string' }),
	budget: numeric({ precision: 15, scale:  2 }),
	currency: text().default('KGS'),
	creditApproved: text("credit_approved"),
	notes: text(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const crmDeals = pgTable("crm_deals", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	clientId: integer("client_id").notNull(),
	propertyId: integer("property_id"),
	dealAmount: numeric("deal_amount", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	stage: text().default('lead').notNull(),
	probability: integer().default(10),
	expectedCloseDate: timestamp("expected_close_date", { withTimezone: true, mode: 'string' }),
	actualCloseDate: timestamp("actual_close_date", { withTimezone: true, mode: 'string' }),
	assignedUserId: integer("assigned_user_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const crmSalesContracts = pgTable("crm_sales_contracts", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	contractNumber: text("contract_number").notNull(),
	clientId: integer("client_id").notNull(),
	propertyId: integer("property_id").notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	paymentSchedule: jsonb("payment_schedule"),
	signDate: timestamp("sign_date", { withTimezone: true, mode: 'string' }),
	registrationDate: timestamp("registration_date", { withTimezone: true, mode: 'string' }),
	status: text().default('draft').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const crmSalesProperties = pgTable("crm_sales_properties", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	propertyId: integer("property_id").notNull(),
	salePrice: numeric("sale_price", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	status: text().default('available').notNull(),
	marketingDescription: text("marketing_description"),
	photos: jsonb(),
	availableFrom: timestamp("available_from", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionProgressPhotos = pgTable("construction_progress_photos", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	floorNumber: integer("floor_number"),
	photoUrl: text("photo_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	description: text(),
	takenAt: timestamp("taken_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uploadedBy: integer("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionBudgetCategories = pgTable("construction_budget_categories", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	name: text().notNull(),
	description: text(),
	plannedAmount: numeric("planned_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	spentAmount: numeric("spent_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	progressPercent: integer("progress_percent").default(0),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionBudgetLineItems = pgTable("construction_budget_line_items", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	categoryId: integer("category_id").notNull(),
	name: text().notNull(),
	unit: text(),
	quantity: numeric({ precision: 10, scale:  2 }),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }),
	plannedAmount: numeric("planned_amount", { precision: 15, scale:  2 }).notNull(),
	spentAmount: numeric("spent_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	supplierId: integer("supplier_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const emailVerifications = pgTable("email_verifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	code: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionUnitStatuses = pgTable("construction_unit_statuses", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	code: text().notNull(),
	label: text().notNull(),
	colorKey: text("color_key").default('slate').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	saleMode: text("sale_mode").default('none').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("construction_unit_statuses_company_code").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.code.asc().nullsLast().op("int4_ops")),
]);

export const properties = pgTable("properties", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectName: text("project_name").notNull(),
	block: text(),
	floor: integer(),
	unitNumber: text("unit_number").notNull(),
	type: text().default('apartment').notNull(),
	area: numeric({ precision: 10, scale:  2 }),
	status: text().default('available').notNull(),
	rentalStatus: text("rental_status"),
	comment: text(),
	externalId: text("external_id"),
	sourceType: text("source_type"),
	syncStatus: text("sync_status"),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	marketValue: numeric("market_value", { precision: 18, scale:  2 }),
});

export const constructionContractorSpecializations = pgTable("construction_contractor_specializations", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("construction_contractor_specs_company_name").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
]);

export const constructionStages = pgTable("construction_stages", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: text().default('planned').notNull(),
	progress: integer().default(0).notNull(),
	startDate: text("start_date"),
	plannedEndDate: text("planned_end_date"),
	actualEndDate: text("actual_end_date"),
	budgetAmount: numeric("budget_amount", { precision: 15, scale:  2 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	parentStageId: integer("parent_stage_id"),
}, (table) => [
	index("idx_construction_stages_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.parentStageId],
			foreignColumns: [table.id],
			name: "construction_stages_parent_stage_id_fkey"
		}).onDelete("set null"),
]);

export const warehouseSupplierPayments = pgTable("warehouse_supplier_payments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	date: text().notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const constructionContractors = pgTable("construction_contractors", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	type: text().default('company').notNull(),
	specialization: text(),
	phone: text(),
	email: text(),
	inn: text(),
	contractNumber: text("contract_number"),
	contractAmount: numeric("contract_amount", { precision: 15, scale:  2 }),
	currency: text().default('KGS').notNull(),
	status: text().default('active').notNull(),
	rating: integer(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	okpo: text(),
	bic: text(),
	stageId: integer("stage_id"),
	paymentMilestones: text("payment_milestones"),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0'),
	documentPath: text("document_path"),
	contractDocumentMeta: text("contract_document_meta"),
	category: text().default('service'),
	counterpartyId: integer("counterparty_id"),
}, (table) => [
	index("construction_contractors_counterparty_id_idx").using("btree", table.counterpartyId.asc().nullsLast().op("int4_ops")),
]);

export const warehouseSuppliers = pgTable("warehouse_suppliers", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text(),
	email: text(),
	address: text(),
	inn: text(),
	paymentTerms: text("payment_terms"),
	rating: integer(),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	contractNumber: text("contract_number"),
	contractDocumentMeta: text("contract_document_meta"),
	contractAmount: numeric("contract_amount", { precision: 15, scale:  2 }),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0'),
	currency: text().default('KGS'),
	counterpartyId: integer("counterparty_id"),
}, (table) => [
	index("warehouse_suppliers_counterparty_id_idx").using("btree", table.counterpartyId.asc().nullsLast().op("int4_ops")),
]);

export const constructionSupplements = pgTable("construction_supplements", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	unitId: integer("unit_id").notNull(),
	contractId: integer("contract_id"),
	oldArea: numeric("old_area", { precision: 10, scale:  2 }).notNull(),
	newArea: numeric("new_area", { precision: 10, scale:  2 }).notNull(),
	pricePerSqm: numeric("price_per_sqm", { precision: 15, scale:  2 }).notNull(),
	balanceDelta: numeric("balance_delta", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	status: text().default('draft').notNull(),
	documentMeta: text("document_meta"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	signedAt: timestamp("signed_at", { withTimezone: true, mode: 'string' }),
});

export const constructionUnitAreaChanges = pgTable("construction_unit_area_changes", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	unitId: integer("unit_id").notNull(),
	changedBy: integer("changed_by").notNull(),
	oldArea: numeric("old_area", { precision: 10, scale:  2 }),
	newArea: numeric("new_area", { precision: 10, scale:  2 }),
	delta: numeric({ precision: 10, scale:  2 }),
	reason: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	documentMeta: text("document_meta"),
});

export const consolidatedLogs = pgTable("consolidated_logs", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	module: text().notNull(),
	operationType: text("operation_type").notNull(),
	amount: numeric({ precision: 15, scale:  2 }),
	currency: text().default('KGS'),
	counterpartyId: integer("counterparty_id"),
	counterpartyName: text("counterparty_name"),
	description: text(),
	sourceTable: text("source_table"),
	sourceId: integer("source_id"),
	operationDate: date("operation_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("consolidated_logs_company_module").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.module.asc().nullsLast().op("int4_ops")),
	index("consolidated_logs_counterparty").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.counterpartyId.asc().nullsLast().op("int4_ops")),
	index("idx_consolidated_logs_module").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.module.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
]);

export const otpCodes = pgTable("otp_codes", {
	id: serial().primaryKey().notNull(),
	phone: text().notNull(),
	code: text().notNull(),
	purpose: text().default('login').notNull(),
	attempts: integer().default(0).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("otp_codes_expires_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("otp_codes_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops"), table.purpose.asc().nullsLast().op("text_ops")),
]);

export const idempotencyKeys = pgTable("idempotency_keys", {
	key: text().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	userId: integer("user_id"),
	route: text().notNull(),
	responseStatus: integer("response_status"),
	responseBody: text("response_body"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).default(sql`(now() + '24:00:00'::interval)`).notNull(),
}, (table) => [
	index("idempotency_keys_expires_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const activityLog = pgTable("activity_log", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	type: text().notNull(),
	description: text().notNull(),
	entityType: text("entity_type"),
	entityId: integer("entity_id"),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	module: text(),
	actionType: text("action_type"),
	snapshot: text(),
	restoredAt: timestamp("restored_at", { withTimezone: true, mode: 'string' }),
	beforeData: text("before_data"),
	afterData: text("after_data"),
	changedFields: text("changed_fields"),
}, (table) => [
	index("idx_activity_log_company").using("btree", table.companyId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_activity_log_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
]);

export const payrollEmployees = pgTable("payroll_employees", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	userId: integer("user_id"),
	fullName: text("full_name").notNull(),
	position: text(),
	department: text(),
	employmentType: varchar("employment_type", { length: 32 }).default('staff'),
	hireDate: varchar("hire_date", { length: 16 }),
	baseSalary: numeric("base_salary", { precision: 15, scale:  2 }).default('0'),
	currentSalary: numeric("current_salary", { precision: 15, scale:  2 }).default('0'),
	currency: varchar({ length: 8 }).default('KGS'),
	status: varchar({ length: 16 }).default('active'),
	notes: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	legalEntityId: integer("legal_entity_id"),
}, (table) => [
	index("idx_payroll_employees_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	index("idx_payroll_employees_legal_entity").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.legalEntityId.asc().nullsLast().op("int4_ops")),
]);

export const marketplaceOrders = pgTable("marketplace_orders", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	productId: integer("product_id").notNull(),
	quantity: numeric({ precision: 12, scale:  3 }).notNull(),
	unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	currency: text().default('KGS').notNull(),
	projectId: integer("project_id"),
	requestedByUserId: integer("requested_by_user_id"),
	status: text().default('pending').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketplace_orders_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	index("idx_marketplace_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const financeReconciliationLines = pgTable("finance_reconciliation_lines", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	source: varchar({ length: 16 }).notNull(),
	externalRef: varchar("external_ref", { length: 256 }),
	pairGroupId: varchar("pair_group_id", { length: 64 }),
	operationDate: varchar("operation_date", { length: 16 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	currency: varchar({ length: 8 }).default('KGS').notNull(),
	counterpartyName: varchar("counterparty_name", { length: 256 }),
	counterpartyInn: varchar("counterparty_inn", { length: 32 }),
	description: text(),
	bankAccountRef: varchar("bank_account_ref", { length: 128 }),
	rawPayload: text("raw_payload"),
	matchStatus: varchar("match_status", { length: 32 }).default('unmatched').notNull(),
	reviewStatus: varchar("review_status", { length: 32 }).default('inbox').notNull(),
	suggestedProjectId: integer("suggested_project_id"),
	suggestedCategory: varchar("suggested_category", { length: 128 }),
	suggestedStageId: integer("suggested_stage_id"),
	suggestionReason: text("suggestion_reason"),
	confirmedProjectId: integer("confirmed_project_id"),
	confirmedCategory: varchar("confirmed_category", { length: 128 }),
	confirmedStageId: integer("confirmed_stage_id"),
	constructionOperationId: integer("construction_operation_id"),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_fin_recon_company_date").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.operationDate.asc().nullsLast().op("text_ops")),
	index("idx_fin_recon_company_pair").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.pairGroupId.asc().nullsLast().op("int4_ops")).where(sql`(pair_group_id IS NOT NULL)`),
	index("idx_fin_recon_company_review").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.reviewStatus.asc().nullsLast().op("int4_ops")),
]);

export const payrollSalaryChanges = pgTable("payroll_salary_changes", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	payrollEmployeeId: integer("payroll_employee_id").notNull(),
	effectiveDate: varchar("effective_date", { length: 16 }),
	previousAmount: numeric("previous_amount", { precision: 15, scale:  2 }),
	newAmount: numeric("new_amount", { precision: 15, scale:  2 }),
	delta: numeric({ precision: 15, scale:  2 }),
	reason: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payroll_salary_changes_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	index("idx_payroll_salary_changes_employee").using("btree", table.payrollEmployeeId.asc().nullsLast().op("int4_ops")),
]);

export const payrollApprovalRequests = pgTable("payroll_approval_requests", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	payrollEmployeeId: integer("payroll_employee_id").notNull(),
	requestType: varchar("request_type", { length: 24 }).default('salary_change'),
	requestedAmount: numeric("requested_amount", { precision: 15, scale:  2 }),
	currentAmount: numeric("current_amount", { precision: 15, scale:  2 }),
	reason: text(),
	status: varchar({ length: 16 }).default('pending'),
	requestedBy: integer("requested_by"),
	directorComment: text("director_comment"),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	effectiveDate: varchar("effective_date", { length: 16 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payroll_approval_requests_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	index("idx_payroll_approval_requests_status").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
]);

export const crmLeads = pgTable("crm_leads", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	fullName: text("full_name").notNull(),
	phone: text(),
	email: text(),
	source: text(),
	status: text().default('new').notNull(),
	propertyType: text("property_type"),
	budget: numeric({ precision: 15, scale:  2 }),
	currency: text().default('KGS'),
	notes: text(),
	assignedUserId: integer("assigned_user_id"),
	createdBy: integer("created_by"),
	leadDate: timestamp("lead_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastContactDate: timestamp("last_contact_date", { withTimezone: true, mode: 'string' }),
	conversionDate: timestamp("conversion_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	channel: text(),
	projectId: integer("project_id"),
	externalId: text("external_id"),
}, (table) => [
	index("idx_crm_leads_channel").using("btree", table.channel.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_crm_leads_company_channel_external").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.channel.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("int4_ops")).where(sql`((external_id IS NOT NULL) AND (channel IS NOT NULL))`),
	index("idx_crm_leads_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
]);

export const projectLegalEntities = pgTable("project_legal_entities", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	projectId: integer("project_id").notNull(),
	legalEntityId: integer("legal_entity_id").notNull(),
	role: text().default('owner').notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_project_legal_entities_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.projectId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("idx_project_legal_entities_unique").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.legalEntityId.asc().nullsLast().op("int4_ops")),
]);

export const supplyRequests = pgTable("supply_requests", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	projectId: integer("project_id"),
	constructionStageId: integer("construction_stage_id"),
	requestedBy: integer("requested_by").notNull(),
	status: text().default('pending').notNull(),
	priority: text().default('normal').notNull(),
	neededByDate: text("needed_by_date"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	constructionTaskId: integer("construction_task_id"),
}, (table) => [
	index("idx_supply_requests_company_status").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const supplyRequestItems = pgTable("supply_request_items", {
	id: serial().primaryKey().notNull(),
	requestId: integer("request_id").notNull(),
	globalProductId: integer("global_product_id"),
	supplierProductId: integer("supplier_product_id"),
	customName: text("custom_name"),
	quantity: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	unit: text().default('шт').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supply_request_items_request").using("btree", table.requestId.asc().nullsLast().op("int4_ops")),
]);

export const supplyApprovals = pgTable("supply_approvals", {
	id: serial().primaryKey().notNull(),
	requestId: integer("request_id").notNull(),
	approverId: integer("approver_id").notNull(),
	status: text().default('pending').notNull(),
	comment: text(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supply_approvals_request").using("btree", table.requestId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
]);

export const companySupplierCreditLimits = pgTable("company_supplier_credit_limits", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	limitAmount: numeric("limit_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	usedAmount: numeric("used_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	termDays: integer("term_days").default(0).notNull(),
	markupPercent: numeric("markup_percent", { precision: 7, scale:  4 }).default('0').notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_credit_limits_company_supplier").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.supplierId.asc().nullsLast().op("int4_ops")),
]);

export const installmentPlans = pgTable("installment_plans", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	orderId: integer("order_id").notNull(),
	principalAmount: numeric("principal_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	markupAmount: numeric("markup_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	dueDate: text("due_date").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_installment_plans_order").using("btree", table.orderId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
]);

export const globalProductCategories = pgTable("global_product_categories", {
	id: serial().primaryKey().notNull(),
	parentId: integer("parent_id"),
	slug: text().notNull(),
	nameRu: text("name_ru").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_global_product_categories_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const globalProducts = pgTable("global_products", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id").notNull(),
	canonicalName: text("canonical_name").notNull(),
	slug: text().notNull(),
	unitDefault: text("unit_default").default('шт').notNull(),
	attributesSchema: text("attributes_schema"),
	attributes: text(),
	status: text().default('active').notNull(),
	searchText: text("search_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_global_products_category").using("btree", table.categoryId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
	uniqueIndex("idx_global_products_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const globalProductAliases = pgTable("global_product_aliases", {
	id: serial().primaryKey().notNull(),
	globalProductId: integer("global_product_id").notNull(),
	alias: text().notNull(),
	source: text().default('manual').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_global_product_aliases_alias").using("btree", table.alias.asc().nullsLast().op("text_ops")),
]);

export const supplierProducts = pgTable("supplier_products", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	globalProductId: integer("global_product_id"),
	localName: text("local_name").notNull(),
	localSku: text("local_sku"),
	unit: text().default('шт').notNull(),
	price: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	minOrderQty: numeric("min_order_qty", { precision: 12, scale:  3 }).default('1'),
	leadTimeDays: integer("lead_time_days"),
	isActive: boolean("is_active").default(true).notNull(),
	metadata: text(),
	lastImportAt: timestamp("last_import_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supplier_products_company_supplier").using("btree", table.companyId.asc().nullsLast().op("bool_ops"), table.supplierId.asc().nullsLast().op("int4_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("idx_supplier_products_company_supplier_sku").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.supplierId.asc().nullsLast().op("text_ops"), table.localSku.asc().nullsLast().op("text_ops")),
]);

export const supplyOrders = pgTable("supply_orders", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	requestId: integer("request_id"),
	status: text().default('draft').notNull(),
	paymentType: text("payment_type").default('prepaid').notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	notes: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	constructionExpenseId: integer("construction_expense_id"),
}, (table) => [
	index("idx_supply_orders_company_status").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const supplierPriceImports = pgTable("supplier_price_imports", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	supplierId: integer("supplier_id").notNull(),
	sourceType: text("source_type").default('excel').notNull(),
	fileName: text("file_name"),
	status: text().default('uploaded').notNull(),
	stats: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supplier_price_imports_company_status").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const supplierPriceImportRows = pgTable("supplier_price_import_rows", {
	id: serial().primaryKey().notNull(),
	importId: integer("import_id").notNull(),
	rowNumber: integer("row_number").notNull(),
	raw: text(),
	parsedName: text("parsed_name"),
	parsedUnit: text("parsed_unit"),
	parsedPrice: numeric("parsed_price", { precision: 15, scale:  2 }),
	suggestedGlobalProductId: integer("suggested_global_product_id"),
	matchConfidence: numeric("match_confidence", { precision: 6, scale:  4 }),
	matchStatus: text("match_status").default('pending').notNull(),
	supplierProductId: integer("supplier_product_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supplier_price_import_rows_import").using("btree", table.importId.asc().nullsLast().op("int4_ops"), table.matchStatus.asc().nullsLast().op("int4_ops")),
]);

export const marketplaceProducts = pgTable("marketplace_products", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().default('materials').notNull(),
	unit: text().default('шт').notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).default('0').notNull(),
	currency: text().default('KGS').notNull(),
	description: text(),
	imageUrl: text("image_url"),
	minOrderQty: numeric("min_order_qty", { precision: 12, scale:  3 }).default('1'),
	stockAvailable: numeric("stock_available", { precision: 12, scale:  3 }),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	supplierId: integer("supplier_id"),
	sku: text(),
	lastImportId: integer("last_import_id"),
}, (table) => [
	index("idx_marketplace_products_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.sortOrder.asc().nullsLast().op("bool_ops")),
	index("idx_marketplace_products_supplier").using("btree", table.supplierId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops"), table.sortOrder.asc().nullsLast().op("bool_ops")),
	uniqueIndex("idx_marketplace_products_supplier_sku").using("btree", sql`supplier_id`, sql`lower(TRIM(BOTH FROM sku))`).where(sql`((supplier_id IS NOT NULL) AND (sku IS NOT NULL) AND (TRIM(BOTH FROM sku) <> ''::text))`),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [marketplaceSuppliers.id],
			name: "marketplace_products_supplier_id_fkey"
		}).onDelete("set null"),
]);

export const marketplacePriceImports = pgTable("marketplace_price_imports", {
	id: serial().primaryKey().notNull(),
	supplierId: integer("supplier_id").notNull(),
	fileName: text("file_name"),
	status: text().default('review').notNull(),
	stats: text(),
	rowsPreview: text("rows_preview"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketplace_price_imports_supplier").using("btree", table.supplierId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [marketplaceSuppliers.id],
			name: "marketplace_price_imports_supplier_id_fkey"
		}).onDelete("cascade"),
]);

export const marketplaceSuppliers = pgTable("marketplace_suppliers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	code: text(),
	phone: text(),
	email: text(),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	supplierType: text("supplier_type").default('seller').notNull(),
}, (table) => [
	index("idx_marketplace_suppliers_active").using("btree", table.isActive.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_marketplace_suppliers_code").using("btree", sql`lower(TRIM(BOTH FROM code))`).where(sql`((code IS NOT NULL) AND (TRIM(BOTH FROM code) <> ''::text))`),
]);

export const userTableViews = pgTable("user_table_views", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	tableId: text("table_id").notNull(),
	layout: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("user_table_views_user_table_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.tableId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_table_views_user_id_fkey"
		}).onDelete("cascade"),
]);

export const constructionTaskSubtasks = pgTable("construction_task_subtasks", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	title: text().notNull(),
	status: text().default('todo').notNull(),
	assignedTo: integer("assigned_to"),
	dueDate: text("due_date"),
	progressPercent: integer("progress_percent").default(0).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_subtasks_task").using("btree", table.taskId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_subtasks_task_id_fkey"
		}).onDelete("cascade"),
]);

export const constructionTaskAttachments = pgTable("construction_task_attachments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	uploadedBy: integer("uploaded_by"),
	docType: text("doc_type").default('other').notNull(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	mimeType: text("mime_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_attachments_task").using("btree", table.taskId.asc().nullsLast().op("int4_ops")),
	index("idx_task_attachments_type").using("btree", table.taskId.asc().nullsLast().op("int4_ops"), table.docType.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_attachments_task_id_fkey"
		}).onDelete("cascade"),
]);

export const constructionTaskChecklistItems = pgTable("construction_task_checklist_items", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	title: text().notNull(),
	isDone: boolean("is_done").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	doneAt: timestamp("done_at", { withTimezone: true, mode: 'string' }),
	doneBy: integer("done_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_checklist_task").using("btree", table.taskId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_checklist_items_task_id_fkey"
		}).onDelete("cascade"),
]);

export const constructionTaskActivity = pgTable("construction_task_activity", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	userId: integer("user_id").notNull(),
	action: text().notNull(),
	fieldName: text("field_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	meta: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_activity_task").using("btree", table.taskId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_activity_task_id_fkey"
		}).onDelete("cascade"),
]);

export const constructionTaskPhotos = pgTable("construction_task_photos", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	uploadedBy: integer("uploaded_by"),
	photoType: text("photo_type").notNull(),
	photoUrl: text("photo_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	caption: text(),
	takenAt: timestamp("taken_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_photos_task").using("btree", table.taskId.asc().nullsLast().op("int4_ops")),
	index("idx_task_photos_type").using("btree", table.taskId.asc().nullsLast().op("int4_ops"), table.photoType.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_photos_task_id_fkey"
		}).onDelete("cascade"),
]);

export const taskComments = pgTable("task_comments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	taskId: integer("task_id").notNull(),
	userId: integer("user_id").notNull(),
	content: text().notNull(),
	commentType: text("comment_type").default('message').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	parentCommentId: integer("parent_comment_id"),
	mentions: text(),
	attachmentIds: text("attachment_ids"),
}, (table) => [
	foreignKey({
			columns: [table.parentCommentId],
			foreignColumns: [table.id],
			name: "task_comments_parent_comment_id_fkey"
		}).onDelete("set null"),
]);

export const constructionTaskDependencies = pgTable("construction_task_dependencies", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	predecessorTaskId: integer("predecessor_task_id").notNull(),
	successorTaskId: integer("successor_task_id").notNull(),
	dependencyType: text("dependency_type").default('FS').notNull(),
	lagDays: integer("lag_days").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_deps_predecessor").using("btree", table.predecessorTaskId.asc().nullsLast().op("int4_ops")),
	index("idx_task_deps_successor").using("btree", table.successorTaskId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.predecessorTaskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_dependencies_predecessor_task_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.successorTaskId],
			foreignColumns: [constructionTasks.id],
			name: "construction_task_dependencies_successor_task_id_fkey"
		}).onDelete("cascade"),
	unique("uniq_task_dependency").on(table.predecessorTaskId, table.successorTaskId, table.dependencyType),
]);

export const constructionTasks = pgTable("construction_tasks", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	stageId: integer("stage_id"),
	title: text().notNull(),
	description: text(),
	status: text().default('todo').notNull(),
	priority: text().default('medium').notNull(),
	assignedTo: integer("assigned_to"),
	dueDate: text("due_date"),
	completedAt: text("completed_at"),
	estimatedHours: numeric("estimated_hours", { precision: 8, scale:  2 }),
	actualHours: numeric("actual_hours", { precision: 8, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: integer("created_by"),
	parentTaskId: integer("parent_task_id"),
	progressPercent: integer("progress_percent").default(0).notNull(),
	progressMode: text("progress_mode").default('checklist').notNull(),
	plannedStartDate: text("planned_start_date"),
	plannedEndDate: text("planned_end_date"),
	actualStartDate: text("actual_start_date"),
	actualEndDate: text("actual_end_date"),
	workType: text("work_type").default('construction').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	contractorId: integer("contractor_id"),
	salesContractId: integer("sales_contract_id"),
	supplyRequestId: integer("supply_request_id"),
}, (table) => [
	index("idx_construction_tasks_assigned").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.assignedTo.asc().nullsLast().op("int4_ops")),
	index("idx_construction_tasks_company").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.projectId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
	index("idx_construction_tasks_contractor_id").using("btree", table.contractorId.asc().nullsLast().op("int4_ops")),
	index("idx_construction_tasks_sales_contract_id").using("btree", table.salesContractId.asc().nullsLast().op("int4_ops")),
	index("idx_construction_tasks_supply_request_id").using("btree", table.supplyRequestId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.contractorId],
			foreignColumns: [constructionContractors.id],
			name: "construction_tasks_contractor_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentTaskId],
			foreignColumns: [table.id],
			name: "construction_tasks_parent_task_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.salesContractId],
			foreignColumns: [constructionSalesContracts.id],
			name: "construction_tasks_sales_contract_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.supplyRequestId],
			foreignColumns: [supplyRequests.id],
			name: "construction_tasks_supply_request_id_fkey"
		}).onDelete("set null"),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	leaseContractId: integer("lease_contract_id").notNull(),
	accrualId: integer("accrual_id"),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	currency: text().default('KZT').notNull(),
	paymentDate: text("payment_date").notNull(),
	paymentMethod: text("payment_method"),
	accountId: integer("account_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accountAmount: numeric("account_amount", { precision: 14, scale:  2 }),
	exchangeRate: numeric("exchange_rate", { precision: 14, scale:  6 }),
	exchangeRateDate: text("exchange_rate_date"),
}, (table) => [
	index("idx_payments_lease").using("btree", table.leaseContractId.asc().nullsLast().op("int4_ops"), table.paymentDate.asc().nullsLast().op("int4_ops")),
]);

export const constructionUnits = pgTable("construction_units", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	projectId: integer("project_id").notNull(),
	unitNumber: text("unit_number").notNull(),
	floor: integer(),
	block: text(),
	unitType: text("unit_type").default('apartment').notNull(),
	roomCount: integer("room_count"),
	area: numeric({ precision: 8, scale:  2 }),
	pricePerSqm: numeric("price_per_sqm", { precision: 12, scale:  2 }),
	totalPrice: numeric("total_price", { precision: 15, scale:  2 }),
	currency: text().default('KGS').notNull(),
	status: text().default('available').notNull(),
	buyerId: integer("buyer_id"),
	contractDate: text("contract_date"),
	salesContractId: integer("sales_contract_id"),
	clientId: integer("client_id"),
	salePrice: numeric("sale_price", { precision: 15, scale:  2 }),
	saleDate: text("sale_date"),
	registrationDate: text("registration_date"),
	progressPercent: integer("progress_percent").default(0),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	originalArea: numeric("original_area", { precision: 10, scale:  2 }),
	areaModified: boolean("area_modified").default(false),
	areaModifiedBy: integer("area_modified_by"),
	areaModifiedAt: timestamp("area_modified_at", { withTimezone: true, mode: 'string' }),
	areaDelta: numeric("area_delta", { precision: 10, scale:  2 }),
	recalculationPrice: numeric("recalculation_price", { precision: 15, scale:  2 }),
	supplementStatus: text("supplement_status").default('none'),
	areaChangeDocumentMeta: text("area_change_document_meta"),
	priceCoefficient: numeric("price_coefficient", { precision: 8, scale:  4 }).default('1').notNull(),
	priceApproved: boolean("price_approved").default(false).notNull(),
	priceApprovedBy: integer("price_approved_by"),
	priceApprovedAt: timestamp("price_approved_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_construction_units_company_project").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_construction_units_status").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
]);

export const clientSegments = pgTable("client_segments", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	name: text().notNull(),
	description: text(),
	criteria: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const clientPortalPublications = pgTable("client_portal_publications", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	title: text().notNull(),
	body: text().notNull(),
	audience: text().default('all').notNull(),
	segmentId: integer("segment_id"),
	projectId: integer("project_id"),
	isActive: boolean("is_active").default(true).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_publications_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
]);

export const clientPortalAppeals = pgTable("client_portal_appeals", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	buyerId: integer("buyer_id").notNull(),
	contractId: integer("contract_id"),
	subject: text().notNull(),
	message: text().notNull(),
	status: text().default('open').notNull(),
	response: text(),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_appeals_buyer").using("btree", table.buyerId.asc().nullsLast().op("int4_ops")),
]);

export const barterAssets = pgTable("barter_assets", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	assetType: varchar("asset_type", { length: 32 }).default('vehicle').notNull(),
	title: varchar({ length: 512 }).notNull(),
	identifier: varchar({ length: 128 }),
	projectId: integer("project_id"),
	contractId: integer("contract_id"),
	status: varchar({ length: 32 }).default('in_stock').notNull(),
	acceptedAmountKgs: numeric("accepted_amount_kgs").default('0').notNull(),
	disposedAmountKgs: numeric("disposed_amount_kgs").default('0').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("barter_assets_company_idx").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	index("barter_assets_contract_idx").using("btree", table.contractId.asc().nullsLast().op("int4_ops")),
	index("barter_assets_project_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
]);

export const barterMovements = pgTable("barter_movements", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id").notNull(),
	assetId: integer("asset_id").notNull(),
	direction: varchar({ length: 8 }).notNull(),
	amountKgs: numeric("amount_kgs").notNull(),
	date: varchar({ length: 16 }).notNull(),
	counterpartyId: integer("counterparty_id"),
	contractorId: integer("contractor_id"),
	projectId: integer("project_id"),
	contractId: integer("contract_id"),
	accrualId: integer("accrual_id"),
	operationId: integer("operation_id"),
	purpose: text(),
	notes: text(),
	status: varchar({ length: 32 }).default('approved').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("barter_movements_asset_idx").using("btree", table.assetId.asc().nullsLast().op("int4_ops")),
	index("barter_movements_company_idx").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	index("barter_movements_operation_idx").using("btree", table.operationId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [barterAssets.id],
			name: "barter_movements_asset_id_fkey"
		}),
]);
