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
	sales_manager: ["construction", "proptech"],
	finance: ["consolidated", "rental", "construction"],
	staff: ["consolidated"],
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

const DEFAULT_HOME: Record<string, string> = {
	rental_manager: "/rental/dashboard",
	sales_manager: "/construction/dashboard",
	finance: "/dashboard",
	staff: "/dashboard",
	company_admin: "/dashboard",
	admin: "/dashboard",
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
): string {
	if (DEFAULT_HOME[role]) return DEFAULT_HOME[role];
	if (allowedModules.length === 1) {
		const mod = allowedModules[0];
		if (mod === "rental") return "/rental/dashboard";
		if (mod === "construction") return "/construction/dashboard";
		if (mod === "proptech") return "/crm/dashboard";
		if (mod === "warehouse") return "/warehouse/dashboard";
	}
	return "/dashboard";
}

export function canAccessPath(
	path: string,
	allowedModules: ModuleId[],
): boolean {
	if (path === "/" || path === "/login") return true;
	const moduleId = detectModuleFromPath(path);
	return allowedModules.includes(moduleId);
}

export function isFullAdmin(role: string): boolean {
	return role === "company_admin" || role === "admin";
}
