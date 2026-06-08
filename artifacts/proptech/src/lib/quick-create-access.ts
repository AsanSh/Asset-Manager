import type { ModuleId } from "./module-access";
import { parseCustomRoleId } from "./custom-role-id";

export type QuickAction = {
	label: string;
	href: string;
	module: ModuleId;
	permission?: string;
	roles?: string[];
};

const QUICK_ACTIONS: QuickAction[] = [
	{ module: "construction", label: "Проект", href: "/construction/projects?create=1", permission: "construction.projects.create", roles: ["company_admin", "admin", "sales_manager"] },
	{ module: "construction", label: "Договор", href: "/construction/contracts-sales", permission: "construction.sales.create", roles: ["company_admin", "admin", "sales_manager"] },
	{ module: "construction", label: "Задача", href: "/construction/tasks?new=1", permission: "construction.tasks.create", roles: ["company_admin", "admin", "pto", "engineer"] },
	{ module: "finance", label: "Операция", href: "/construction/operations?new=1", permission: "finance.operations.create", roles: ["company_admin", "admin", "finance"] },
	{ module: "rental", label: "Договор аренды", href: "/rental/contracts?new=1", permission: "rental.contracts.create", roles: ["company_admin", "admin", "rental_manager"] },
	{ module: "rental", label: "Платёж аренды", href: "/rental/payments?new=1", permission: "rental.payments.create", roles: ["company_admin", "admin", "rental_manager", "finance"] },
	{ module: "proptech", label: "Лид", href: "/crm/leads?new=1", permission: "crm.leads.create", roles: ["company_admin", "admin", "sales_manager"] },
	{ module: "warehouse", label: "Поступление", href: "/warehouse/receipts?new=1", permission: "warehouse.receipts.create", roles: ["company_admin", "admin"] },
	{ module: "consolidated", label: "Контрагент", href: "/counterparties?new=1", permission: "counterparties.create", roles: ["company_admin", "admin", "finance"] },
];

function canUseAction(action: QuickAction, role: string, permissions: string[]): boolean {
	if (role === "company_admin" || role === "admin" || role === "super_admin") return true;
	if (action.roles?.includes(role)) return true;
	if (parseCustomRoleId(role)) {
		if (permissions.includes("admin.all")) return true;
		return action.permission ? permissions.includes(action.permission) : false;
	}
	return false;
}

export function resolveQuickActions(
	moduleId: ModuleId,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): QuickAction[] {
	return QUICK_ACTIONS.filter(
		(action) =>
			action.module === moduleId &&
			allowedModules.includes(action.module) &&
			canUseAction(action, role, permissions),
	);
}
