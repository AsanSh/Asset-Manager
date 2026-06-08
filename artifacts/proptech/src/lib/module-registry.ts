import type { DashboardTabId } from "./dashboard-access";
import type { ModuleId } from "./module-access";

export type CanonicalModuleId =
	| "core"
	| "construction"
	| "finance"
	| "procurement"
	| "crm"
	| "rent"
	| "investors";

export type ModuleIntegrationId =
	| "construction.finance"
	| "construction.procurement"
	| "construction.crm"
	| "crm.construction"
	| "rent.finance"
	| "procurement.finance"
	| "investors.rent";

export interface ModuleIntegration {
	id: ModuleIntegrationId;
	requires: CanonicalModuleId[];
	description: string;
}

export interface ModuleDefinition {
	id: ModuleId;
	canonicalId: CanonicalModuleId;
	label: string;
	shortLabel: string;
	description: string;
	settingsKeys: string[];
	routePrefixes: string[];
	dashboardTabs: DashboardTabId[];
	defaultPath: string;
	ownedEntities: string[];
	integrations: ModuleIntegration[];
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
	{
		id: "consolidated",
		canonicalId: "core",
		label: "Центр управления",
		shortLabel: "Сводное",
		description: "Общее ядро компании: пользователи, контрагенты, настройки, импорт и сводная аналитика.",
		settingsKeys: ["core", "analytics", "properties", "users", "counterparties", "settings", "admin"],
		routePrefixes: ["/dashboard", "/consolidated", "/counterparties", "/properties", "/users", "/settings", "/design-system", "/import", "/activity", "/companies", "/reports"],
		dashboardTabs: ["control", "analytics"],
		defaultPath: "/dashboard?tab=control",
		ownedEntities: ["company", "user", "role", "counterparty", "notification"],
		integrations: [],
	},
	{
		id: "construction",
		canonicalId: "construction",
		label: "Строительство",
		shortLabel: "Стройка",
		description: "Проекты, этапы, задачи, шахматка, продажи объектов и строительный контроль.",
		settingsKeys: ["construction", "sales"],
		routePrefixes: ["/construction"],
		dashboardTabs: ["construction"],
		defaultPath: "/dashboard?tab=construction",
		ownedEntities: ["project", "stage", "task", "unit", "salesContract"],
		integrations: [
			{
				id: "construction.finance",
				requires: ["construction", "finance"],
				description: "Бюджеты, начисления, платежи, ОДДС/ОПУ и задолженность по строительным проектам.",
			},
			{
				id: "construction.procurement",
				requires: ["construction", "procurement"],
				description: "Создание заявки снабжения из задачи или этапа строительства.",
			},
			{
				id: "construction.crm",
				requires: ["construction", "crm"],
				description: "Передача доступных юнитов в CRM и клиентский сервис.",
			},
		],
	},
	{
		id: "finance",
		canonicalId: "finance",
		label: "Финансы",
		shortLabel: "Финансы",
		description: "Счета, операции, зарплата, ОДДС, ОПУ, бюджет, задолженности и платежный календарь.",
		settingsKeys: ["finance", "reports"],
		routePrefixes: [
			"/construction/accounts",
			"/construction/operations",
			"/construction/accruals",
			"/construction/cashier",
			"/construction/reconciliation",
			"/construction/payroll",
			"/construction/budget",
			"/construction/analytics",
			"/construction/planning/forecast",
			"/construction/planning/overdue",
			"/construction/planning/approvals",
			"/reports/cashflow",
			"/reports/payments",
			"/reports/debt",
			"/reports/directions",
		],
		dashboardTabs: ["finance"],
		defaultPath: "/dashboard?tab=finance",
		ownedEntities: ["account", "operation", "budget", "accrual", "payment", "payrollEmployee", "approvalRequest"],
		integrations: [],
	},
	{
		id: "warehouse",
		canonicalId: "procurement",
		label: "Снабжение",
		shortLabel: "Закуп",
		description: "Заявки, поставщики, заказы, склад, поступления, списания и маркетплейс материалов.",
		settingsKeys: ["warehouse", "procurement", "supply"],
		routePrefixes: ["/warehouse"],
		dashboardTabs: ["supply"],
		defaultPath: "/dashboard?tab=supply",
		ownedEntities: ["supplyRequest", "purchaseOrder", "supplier", "warehouseItem", "stockMovement"],
		integrations: [
			{
				id: "procurement.finance",
				requires: ["procurement", "finance"],
				description: "Платежи поставщикам и фактические расходы попадают в финансы.",
			},
		],
	},
	{
		id: "proptech",
		canonicalId: "crm",
		label: "CRM",
		shortLabel: "CRM",
		description: "Лиды, клиенты, сделки, клиентский сервис, объявления и портал контрагентов.",
		settingsKeys: ["crm", "notifications"],
		routePrefixes: ["/crm", "/proptech"],
		dashboardTabs: ["sales"],
		defaultPath: "/dashboard?tab=sales",
		ownedEntities: ["lead", "client", "deal", "clientAnnouncement", "clientPortal"],
		integrations: [
			{
				id: "crm.construction",
				requires: ["crm", "construction"],
				description: "CRM видит юниты строительства и оформляет продажу по утвержденной цене.",
			},
		],
	},
	{
		id: "rental",
		canonicalId: "rent",
		label: "Аренда",
		shortLabel: "Аренда",
		description: "Объекты аренды, арендаторы, договоры, начисления, платежи и отчеты собственников.",
		settingsKeys: ["rental", "rent"],
		routePrefixes: ["/rental"],
		dashboardTabs: ["rental", "investors"],
		defaultPath: "/dashboard?tab=rental",
		ownedEntities: ["rentalProperty", "tenant", "lease", "rentAccrual", "rentPayment"],
		integrations: [
			{
				id: "rent.finance",
				requires: ["rent", "finance"],
				description: "Арендные начисления и платежи попадают в общую финансовую аналитику.",
			},
			{
				id: "investors.rent",
				requires: ["investors", "rent"],
				description: "Инвесторские выплаты строятся на доходах и расходах арендных объектов.",
			},
		],
	},
];

