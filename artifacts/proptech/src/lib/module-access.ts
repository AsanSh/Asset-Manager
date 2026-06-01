import {
	canAccessDashboardTab,
	getDefaultDashboardTab,
	parseDashboardTabFromSearch,
	resolveDashboardTabs,
	type DashboardTabId,
} from "./dashboard-access";
import { parseCustomRoleId } from "./user-roles";

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
		"/counterparties",
		"/properties",
		"/users",
		"/settings",
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
};

const DEFAULT_HOME_LEGACY: Record<string, string> = {
	pto: "/construction/chess",
	engineer: "/construction/chess",
};

export function detectModuleFromPath(path: string): ModuleId {
	for (const id of ALL_MODULE_IDS) {
		const prefixes = MODULE_URL_PREFIXES[id];
		if (prefixes.some((p) => path.startsWith(p))) return id;
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

	if (pathOnly === "/dashboard" || path.startsWith("/dashboard?")) {
		const tabs = resolveDashboardTabs(role, permissions, allowedModules);
		if (tabs.length === 0) return false;
		const tab = parseDashboardTabFromSearch(
			path.includes("?") ? path.slice(path.indexOf("?")) : "",
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
