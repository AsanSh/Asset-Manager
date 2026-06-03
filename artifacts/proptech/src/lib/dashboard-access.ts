import type { ModuleId } from "./module-access";
import { parseCustomRoleId } from "./custom-role-id";

/** Вкладки единого Dashboard */
export type DashboardTabId =
	| "control"
	| "construction"
	| "finance"
	| "supply"
	| "sales"
	| "investors"
	| "rental"
	| "analytics";

export const DASHBOARD_TAB_ORDER: DashboardTabId[] = [
	"control",
	"construction",
	"finance",
	"supply",
	"sales",
	"investors",
	"rental",
	"analytics",
];

/** Вкладки в основной полоске (без вложенных разделов investors/analytics) */
export const PRIMARY_DASHBOARD_TAB_ORDER: DashboardTabId[] = [
	"control",
	"construction",
	"finance",
	"supply",
	"sales",
	"rental",
];

export const DASHBOARD_TAB_LABELS: Record<DashboardTabId, string> = {
	control: "Центр управления",
	construction: "Строительство",
	finance: "Финансы",
	supply: "Снабжение",
	sales: "Продажи",
	investors: "Инвесторы",
	rental: "Аренда",
	analytics: "Аналитика",
};

/** Какие вкладки открывает модуль (пересечение с ролью) */
const MODULE_TABS: Partial<Record<ModuleId, DashboardTabId[]>> = {
	consolidated: ["control", "analytics"],
	construction: ["construction", "finance"],
	rental: ["rental", "investors"],
	proptech: ["sales"],
	warehouse: ["supply"],
};

/** Жёсткое ограничение по системной роли (пересекается с модулями) */
const ROLE_TAB_CAP: Record<string, DashboardTabId[] | "all"> = {
	company_admin: "all",
	admin: "all",
	super_admin: "all",

	rental_manager: ["rental"],
	sales_manager: ["sales"],
	finance: ["finance"],
	pto: ["construction"],
	engineer: ["construction"],
	staff: ["control"],
};

const PERMISSION_PREFIX_TO_TAB: Record<string, DashboardTabId> = {
	finance: "finance",
	construction: "construction",
	rental: "rental",
	warehouse: "supply",
	properties: "control",
	users: "control",
	counterparties: "control",
	settings: "control",
	admin: "control",
};

const ROLE_DEFAULT_TAB: Record<string, DashboardTabId> = {
	company_admin: "control",
	admin: "control",
	super_admin: "control",
	rental_manager: "rental",
	sales_manager: "sales",
	finance: "finance",
	pto: "construction",
	engineer: "construction",
	staff: "control",
};

const MODULE_DEFAULT_TAB: Record<ModuleId, DashboardTabId> = {
	consolidated: "control",
	construction: "construction",
	rental: "rental",
	proptech: "sales",
	warehouse: "supply",
};

function tabsFromModules(allowedModules: ModuleId[]): Set<DashboardTabId> {
	const set = new Set<DashboardTabId>();
	for (const mod of allowedModules) {
		for (const tab of MODULE_TABS[mod] ?? []) set.add(tab);
	}
	return set;
}

function roleCapTabs(
	role: string,
	permissions: string[],
): DashboardTabId[] | "all" {
	const system = ROLE_TAB_CAP[role];
	if (system === "all") return "all";
	if (system) return system;

	const customId = parseCustomRoleId(role);
	if (customId) {
		if (permissions.includes("admin.all")) return "all";
		const tabs = new Set<DashboardTabId>();
		for (const perm of permissions) {
			const prefix = perm.split(".")[0];
			const tab = PERMISSION_PREFIX_TO_TAB[prefix];
			if (tab) tabs.add(tab);
		}
		if (tabs.size > 0) return [...tabs];
	}

	return "all";
}

export function resolveDashboardTabs(
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): DashboardTabId[] {
	const fromModules = tabsFromModules(allowedModules);
	const cap = roleCapTabs(role, permissions);

	let allowed: Set<DashboardTabId>;
	if (cap === "all") {
		allowed = fromModules;
		// CEO / admin: если есть несколько модулей — полный набор вкладок по модулям
	} else {
		allowed = new Set();
		for (const tab of cap) {
			if (fromModules.has(tab)) allowed.add(tab);
		}
		// Роль разрешает вкладку, но модуль не подключён — не показываем
		if (allowed.size === 0 && cap.length === 1) {
			// rental_manager с только rental — fromModules уже содержит rental
			for (const tab of cap) {
				if (fromModules.has(tab)) allowed.add(tab);
			}
		}
	}

	// finance-only: модуль consolidated даёт control — отрезаем для finance role
	if (role === "finance") {
		allowed = new Set(["finance"]);
	}

	const ordered = DASHBOARD_TAB_ORDER.filter((t) => allowed.has(t));
	if (ordered.length > 0) return ordered;

	// fallback: первая вкладка из модулей
	if (fromModules.has("control")) return ["control"];
	const firstMod = allowedModules[0];
	if (firstMod && MODULE_TABS[firstMod]?.[0]) {
		return [MODULE_TABS[firstMod][0]!];
	}
	return ["control"];
}

export function getDefaultDashboardTab(
	role: string,
	allowedTabs: DashboardTabId[],
	allowedModules: ModuleId[],
): DashboardTabId {
	if (ROLE_DEFAULT_TAB[role] && allowedTabs.includes(ROLE_DEFAULT_TAB[role])) {
		return ROLE_DEFAULT_TAB[role];
	}
	if (allowedModules.length === 1) {
		const preferred = MODULE_DEFAULT_TAB[allowedModules[0]!];
		if (allowedTabs.includes(preferred)) return preferred;
	}
	return allowedTabs[0] ?? "control";
}

export function parseDashboardTabFromSearch(
	search: string,
): DashboardTabId | null {
	const raw = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	).get("tab");
	if (!raw) return null;
	if (DASHBOARD_TAB_ORDER.includes(raw as DashboardTabId)) {
		return raw as DashboardTabId;
	}
	return null;
}

export function dashboardHref(tab: DashboardTabId): string {
	return `/dashboard?tab=${tab}`;
}

/** Ссылка на Dashboard из sidebar модуля */
export function getModuleDashboardHref(
	moduleId: ModuleId,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): string {
	const tabs = resolveDashboardTabs(role, permissions, allowedModules);
	const preferred = MODULE_DEFAULT_TAB[moduleId];
	if (tabs.includes(preferred)) return dashboardHref(preferred);
	const def = getDefaultDashboardTab(role, tabs, allowedModules);
	return dashboardHref(def);
}

export function canAccessDashboardTab(
	tab: DashboardTabId,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): boolean {
	return resolveDashboardTabs(role, permissions, allowedModules).includes(tab);
}

/** Вкладки для UI-полоски (≤6, без investors/analytics — они доступны по ссылкам) */
export function resolvePrimaryDashboardTabs(
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): DashboardTabId[] {
	const allowed = resolveDashboardTabs(role, permissions, allowedModules);
	return PRIMARY_DASHBOARD_TAB_ORDER.filter((tab) => allowed.includes(tab));
}
