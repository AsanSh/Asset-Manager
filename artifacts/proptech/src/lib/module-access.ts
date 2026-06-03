import {
	canAccessDashboardTab,
	getDefaultDashboardTab,
	parseDashboardTabFromSearch,
	resolveDashboardTabs,
	type DashboardTabId,
} from "./dashboard-access";
import { parseCustomRoleId } from "./custom-role-id";

export type ModuleId =
	| "construction"
	| "rental"
	| "proptech"
	| "warehouse"
	| "consolidated";

export const ALL_MODULE_IDS: ModuleId[] = [
	"construction",
	"rental",
	"proptech",
	"warehouse",
	"consolidated",
];

/** Префиксы URL → модуль (должны совпадать с layout.tsx) */
export const MODULE_URL_PREFIXES: Record<ModuleId, string[]> = {
	construction: ["/construction"],
	rental: ["/rental"],
	proptech: ["/crm", "/proptech"],
	warehouse: ["/warehouse"],
	consolidated: [
		"/dashboard",
		"/consolidated",
		"/counterparties",
		"/properties",
		"/users",
		"/settings",
		"/design-system",
		"/import",
		"/activity",
		"/companies",
		"/reports",
	],
};

const SYSTEM_ROLE_MODULES: Record<string, ModuleId[] | "all"> = {
	company_admin: "all",
	admin: "all",
	rental_manager: ["rental"],
	sales_manager: ["proptech"],
	finance: ["consolidated", "rental", "construction"],
	staff: ["consolidated"],
	pto: ["construction"],
	engineer: ["construction"],
};

const PERMISSION_PREFIX_TO_MODULE: Record<string, ModuleId> = {
	properties: "consolidated",
	users: "consolidated",
	rental: "rental",
	construction: "construction",
	finance: "consolidated",
	counterparties: "consolidated",
	settings: "consolidated",
	admin: "consolidated",
	warehouse: "warehouse",
};

const DEFAULT_HOME_LEGACY: Record<string, string> = {
	pto: "/construction/chess",
	engineer: "/construction/chess",
};

/** Вкладка unified Dashboard → модуль для sidebar */
const DASHBOARD_TAB_TO_MODULE: Record<string, ModuleId> = {
	control: "consolidated",
	analytics: "consolidated",
	construction: "construction",
	finance: "construction",
	supply: "warehouse",
	sales: "proptech",
	investors: "rental",
	rental: "rental",
};

function moduleFromDashboardPath(path: string): ModuleId | null {
	const qIdx = path.indexOf("?");
	if (qIdx === -1) return null;
	const pathOnly = path.slice(0, qIdx);
	if (pathOnly !== "/dashboard") return null;
	const tab = new URLSearchParams(path.slice(qIdx)).get("tab");
	if (tab && tab in DASHBOARD_TAB_TO_MODULE) {
		return DASHBOARD_TAB_TO_MODULE[tab]!;
	}
	return "consolidated";
}

export function detectModuleFromPath(path: string): ModuleId {
	const fromDashboard = moduleFromDashboardPath(path);
	if (fromDashboard) return fromDashboard;

	const pathOnly = path.split("?")[0] ?? path;
	for (const id of ALL_MODULE_IDS) {
		const prefixes = MODULE_URL_PREFIXES[id];
		if (prefixes.some((p) => pathOnly.startsWith(p))) return id;
	}
	return "consolidated";
}

export function resolveAllowedModules(
	role: string,
	permissions: string[] = [],
): ModuleId[] {
	if (!role) return ["consolidated"];

	const system = SYSTEM_ROLE_MODULES[role];
	if (system === "all") return ALL_MODULE_IDS;
	if (system) return system;

	const customId = parseCustomRoleId(role);
	if (customId) {
		if (permissions.includes("admin.all")) return ALL_MODULE_IDS;
		const modules = new Set<ModuleId>();
		for (const perm of permissions) {
			const prefix = perm.split(".")[0];
			const mod = PERMISSION_PREFIX_TO_MODULE[prefix];
			if (mod) modules.add(mod);
		}
		if (modules.size > 0) return [...modules];
	}

	return ["consolidated"];
}

export function getDefaultHomePath(
	role: string,
	allowedModules: ModuleId[],
	permissions: string[] = [],
): string {
	if (DEFAULT_HOME_LEGACY[role]) return DEFAULT_HOME_LEGACY[role];
	const tabs = resolveDashboardTabs(role, permissions, allowedModules);
	if (tabs.length > 0) {
		const tab = getDefaultDashboardTab(role, tabs, allowedModules);
		return `/dashboard?tab=${tab}`;
	}
	return "/dashboard";
}

export function canAccessPath(
	path: string,
	allowedModules: ModuleId[],
	role = "",
	permissions: string[] = [],
): boolean {
	if (path === "/" || path === "/login" || path === "/register") return true;

	const pathOnly = path.split("?")[0] ?? path;
	const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";

	if (pathOnly === "/dashboard" || path.startsWith("/dashboard?")) {
		const tabs = resolveDashboardTabs(role, permissions, allowedModules);
		if (tabs.length === 0) return false;
		const tab = parseDashboardTabFromSearch(
			search || (path.includes("?") ? path.slice(path.indexOf("?")) : ""),
		);
		if (!tab) return true;
		return canAccessDashboardTab(tab, role, permissions, allowedModules);
	}

	// Legacy dashboard URLs — доступны всем с соответствующей вкладкой (редирект в App)
	const legacyTabMap: Record<string, DashboardTabId> = {
			"/rental/dashboard": "rental",
			"/construction/dashboard": "finance",
			"/crm/dashboard": "sales",
			"/warehouse/dashboard": "supply",
		};
	if (legacyTabMap[pathOnly]) {
		return canAccessDashboardTab(
			legacyTabMap[pathOnly],
			role,
			permissions,
			allowedModules,
		);
	}

	const moduleId = detectModuleFromPath(pathOnly);
	return allowedModules.includes(moduleId);
}

export function isFullAdmin(role: string): boolean {
	return role === "company_admin" || role === "admin";
}
