import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BarChart3,
	Grid3X3,
	Layers,
	ListTree,
	Plus,
	Table2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/currency-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import {
	fmtCurrencyAmount,
	kgsToDisplay,
	nbkrUsdRateLabel,
	type DisplayCurrency,
	type NbkrResponse,
} from "@/lib/nbkr-currency";
import { WbsCardsView } from "./WbsCardsView";
import { WbsDashboard } from "./WbsDashboard";
import { WbsGanttView } from "./WbsGanttView";
import { WbsStageDialog } from "./WbsStageDialog";
import { WbsStageDrawer } from "./WbsStageDrawer";
import { WbsTableView } from "./WbsTableView";
import { WbsTreeView } from "./WbsTreeView";
import { computeProjectDashboard, computeStageMetricsMap } from "./metrics";
import { flatToReorderPayload, flattenWbsTree } from "./tree";
import type {
	DialogState,
	FlatWbsNode,
	ProjectOption,
	WbsExpenseRow,
	WbsStage,
	WbsTaskSummary,
	WbsViewMode,
} from "./types";

const BASE = getApiBase();
const VIEW_STORAGE_KEY = "construction-wbs-view-mode";

const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const VIEW_OPTS: { id: WbsViewMode; label: string; icon: typeof Layers }[] = [
	{ id: "wbs", label: "WBS", icon: ListTree },
	{ id: "cards", label: "Карточки", icon: Grid3X3 },
	{ id: "table", label: "Таблица", icon: Table2 },
	{ id: "gantt", label: "Гант", icon: BarChart3 },
];

