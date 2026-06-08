import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
	canAccessPath,
	getDefaultHomePath,
	resolveAllowedModules,
	type ModuleId,
} from "@/lib/module-access";
import { parseCustomRoleId } from "@/lib/custom-role-id";
import {
	isModuleIntegrationEnabled,
	settingsKeysToModuleIds,
	type ModuleIntegrationId,
} from "@/lib/module-registry";

interface CompanyRoleRow {
	id: number;
	name: string;
	permissions: string[];
	isActive: boolean;
}

export function useModuleAccess() {
	const { user } = useAuth();
	const role = user?.role ?? "";
	const customRoleId = parseCustomRoleId(role);

	const { data: roles = [], isLoading } = useQuery<CompanyRoleRow[]>({
		queryKey: ["company-roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
		enabled: customRoleId !== null,
		staleTime: 60_000,
	});

	const { data: enabledKeys, isLoading: modulesLoading } = useQuery<string[]>({
		queryKey: ["enabled-modules"],
		queryFn: () => api.get("/modules/enabled").then((r) => r.data),
		enabled: !!user,
		staleTime: 60_000,
		retry: false,
	});

	const permissions = useMemo(() => {
		if (!customRoleId) return [] as string[];
		const row = roles.find((r) => r.id === customRoleId);
		return Array.isArray(row?.permissions) ? row.permissions : [];
	}, [customRoleId, roles]);

	const allowedModules = useMemo(() => {
		const byRole = resolveAllowedModules(role, permissions);
		const byCompany = settingsKeysToModuleIds(enabledKeys);
		if (!byCompany) return byRole;
		if (byRole.includes("consolidated") && !byCompany.includes("consolidated")) {
			byCompany.push("consolidated");
		}
		const filtered = byRole.filter((moduleId) => byCompany.includes(moduleId));
		return filtered.length > 0 ? filtered : byRole;
	}, [role, permissions, enabledKeys]);

	const homePath = useMemo(
		() => getDefaultHomePath(role, allowedModules, permissions),
		[role, allowedModules, permissions],
	);

	return {
		isLoading: (!!customRoleId && isLoading) || (!!user && modulesLoading),
		role,
		permissions,
		allowedModules,
		homePath,
		canAccess: (path: string) =>
			canAccessPath(path, allowedModules, role, permissions),
		hasModule: (moduleId: ModuleId) => allowedModules.includes(moduleId),
		canUseIntegration: (integrationId: ModuleIntegrationId) =>
			isModuleIntegrationEnabled(allowedModules, integrationId),
	};
}
