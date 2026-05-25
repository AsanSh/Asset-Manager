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
import { parseCustomRoleId } from "@/lib/user-roles";

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

	const permissions = useMemo(() => {
		if (!customRoleId) return [] as string[];
		const row = roles.find((r) => r.id === customRoleId);
		return Array.isArray(row?.permissions) ? row.permissions : [];
	}, [customRoleId, roles]);

	const allowedModules = useMemo(
		() => resolveAllowedModules(role, permissions),
		[role, permissions],
	);

	const homePath = useMemo(
		() => getDefaultHomePath(role, allowedModules),
		[role, allowedModules],
	);

	return {
		isLoading: !!customRoleId && isLoading,
		role,
		permissions,
		allowedModules,
		homePath,
		canAccess: (path: string) => canAccessPath(path, allowedModules),
		hasModule: (moduleId: ModuleId) => allowedModules.includes(moduleId),
	};
}
