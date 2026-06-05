import {
	canAccessPath,
	isFullAdmin,
	type ModuleId,
} from "./module-access";

export type QuickCreateAction = {
	label: string;
	href: string;
	/** Любое из перечисленных прав даёт доступ к пункту */
	anyPermissions: string[];
	/** Только доступ к модулю (нет гранулярных прав в ролях) */
	moduleOnly?: boolean;
};

export type QuickCreateActionView = Pick<QuickCreateAction, "label" | "href">;

/** Эффективные права системных ролей (кастомные роли берут permissions из API) */
const SYSTEM_ROLE_EFFECTIVE_PERMISSIONS: Record<string, string[] | "all"> = {
	company_admin: "all",
	admin: "all",
	super_admin: "all",
	finance: [
		"finance.read",
		"finance.write",
		"finance.reports",
		"counterparties.read",
		"counterparties.write",
	],
	rental_manager: [
		"rental.read",
		"rental.write",
		"rental.payments",
		"counterparties.read",
		"counterparties.write",
		"properties.read",
		"properties.write",
	],
	sales_manager: [
		"properties.read",
		"properties.write",
		"counterparties.read",
		"counterparties.write",
	],
	pto: [
		"construction.read",
		"construction.write",
		"construction.finance",
		"counterparties.read",
		"counterparties.write",
	],
	engineer: [
		"construction.read",
		"construction.write",
		"counterparties.read",
	],
	staff: ["properties.read", "finance.read"],
};

export const MODULE_QUICK_CREATE_ACTIONS: Record<ModuleId, QuickCreateAction[]> =
	{
		construction: [
			{
				label: "Новая операция",
				href: "/construction/operations",
				anyPermissions: [
					"finance.write",
					"construction.write",
					"construction.finance",
				],
			},
			{
				label: "Новый договор",
				href: "/construction/contracts-sales",
				anyPermissions: ["construction.write"],
			},
			{
				label: "Новый проект",
				href: "/construction/projects",
				anyPermissions: ["construction.write"],
			},
			{
				label: "Согласование",
				href: "/construction/planning/approvals",
				anyPermissions: ["construction.write", "finance.write"],
			},
			{
				label: "Новый контрагент",
				href: "/counterparties?create=1",
				anyPermissions: ["counterparties.write"],
			},
		],
		rental: [
			{
				label: "Новый объект",
				href: "/rental/properties?create=1",
				anyPermissions: ["rental.write", "properties.write"],
			},
			{
				label: "Новый арендатор",
				href: "/rental/tenants?create=1",
				anyPermissions: ["rental.write"],
			},
			{
				label: "Новый договор",
				href: "/rental/contracts",
				anyPermissions: ["rental.write"],
			},
			{
				label: "Новый платёж",
				href: "/rental/payments",
				anyPermissions: ["rental.payments", "finance.write"],
			},
		],
		proptech: [
			{
				label: "Шахматка",
				href: "/crm/chess",
				anyPermissions: ["properties.read", "properties.write"],
			},
			{
				label: "Новый лид",
				href: "/crm/leads",
				anyPermissions: ["properties.write"],
			},
			{
				label: "Новый договор",
				href: "/crm/contracts-sales",
				anyPermissions: ["properties.write", "construction.write"],
			},
			{
				label: "Новый клиент",
				href: "/crm/clients",
				anyPermissions: ["properties.write", "counterparties.write"],
			},
		],
		warehouse: [
			{
				label: "Новый заказ",
				href: "/warehouse/orders",
				anyPermissions: ["admin.all"],
				moduleOnly: true,
			},
			{
				label: "Новая заявка",
				href: "/warehouse/requests",
				anyPermissions: ["admin.all"],
				moduleOnly: true,
			},
			{
				label: "Поставщик",
				href: "/warehouse/suppliers",
				anyPermissions: ["admin.all"],
				moduleOnly: true,
			},
		],
		consolidated: [
			{
				label: "Новый объект",
				href: "/properties",
				anyPermissions: ["properties.write"],
			},
			{
				label: "Новый контрагент",
				href: "/counterparties",
				anyPermissions: ["counterparties.write"],
			},
		],
	};

function resolveEffectivePermissions(
	role: string,
	customPermissions: string[],
): string[] | "all" {
	if (customPermissions.length > 0) {
		return customPermissions;
	}
	const system = SYSTEM_ROLE_EFFECTIVE_PERMISSIONS[role];
	if (system === "all") return "all";
	if (system) return system;
	return [];
}

export function canQuickCreateAction(
	action: QuickCreateAction,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): boolean {
	if (isFullAdmin(role)) return true;

	const effective = resolveEffectivePermissions(role, permissions);
	if (effective === "all") return true;
	if (permissions.includes("admin.all")) return true;

	if (
		!canAccessPath(action.href, allowedModules, role, permissions)
	) {
		return false;
	}

	if (action.moduleOnly) {
		return effective.some((p) => action.anyPermissions.includes(p));
	}

	if (effective.length === 0) return false;

	return action.anyPermissions.some((p) => effective.includes(p));
}

export function resolveQuickActions(
	moduleId: ModuleId,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): QuickCreateActionView[] {
	return MODULE_QUICK_CREATE_ACTIONS[moduleId]
		.filter((action) =>
			canQuickCreateAction(action, role, permissions, allowedModules),
		)
		.map(({ label, href }) => ({ label, href }));
}
