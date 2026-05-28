import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Flag, Folder, GripVertical, Layers, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/currency-toggle";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const STATUS_OPTS = [
	{ value: "planned", label: "Запланирован" },
	{ value: "active", label: "В работе" },
	{ value: "completed", label: "Завершён" },
	{ value: "paused", label: "Приостановлен" },
];

interface Stage {
	id: number;
	projectId: number;
	parentStageId?: number | null;
	name: string;
	description?: string;
	status: string;
	progress: number;
	startDate?: string;
	plannedEndDate?: string;
	budgetAmount?: string;
	sortOrder: number;
	createdAt: string;
}
interface Project {
	id: number;
	name: string;
}

interface ExpenseRow {
	id: number;
	projectId: number;
	stageId?: number | null;
	amountKgs?: string | null;
	amount?: string | null;
}

type DialogState = Stage | null | "new" | { parentStageId: number; projectId: number };

function stageParentId(s: Stage): number | null {
	const raw = s.parentStageId ?? (s as Stage & { parent_stage_id?: number | null }).parent_stage_id;
	if (raw == null || raw === "") return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function bySortOrder(a: Stage, b: Stage) {
	return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
}

/** Плоский список: этап 4 → его подэтапы → этап 5 → … */
function buildFlatStageList(stages: Stage[]): Stage[] {
	const childrenByParent = stages.reduce<Record<number, Stage[]>>((acc, s) => {
		const pid = stageParentId(s);
		if (pid == null) return acc;
		if (!acc[pid]) acc[pid] = [];
		acc[pid].push(s);
		return acc;
	}, {});
	for (const pid of Object.keys(childrenByParent)) {
		childrenByParent[Number(pid)].sort(bySortOrder);
	}

	const roots = stages.filter((s) => stageParentId(s) == null).sort(bySortOrder);
	const result: Stage[] = [];
	for (const root of roots) {
		result.push(root);
		result.push(...(childrenByParent[root.id] ?? []));
	}

	// Подэтапы без найденного родителя — в конец, чтобы не терялись
	const placed = new Set(result.map((s) => s.id));
	for (const s of stages) {
		if (!placed.has(s.id)) result.push(s);
	}
	return result;
}

function StageDialog({
	stage,
	projects,
	parentStages,
	onClose,
	onSaved,
}: {
	stage: DialogState;
	projects: Project[];
	parentStages: Stage[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = stage && stage !== "new" && !("parentStageId" in stage && !("id" in stage));
	const init = isEdit ? (stage as Stage) : null;

	// For "add sub-stage" shortcut
	const presetParent =
		stage && typeof stage === "object" && !("id" in stage)
			? (stage as { parentStageId: number; projectId: number })
			: null;

	const [form, setForm] = useState({
		projectId: String(init?.projectId || presetParent?.projectId || projects[0]?.id || ""),
		parentStageId: String(init?.parentStageId || presetParent?.parentStageId || ""),
		name: init?.name || "",
		description: init?.description || "",
		status: init?.status || "planned",
		progress: String(init?.progress ?? 0),
		startDate: init?.startDate || "",
		plannedEndDate: init?.plannedEndDate || "",
		budgetAmount: init?.budgetAmount || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	// Re-initialize form when the stage prop changes (fixes edit bug)
	useEffect(() => {
		if (!stage) return;
		if (stage === "new") {
			setForm({
				projectId: String(projects[0]?.id || ""),
				parentStageId: "",
				name: "",
				description: "",
				status: "planned",
				progress: "0",
				startDate: "",
				plannedEndDate: "",
				budgetAmount: "",
			});
		} else if ("id" in stage) {
			const s = stage as Stage;
			setForm({
				projectId: String(s.projectId),
				parentStageId: String(s.parentStageId || ""),
				name: s.name,
				description: s.description || "",
				status: s.status,
				progress: String(s.progress),
				startDate: s.startDate || "",
				plannedEndDate: s.plannedEndDate || "",
				budgetAmount: s.budgetAmount || "",
			});
		} else {
			// presetParent
			const p = stage as { parentStageId: number; projectId: number };
			setForm({
				projectId: String(p.projectId),
				parentStageId: String(p.parentStageId),
				name: "",
				description: "",
				status: "planned",
				progress: "0",
				startDate: "",
				plannedEndDate: "",
				budgetAmount: "",
			});
		}
	}, [stage]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url =
				init
					? `${BASE}/construction/stages/${init.id}`
					: `${BASE}/construction/stages`;
			await fetch(url, {
				method: init ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					progress: parseInt(form.progress, 10),
					parentStageId: form.parentStageId ? parseInt(form.parentStageId, 10) : null,
				}),
			});
			toast({ title: init ? "Этап обновлён" : "Этап добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const open = !!stage;
	const title = init ? "Редактировать этап" : presetParent ? "Добавить под-этап" : "Добавить этап";

	// Only show parent selector when creating (not a preset sub-stage)
	const availableParents = parentStages.filter(
		(s) => !init || s.id !== init.id,
	);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>Проект *</Label>
						<Select
							value={form.projectId}
							onValueChange={(v) => set("projectId", v)}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите проект" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{availableParents.length > 0 && (
						<div>
							<Label>Родительский этап (под-этап)</Label>
							<Select
								value={form.parentStageId || "none"}
								onValueChange={(v) => set("parentStageId", v === "none" ? "" : v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Не выбран (корневой)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Корневой этап —</SelectItem>
									{availableParents.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					<div>
						<Label>Название этапа *</Label>
						<Input
							className="mt-1"
							value={form.name}
							onChange={(e) => set("name", e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Описание</Label>
						<Input
							className="mt-1"
							value={form.description}
							onChange={(e) => set("description", e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Прогресс (%)</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								max="100"
								value={form.progress}
								onChange={(e) => set("progress", e.target.value)}
							/>
						</div>
						<div>
							<Label>Начало</Label>
							<Input
								className="mt-1"
								type="date"
								value={form.startDate}
								onChange={(e) => set("startDate", e.target.value)}
							/>
						</div>
						<div>
							<Label>Окончание</Label>
							<Input
								className="mt-1"
								type="date"
								value={form.plannedEndDate}
								onChange={(e) => set("plannedEndDate", e.target.value)}
							/>
						</div>
					</div>
					<div>
						<Label>Бюджет этапа (сом)</Label>
						<Input
							className="mt-1"
							type="number"
							value={form.budgetAmount}
							onChange={(e) => set("budgetAmount", e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function flatToHierarchy(flat: Stage[]): { id: number; parentStageId: number | null }[] {
	const result: { id: number; parentStageId: number | null }[] = [];
	let currentRootId: number | null = null;

	for (const s of flat) {
		const dbIsRoot = stageParentId(s) == null;
		if (currentRootId === null || dbIsRoot) {
			currentRootId = s.id;
			result.push({ id: s.id, parentStageId: null });
		} else {
			result.push({ id: s.id, parentStageId: currentRootId });
		}
	}
	return result;
}

function childIdsFromFlat(flat: Stage[]): Set<number> {
	const hierarchy = flatToHierarchy(flat);
	return new Set(hierarchy.filter((h) => h.parentStageId != null).map((h) => h.id));
}

function getBlockRange(flat: Stage[], childIds: Set<number>, startIdx: number): { start: number; end: number } {
	const item = flat[startIdx];
	if (!childIds.has(item.id)) {
		let end = startIdx + 1;
		while (end < flat.length && childIds.has(flat[end].id)) end++;
		return { start: startIdx, end };
	}
	return { start: startIdx, end: startIdx + 1 };
}

function moveFlatBlock(flat: Stage[], childIds: Set<number>, fromIdx: number, toIdx: number): Stage[] | null {
	const { start, end } = getBlockRange(flat, childIds, fromIdx);
	const block = flat.slice(start, end);
	const rest = flat.filter((_, i) => i < start || i >= end);
	if (toIdx >= start && toIdx < end) return null;
	const insertAt = toIdx > start ? toIdx - (end - start) : toIdx;
	if (insertAt < 0 || insertAt > rest.length) return null;
	const next = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
	return next;
}

function StageRow({
	s,
	isChild = false,
	projectMap,
	onEdit,
	onDelete,
	onAddSub,
	dragging,
	dropTarget,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
}: {
	s: Stage;
	isChild?: boolean;
	projectMap: Record<number, string>;
	onEdit: (s: Stage) => void;
	onDelete: (id: number) => void;
	onAddSub: (s: Stage) => void;
	dragging?: boolean;
	dropTarget?: boolean;
	onDragStart: () => void;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onDragEnd: () => void;
}) {
	const isRoot = !isChild;

	return (
		<div
			draggable
			onDragStart={(e) => {
				e.dataTransfer.effectAllowed = "move";
				onDragStart();
			}}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			className={`group flex items-center gap-2 rounded-lg border px-2 py-2 transition-colors ${
				dragging ? "opacity-40 border-dashed border-amber-300" : ""
			} ${dropTarget ? "border-amber-400 bg-amber-50/60" : "border-gray-200 bg-white hover:border-amber-200"} ${
				isChild ? "ml-8" : ""
			}`}
		>
			<button
				type="button"
				className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5"
				title="Перетащить"
			>
				<GripVertical className="w-4 h-4" />
			</button>

			{isRoot ? (
				<Folder className="w-4 h-4 text-gray-500 shrink-0" />
			) : (
				<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
			)}

			<div className="min-w-0 flex-1">
				<p className={`truncate text-gray-900 ${isRoot ? "text-sm font-semibold" : "text-sm"}`}>
					{s.name}
				</p>
				{isRoot && (
					<p className="text-[10px] text-gray-400 truncate">
						{projectMap[s.projectId] || `Проект #${s.projectId}`}
					</p>
				)}
			</div>

			<div className="flex gap-0.5 shrink-0 opacity-70 group-hover:opacity-100">
				{isRoot && (
					<Button
						size="sm"
						variant="ghost"
						className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
						title="Добавить подэтап"
						onClick={() => onAddSub(s)}
					>
						<Plus className="w-4 h-4" />
					</Button>
				)}
				<Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(s)}>
					<Edit2 className="w-3.5 h-3.5 text-gray-400" />
				</Button>
				<Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDelete(s.id)}>
					<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
				</Button>
			</div>
		</div>
	);
}

export default function ConstructionStages() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<DialogState>(null);
	const [projectFilter, setProjectFilter] = useState<string>("all");
	const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("KGS");

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: stages = [], isLoading } = useQuery<Stage[]>({
		queryKey: ["construction-stages", projectFilter],
		queryFn: () =>
			api
				.get("/construction/stages", {
					params:
						projectFilter !== "all" ? { projectId: projectFilter } : undefined,
				})
				.then((r) => r.data),
	});
	const { data: expenses = [] } = useQuery<ExpenseRow[]>({
		queryKey: ["construction-expenses", projectFilter],
		queryFn: () =>
			api
				.get("/construction/expenses", {
					params:
						projectFilter !== "all" ? { projectId: projectFilter } : undefined,
				})
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: nbkr, isLoading: nbkrLoading } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить этап?")) return;
		await fetch(`${BASE}/construction/stages/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
	};

	const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

	const flatStages = useMemo(() => buildFlatStageList(stages), [stages]);
	const [orderedStages, setOrderedStages] = useState<Stage[]>([]);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	const childIds = useMemo(() => childIdsFromFlat(orderedStages), [orderedStages]);

	const summary = useMemo(() => {
		const roots = stages.filter((s) => stageParentId(s) == null);
		const subs = stages.filter((s) => stageParentId(s) != null);
		const active = stages.filter((s) => s.status === "active").length;
		const completed = stages.filter((s) => s.status === "completed").length;
		const avgProgress = stages.length
			? Math.round(stages.reduce((sum, s) => sum + (s.progress ?? 0), 0) / stages.length)
			: 0;

		const budgetKgs = stages.reduce(
			(sum, s) => sum + (parseFloat(s.budgetAmount || "0") || 0),
			0,
		);
		const stageIds = new Set(stages.map((s) => s.id));
		const factKgs = expenses.reduce((sum, e) => {
			if (e.stageId == null || !stageIds.has(e.stageId)) return sum;
			const kgs = parseFloat(e.amountKgs || e.amount || "0") || 0;
			return sum + kgs;
		}, 0);
		const remainderKgs = budgetKgs - factKgs;
		const utilization = budgetKgs > 0 ? Math.round((factKgs / budgetKgs) * 100) : 0;

		return {
			roots: roots.length,
			subs: subs.length,
			total: stages.length,
			active,
			completed,
			avgProgress,
			budgetKgs,
			factKgs,
			remainderKgs,
			utilization,
		};
	}, [stages, expenses]);

	const rates = nbkr?.rates || {};
	const fmt = (kgs: number) =>
		fmtCurrencyAmount(kgsToDisplay(kgs, displayCurrency, rates), displayCurrency);

	useEffect(() => {
		setOrderedStages(flatStages);
	}, [flatStages]);

	const persistOrder = async (next: Stage[]) => {
		if (next.length === 0) return;
		const projectId = next[0].projectId;
		const items = flatToHierarchy(next);
		try {
			const res = await fetch(`${BASE}/construction/stages/reorder`, {
				method: "POST",
				headers: ah(),
				body: JSON.stringify({ projectId, items }),
			});
			if (!res.ok) throw new Error("reorder failed");
			qc.invalidateQueries({ queryKey: ["construction-stages"] });
		} catch {
			toast({ title: "Не удалось сохранить порядок", variant: "destructive" });
			setOrderedStages(flatStages);
		}
	};

	const handleDrop = (toIdx: number) => {
		if (dragIndex == null || dragIndex === toIdx) {
			setDragIndex(null);
			setDropIndex(null);
			return;
		}
		const next = moveFlatBlock(orderedStages, childIds, dragIndex, toIdx);
		if (!next) {
			setDragIndex(null);
			setDropIndex(null);
			return;
		}
		setOrderedStages(next);
		void persistOrder(next);
		setDragIndex(null);
		setDropIndex(null);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Этапы работ</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Плановые этапы строительных проектов
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<CurrencyToggle
						value={displayCurrency}
						onChange={setDisplayCurrency}
						rateLabel={displayCurrency === "USD" ? nbkrUsdRateLabel(rates) : null}
						nbkrDate={nbkr?.date}
					/>
					<Button
						onClick={() => setDialog("new")}
						className="bg-amber-500 hover:bg-orange-600 gap-2"
					>
						<Plus className="w-4 h-4" /> Добавить этап
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<Wallet className="w-3.5 h-3.5" /> Бюджет этапов
					</p>
					<p className="text-xl font-bold text-blue-600">
						{isLoading || nbkrLoading ? "…" : fmt(summary.budgetKgs)}
					</p>
					<p className="text-[10px] text-gray-400 mt-1">
						{summary.total} этапов · {summary.roots} корн. · {summary.subs} подэтапов
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<TrendingDown className="w-3.5 h-3.5" /> Факт расходов
					</p>
					<p className="text-xl font-bold text-amber-600">
						{isLoading || nbkrLoading ? "…" : fmt(summary.factKgs)}
					</p>
					<p className="text-[10px] text-gray-400 mt-1">
						Освоение {summary.utilization}%
					</p>
				</div>
				<div
					className={`rounded-xl border p-4 ${
						summary.remainderKgs >= 0
							? "bg-emerald-50 border-emerald-200"
							: "bg-rose-50 border-rose-200"
					}`}
				>
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<TrendingUp className="w-3.5 h-3.5" /> Остаток бюджета
					</p>
					<p
						className={`text-xl font-bold ${
							summary.remainderKgs >= 0 ? "text-emerald-600" : "text-rose-600"
						}`}
					>
						{isLoading || nbkrLoading ? "…" : fmt(summary.remainderKgs)}
					</p>
					<p className="text-[10px] text-gray-400 mt-1">
						{displayCurrency === "USD" ? "Курс НБКР" : "Суммы в сомах"}
					</p>
				</div>
			</div>

			<KpiRow cols={6}>
				<KpiCard
					variant="strip"
					label="Всего этапов"
					value={summary.total}
					sub={`${summary.roots} + ${summary.subs}`}
					icon={Layers}
					color="blue"
					loading={isLoading}
				/>
				<KpiCard
					variant="strip"
					label="В работе"
					value={summary.active}
					icon={Flag}
					color="yellow"
					loading={isLoading}
				/>
				<KpiCard
					variant="strip"
					label="Завершено"
					value={summary.completed}
					icon={Folder}
					color="green"
					loading={isLoading}
				/>
				<KpiCard
					variant="strip"
					label="Средний прогресс"
					value={`${summary.avgProgress}%`}
					icon={TrendingUp}
					color="purple"
					loading={isLoading}
				/>
				<KpiCard
					variant="strip"
					label="Бюджет"
					value={isLoading || nbkrLoading ? "…" : fmt(summary.budgetKgs)}
					icon={Wallet}
					color="blue"
					loading={isLoading || nbkrLoading}
				/>
				<KpiCard
					variant="strip"
					label="Освоение"
					value={`${summary.utilization}%`}
					sub={isLoading || nbkrLoading ? undefined : fmt(summary.factKgs)}
					icon={TrendingDown}
					color="yellow"
					loading={isLoading}
				/>
			</KpiRow>

			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setProjectFilter("all")}
					className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
				>
					Все проекты
				</button>
				{projects.map((p) => (
					<button
						key={p.id}
						onClick={() => setProjectFilter(String(p.id))}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === String(p.id) ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{p.name}
					</button>
				))}
			</div>

			<div className="space-y-1.5">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-10 rounded-lg" />
					))
				) : stages.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<Flag className="w-10 h-10 mx-auto mb-2 opacity-20" />
						<p>Этапов нет. Добавьте первый.</p>
					</div>
				) : (
					orderedStages.map((s, idx) => (
						<StageRow
							key={s.id}
							s={s}
							isChild={childIds.has(s.id)}
							projectMap={projectMap}
							onEdit={(stage) => setDialog(stage)}
							onDelete={handleDelete}
							onAddSub={(parent) =>
								setDialog({ parentStageId: parent.id, projectId: parent.projectId })
							}
							dragging={dragIndex === idx}
							dropTarget={dropIndex === idx}
							onDragStart={() => setDragIndex(idx)}
							onDragOver={(e) => {
								e.preventDefault();
								setDropIndex(idx);
							}}
							onDrop={(e) => {
								e.preventDefault();
								handleDrop(idx);
							}}
							onDragEnd={() => {
								setDragIndex(null);
								setDropIndex(null);
							}}
						/>
					))
				)}
			</div>

			<StageDialog
				stage={dialog}
				projects={projects}
				parentStages={stages.filter((s) => stageParentId(s) == null)}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-stages"] })
				}
			/>
		</div>
	);
}
