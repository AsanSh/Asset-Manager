/** Упрощённые бизнес-роли для меню (5–7 пунктов на роль). */

export type BusinessNavRole =
	| "director"
	| "commercial"
	| "sales"
	| "finance"
	| "construction_ops"
	| "default";

const DIRECTOR_HREFS = [
	"/dashboard",
	"/construction/chess",
	"/construction/contracts-sales",
	"/construction/accruals",
	"/construction/planning/overdue",
	"/construction/analytics/debt",
	"/client-relations",
	"/counterparties",
];

const COMMERCIAL_HREFS = [
	"/dashboard",
	"/construction/chess",
	"/construction/projects",
	"/construction/contracts-sales",
	"/construction/accruals",
	"/client-relations",
	"/crm/leads",
];

const SALES_HREFS = [
	"/crm/leads",
	"/construction/chess",
	"/construction/contracts-sales",
	"/crm/clients",
];

const FINANCE_HREFS = [
	"/dashboard",
	"/construction/operations",
	"/construction/cashier",
	"/construction/reconciliation",
	"/construction/accruals",
	"/construction/analytics/cashflow",
];

const CONSTRUCTION_OPS_HREFS = [
	"/construction/projects",
	"/construction/stages",
	"/construction/tasks",
	"/construction/chess",
	"/construction/cost-summary",
	"/warehouse",
];

const ROLE_ALLOWED_PREFIXES: Record<BusinessNavRole, string[] | "all"> = {
	director: DIRECTOR_HREFS,
	commercial: COMMERCIAL_HREFS,
	sales: SALES_HREFS,
	finance: FINANCE_HREFS,
	construction_ops: CONSTRUCTION_OPS_HREFS,
	default: "all",
};

export function resolveBusinessNavRole(
	role: string,
	permissions: string[] = [],
): BusinessNavRole {
	if (role === "sales_manager") return "sales";
	if (["admin", "company_admin", "owner"].includes(role)) return "director";
	if (role === "finance") return "finance";
	if (role === "pto" || role === "engineer") return "construction_ops";
	if (permissions.some((p) => p.startsWith("construction"))) return "commercial";
	return "default";
}

export function isNavHrefAllowedForRole(
	href: string,
	businessRole: BusinessNavRole,
): boolean {
	const allowed = ROLE_ALLOWED_PREFIXES[businessRole];
	if (allowed === "all") return true;
	const path = href.split("?")[0] ?? href;
	return allowed.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);
}
