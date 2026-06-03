import { getModuleDashboardHref } from "@/lib/dashboard-access";
import type { ModuleId } from "@/lib/module-access";

/** Dashboard-пункт sidebar → href с учётом роли (вместо захардкоженного ?tab=). */
export function resolveNavItemHref(
	item: { href: string },
	moduleId: ModuleId,
	role: string,
	permissions: string[],
	allowedModules: ModuleId[],
): string {
	if (item.href.startsWith("/dashboard")) {
		return getModuleDashboardHref(
			moduleId,
			role,
			permissions,
			allowedModules,
		);
	}
	return item.href;
}
