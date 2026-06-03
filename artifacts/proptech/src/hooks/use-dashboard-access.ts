import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import {
	getDefaultDashboardTab,
	resolveDashboardTabs,
	resolvePrimaryDashboardTabs,
	type DashboardTabId,
} from "@/lib/dashboard-access";
import { useModuleAccess } from "@/hooks/use-module-access";

export function useDashboardAccess() {
	const { user } = useAuth();
	const { role, permissions, allowedModules, isLoading } = useModuleAccess();

	const allowedTabs = useMemo(
		() => resolveDashboardTabs(role, permissions, allowedModules),
		[role, permissions, allowedModules],
	);

	const primaryTabs = useMemo(
		() => resolvePrimaryDashboardTabs(role, permissions, allowedModules),
		[role, permissions, allowedModules],
	);

	const defaultTab = useMemo(
		() => getDefaultDashboardTab(role, allowedTabs, allowedModules),
		[role, allowedTabs, allowedModules],
	);

	const canAccessTab = (tab: DashboardTabId) => allowedTabs.includes(tab);

	return {
		isLoading,
		role: user?.role ?? role,
		allowedTabs,
		primaryTabs,
		defaultTab,
		canAccessTab,
		hasDashboard: allowedTabs.length > 0,
	};
}