export function WbsPage() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<DialogState>(null);
	const [selectedNode, setSelectedNode] = useState<FlatWbsNode | null>(null);
	const [projectFilter, setProjectFilter] = useState<string>("all");
	const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("KGS");
	const [viewMode, setViewMode] = useState<WbsViewMode>(() => {
		if (typeof window === "undefined") return "wbs";
		const saved = localStorage.getItem(VIEW_STORAGE_KEY) as WbsViewMode | null;
		return saved && VIEW_OPTS.some((v) => v.id === saved) ? saved : "wbs";
	});

	const { data: projects = [] } = useQuery<ProjectOption[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const projectParams = projectFilter !== "all" ? { projectId: projectFilter } : undefined;

	const { data: stages = [], isLoading: stagesLoading } = useQuery<WbsStage[]>({
		queryKey: ["construction-stages", projectFilter],
		queryFn: () => api.get("/construction/stages", { params: projectParams }).then((r) => r.data),
	});

	const { data: expenses = [] } = useQuery<WbsExpenseRow[]>({
		queryKey: ["construction-expenses", projectFilter],
		queryFn: () =>
			api
				.get("/construction/expenses", { params: projectParams })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: tasks = [] } = useQuery<WbsTaskSummary[]>({
		queryKey: ["construction-tasks-wbs", projectFilter],
		queryFn: () =>
			api
				.get("/construction/tasks", { params: projectParams })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: nbkr, isLoading: nbkrLoading } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const metricsById = useMemo(
		() => computeStageMetricsMap(stages, tasks, expenses),
		[stages, tasks, expenses],
	);

	const flat = useMemo(() => flattenWbsTree(stages, metricsById), [stages, metricsById]);

	const dashboard = useMemo(
		() => computeProjectDashboard(stages, flat, tasks),
		[stages, flat, tasks],
	);

	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((p) => [p.id, p.name])),
		[projects],
	);

	const rates = nbkr?.rates || {};
	const fmt = (kgs: number) =>
		fmtCurrencyAmount(kgsToDisplay(kgs, displayCurrency, rates), displayCurrency);

	const isLoading = stagesLoading || nbkrLoading;
	const singleProjectId = projectFilter !== "all" ? Number(projectFilter) : null;
	const canReorder = singleProjectId != null && stages.length > 0;

	const handleViewChange = (mode: WbsViewMode) => {
		setViewMode(mode);
		localStorage.setItem(VIEW_STORAGE_KEY, mode);
	};

	const handleSelect = (stage: WbsStage) => {
		const node = flat.find((n) => n.id === stage.id) ?? null;
		setSelectedNode(node);
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить этап WBS? Подэтапы могут остаться без родителя.")) return;
		await fetch(`${BASE}/construction/stages/${id}`, { method: "DELETE", headers: ah() });
		toast({ title: "Этап удалён" });
		setSelectedNode(null);
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
	};

	const handleReorder = async (items: { id: number; parentStageId: number | null }[]) => {
		if (!singleProjectId) return;
		try {
			const res = await fetch(`${BASE}/construction/stages/reorder`, {
				method: "POST",
				headers: ah(),
				body: JSON.stringify({ projectId: singleProjectId, items }),
			});
			if (!res.ok) throw new Error("reorder failed");
			qc.invalidateQueries({ queryKey: ["construction-stages"] });
		} catch {
			toast({ title: "Не удалось сохранить структуру WBS", variant: "destructive" });
		}
	};

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
		qc.invalidateQueries({ queryKey: ["construction-expenses"] });
		qc.invalidateQueries({ queryKey: ["construction-tasks-wbs"] });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">План проекта (WBS)</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Иерархия работ, прогресс, бюджет и управление строительным объектом
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<CurrencyToggle
						value={displayCurrency}
						onChange={setDisplayCurrency}
						rateLabel={displayCurrency === "USD" ? nbkrUsdRateLabel(rates) : null}
						nbkrDate={nbkr?.date}
					/>
					<Button onClick={() => setDialog("new")} className="bg-amber-500 hover:bg-orange-600 gap-2">
						<Plus className="w-4 h-4" /> Добавить этап
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Select value={projectFilter} onValueChange={setProjectFilter}>
					<SelectTrigger className="w-[220px] h-9">
						<SelectValue placeholder="Проект" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все проекты</SelectItem>
						{projects.map((p) => (
							<SelectItem key={p.id} value={String(p.id)}>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
					{VIEW_OPTS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => handleViewChange(id)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
								viewMode === id ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-50"
							}`}
							title={label}
						>
							<Icon className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">{label}</span>
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-24 w-full rounded-xl" />
					<Skeleton className="h-40 w-full rounded-xl" />
				</div>
			) : (
				<>
					<WbsDashboard fmt={fmt} dashboard={dashboard} isLoading={false} />

					{viewMode === "wbs" && projectFilter === "all" && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							Выберите один проект для drag & drop и редактирования иерархии WBS
						</div>
					)}

					{viewMode === "wbs" && (
						<WbsTreeView
							flat={flat}
							stages={stages}
							fmt={fmt}
							onSelect={handleSelect}
							onAddSub={(s) => setDialog({ parentStageId: s.id, projectId: s.projectId })}
							onReorder={handleReorder}
							reorderEnabled={canReorder}
						/>
					)}

					{viewMode === "cards" && (
						<WbsCardsView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}

					{viewMode === "table" && (
						<WbsTableView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}

					{viewMode === "gantt" && (
						<WbsGanttView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}
				</>
			)}

			<WbsStageDialog
				stage={dialog}
				projects={projects}
				parentStages={stages}
				onClose={() => setDialog(null)}
				onSaved={invalidate}
			/>

			<WbsStageDrawer
				open={!!selectedNode}
				node={selectedNode}
				projectName={
					selectedNode ? projectMap[selectedNode.stage.projectId] ?? `Проект #${selectedNode.stage.projectId}` : ""
				}
				tasks={tasks}
				fmt={fmt}
				onClose={() => setSelectedNode(null)}
				onEdit={(s) => {
					setDialog(s);
				}}
				onDelete={handleDelete}
				onAddSub={(s) => setDialog({ parentStageId: s.id, projectId: s.projectId })}
			/>
		</div>
	);
}

export { flatToReorderPayload };