export const FINANCE_CANONICAL_MODULE: CanonicalModuleId = "finance";

const SETTINGS_KEY_TO_MODULE_ID = MODULE_REGISTRY.reduce<Record<string, ModuleId>>(
	(acc, moduleDef) => {
		for (const key of moduleDef.settingsKeys) acc[key] = moduleDef.id;
		return acc;
	},
	{},
);

const UI_MODULE_TO_CANONICAL = MODULE_REGISTRY.reduce<Record<ModuleId, CanonicalModuleId>>(
	(acc, moduleDef) => {
		acc[moduleDef.id] = moduleDef.canonicalId;
		return acc;
	},
	{} as Record<ModuleId, CanonicalModuleId>,
);

const ROUTE_PREFIX_TO_MODULE_ID = MODULE_REGISTRY.flatMap((moduleDef) =>
	moduleDef.routePrefixes.map((prefix) => ({ prefix, moduleId: moduleDef.id })),
).sort((a, b) => b.prefix.length - a.prefix.length);

const DASHBOARD_TAB_TO_MODULE_ID = MODULE_REGISTRY.reduce<Partial<Record<DashboardTabId, ModuleId>>>(
	(acc, moduleDef) => {
		for (const tab of moduleDef.dashboardTabs) acc[tab] = moduleDef.id;
		return acc;
	},
	{},
);

export function getModuleDefinition(moduleId: ModuleId): ModuleDefinition | undefined {
	return MODULE_REGISTRY.find((moduleDef) => moduleDef.id === moduleId);
}

export function moduleIdFromSettingsKey(key: string): ModuleId | null {
	return SETTINGS_KEY_TO_MODULE_ID[key] ?? null;
}

export function getSettingsKeyModuleId(key: string): ModuleId | null {
	return moduleIdFromSettingsKey(key);
}

export function getDashboardTabModuleId(tab: DashboardTabId): ModuleId | null {
	return DASHBOARD_TAB_TO_MODULE_ID[tab] ?? null;
}

export function getRouteModuleId(path: string): ModuleId | null {
	for (const { prefix, moduleId } of ROUTE_PREFIX_TO_MODULE_ID) {
		if (path === prefix || path.startsWith(`${prefix}/`)) return moduleId;
	}
	return null;
}

export function settingsKeysToModuleIds(keys: string[] | undefined): ModuleId[] | null {
	if (!Array.isArray(keys) || keys.length === 0) return null;

	const business = new Set<ModuleId>();
	for (const key of keys) {
		const moduleId = moduleIdFromSettingsKey(key);
		if (moduleId && moduleId !== "consolidated") business.add(moduleId);
	}

	if (business.size === 0) return null;

	const result = [...business];
	const hasCoreSignal = keys.some((key) => moduleIdFromSettingsKey(key) === "consolidated");
	if (hasCoreSignal || result.length > 1) result.push("consolidated");
	return result;
}

export function canonicalModulesFromUiModules(moduleIds: ModuleId[]): CanonicalModuleId[] {
	const canonical = new Set<CanonicalModuleId>();
	for (const moduleId of moduleIds) {
		const mapped = UI_MODULE_TO_CANONICAL[moduleId];
		if (mapped) canonical.add(mapped);
		if (moduleId === "rental") canonical.add("investors");
	}
	return [...canonical];
}

export function isModuleIntegrationEnabled(
	enabledModules: ModuleId[],
	integrationId: ModuleIntegrationId,
): boolean {
	const enabledCanonical = new Set(canonicalModulesFromUiModules(enabledModules));
	const integration = MODULE_REGISTRY.flatMap((moduleDef) => moduleDef.integrations)
		.find((item) => item.id === integrationId);
	if (!integration) return false;
	return integration.requires.every((moduleId) => enabledCanonical.has(moduleId));
}
