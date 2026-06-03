import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/am/PageShell";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

type Project = { id: number; name: string };
type Stage = { id: number; name: string; costKgs: number };
type Task = {
	id: number;
	title: string;
	stageId?: number;
	costKgs: number;
};

type CostSummary = {
	projectId: number;
	totalKgs: number;
	expensesCount: number;
	stages: Stage[];
	tasks: Task[];
};

function fmt(n: number) {
	return n.toLocaleString("ru-KG", { maximumFractionDigits: 0 });
}

export default function ConstructionCostSummary() {
	const [projectId, setProjectId] = useState("");
	const [stageId, setStageId] = useState("");

	const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
		queryKey: ["construction-projects-cost"],
		queryFn: async () => {
			const { data } = await api.get("/construction/projects");
			return Array.isArray(data) ? data : data?.items ?? [];
		},
	});

	const queryKey = useMemo(
		() => ["cost-summary", projectId, stageId],
		[projectId, stageId],
	);

	const { data, isLoading } = useQuery<CostSummary>({
		queryKey,
		enabled: !!projectId,
		queryFn: () => {
			const params = new URLSearchParams({ projectId });
			if (stageId) params.set("stageId", stageId);
			return api.get(`/construction/cost-summary?${params}`).then((r) => r.data);
		},
	});

	const { data: stagesList = [] } = useQuery<{ id: number; name: string }[]>({
		queryKey: ["construction-stages-cost", projectId],
		enabled: !!projectId,
		queryFn: () =>
			api
				.get(`/construction/stages?projectId=${projectId}`)
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	return (
		<PageShell.List
			title="Себестоимость"
			subtitle="Факт расходов по проекту, этапу и задаче (операции, снабжение, подряд)"
		>
			<div className="flex flex-wrap gap-4 items-end bg-white rounded-xl border p-4 shadow-sm">
				<div className="min-w-[200px] flex-1">
					<Label>Проект</Label>
					<Select
						value={projectId}
						onValueChange={(v) => {
							setProjectId(v);
							setStageId("");
						}}
					>
						<SelectTrigger className="mt-1">
							<SelectValue placeholder="Выберите проект" />
						</SelectTrigger>
						<SelectContent>
							{projectsLoading ? (
								<SelectItem value="_" disabled>
									Загрузка…
								</SelectItem>
							) : (
								projects.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.name}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-[200px] flex-1">
					<Label>Этап (опционально)</Label>
					<Select
						value={stageId || "_all"}
						onValueChange={(v) => setStageId(v === "_all" ? "" : v)}
						disabled={!projectId}
					>
						<SelectTrigger className="mt-1">
							<SelectValue placeholder="Все этапы" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="_all">Все этапы</SelectItem>
							{stagesList.map((s) => (
								<SelectItem key={s.id} value={String(s.id)}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{!projectId ? (
				<p className="text-sm text-gray-500 py-12 text-center">
					Выберите проект для отчёта по себестоимости
				</p>
			) : isLoading ? (
				<Skeleton className="h-48 w-full rounded-xl" />
			) : data ? (
				<div className="space-y-6">
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
						<div className="rounded-xl border bg-white p-4 shadow-sm">
							<p className="text-xs text-gray-500">Итого, сом</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{fmt(data.totalKgs)}
							</p>
						</div>
						<div className="rounded-xl border bg-white p-4 shadow-sm">
							<p className="text-xs text-gray-500">Записей расходов</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{data.expensesCount}
							</p>
						</div>
					</div>

					<div className="rounded-xl border bg-white shadow-sm overflow-hidden">
						<div className="px-4 py-3 border-b font-semibold text-gray-900">
							По этапам
						</div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Этап</TableHead>
									<TableHead className="text-right">Себестоимость, сом</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.stages.map((s) => (
									<TableRow key={s.id}>
										<TableCell>{s.name}</TableCell>
										<TableCell className="text-right font-mono">
											{fmt(s.costKgs)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="rounded-xl border bg-white shadow-sm overflow-hidden">
						<div className="px-4 py-3 border-b font-semibold text-gray-900">
							По задачам
						</div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Задача</TableHead>
									<TableHead className="text-right">Себестоимость, сом</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.tasks.map((t) => (
									<TableRow key={t.id}>
										<TableCell>{t.title}</TableCell>
										<TableCell className="text-right font-mono">
											{fmt(t.costKgs)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			) : null}
		</PageShell.List>
	);
}
