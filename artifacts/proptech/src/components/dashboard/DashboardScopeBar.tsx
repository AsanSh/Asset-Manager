import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMemo } from "react";
import { PeriodPicker } from "@/components/period-picker";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Project = { id: number; name: string; legalEntityId?: number | null };
type LegalEntity = { id: number; name: string; isActive?: boolean };

export function DashboardScopeBar() {
	const { user } = useAuth();
	const { scope, setScope, resetScope } = useDashboardScope();

	const { data: company } = useQuery({
		queryKey: ["company", user?.companyId],
		queryFn: () =>
			api.get<{ name: string }>(`/companies/${user!.companyId}`).then((r) => r.data),
		enabled: user?.companyId != null,
	});

	const { data: projectsRaw = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: legalRaw = [] } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () => api.get<LegalEntity[]>("/legal-entities").then((r) => r.data),
	});

	const projects = (Array.isArray(projectsRaw) ? projectsRaw : []) as Project[];
	const legalEntities = (Array.isArray(legalRaw) ? legalRaw : []).filter(
		(e) => e.isActive !== false,
	);

	const projectsForLegal = useMemo(() => {
		if (scope.legalEntityId == null) return projects;
		return projects.filter(
			(p) => Number(p.legalEntityId) === scope.legalEntityId,
		);
	}, [projects, scope.legalEntityId]);

	const hasFilter =
		scope.projectId != null ||
		scope.legalEntityId != null ||
		scope.period.preset !== "all";

	return (
		<div className="flex flex-wrap items-center gap-2 py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
			<span className="text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0">
				Контекст
			</span>
			<span className="text-xs text-gray-600 shrink-0 hidden sm:inline">
				{company?.name || "Холдинг"}
			</span>

			<Select
				value={scope.legalEntityId != null ? String(scope.legalEntityId) : "all"}
				onValueChange={(v) =>
					setScope({
						legalEntityId: v === "all" ? null : parseInt(v, 10),
						projectId: null,
					})
				}
			>
				<SelectTrigger className="h-8 w-[160px] bg-white text-xs">
					<SelectValue placeholder="Все ОсОО" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Все ОсОО</SelectItem>
					{legalEntities.map((le) => (
						<SelectItem key={le.id} value={String(le.id)}>
							{le.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={scope.projectId != null ? String(scope.projectId) : "all"}
				onValueChange={(v) =>
					setScope({
						projectId: v === "all" ? null : parseInt(v, 10),
					})
				}
			>
				<SelectTrigger className="h-8 w-[180px] bg-white text-xs">
					<SelectValue placeholder="Все проекты" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Все проекты</SelectItem>
					{projectsForLegal.map((p) => (
						<SelectItem key={p.id} value={String(p.id)}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<PeriodPicker
				value={scope.period}
				onChange={(period) => setScope({ period })}
				className="h-8"
			/>

			{hasFilter && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 text-xs text-gray-500"
					onClick={resetScope}
				>
					<X className="w-3.5 h-3.5 mr-1" />
					Сбросить
				</Button>
			)}
		</div>
	);
}
