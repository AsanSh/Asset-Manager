import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Edit2, Flag, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
const STATUS_COLORS: Record<string, string> = {
	planned: "bg-gray-100 text-gray-700",
	active: "bg-blue-100 text-blue-700",
	completed: "bg-emerald-100 text-emerald-700",
	paused: "bg-amber-100 text-amber-700",
};

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

type DialogState = Stage | null | "new" | { parentStageId: number; projectId: number };

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
						<Label>Бюджет этапа (KGS)</Label>
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

function StageCard({
	s,
	children,
	projectMap,
	onEdit,
	onDelete,
	onAddSub,
}: {
	s: Stage;
	children?: React.ReactNode;
	projectMap: Record<number, string>;
	onEdit: (s: Stage) => void;
	onDelete: (id: number) => void;
	onAddSub: (s: Stage) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const hasChildren = !!children;

	return (
		<div>
			<div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-200 transition-colors">
				<div className="flex items-start justify-between mb-2">
					<div className="flex-1 flex items-start gap-2">
						{hasChildren && (
							<button
								type="button"
								className="mt-0.5 text-gray-400 hover:text-gray-700"
								onClick={() => setExpanded((v) => !v)}
							>
								{expanded
									? <ChevronDown className="w-4 h-4" />
									: <ChevronRight className="w-4 h-4" />}
							</button>
						)}
						{!hasChildren && <div className="w-4" />}
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-0.5">
								<h3 className="font-semibold text-gray-900 text-sm">{s.name}</h3>
								<Badge
									className={STATUS_COLORS[s.status] || ""}
									variant="secondary"
								>
									{STATUS_OPTS.find((o) => o.value === s.status)?.label}
								</Badge>
							</div>
							<p className="text-xs text-gray-400">
								{projectMap[s.projectId] || `Проект #${s.projectId}`}
							</p>
							{s.description && (
								<p className="text-xs text-gray-500 mt-1">{s.description}</p>
							)}
						</div>
					</div>
					<div className="flex gap-1 ml-3 flex-shrink-0">
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-[10px] text-amber-600 hover:text-amber-700"
							onClick={() => onAddSub(s)}
						>
							<Plus className="w-3 h-3 mr-1" />
							Под-этап
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0"
							onClick={() => onEdit(s)}
						>
							<Edit2 className="w-3.5 h-3.5 text-gray-400" />
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0"
							onClick={() => onDelete(s.id)}
						>
							<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
						</Button>
					</div>
				</div>
				<div className="space-y-1 ml-6">
					<div className="flex justify-between text-xs text-gray-500">
						<span>Прогресс</span>
						<span className="font-medium">{s.progress}%</span>
					</div>
					<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full transition-all ${s.progress >= 100 ? "bg-emerald-600" : s.progress >= 50 ? "bg-blue-600" : "bg-orange-400"}`}
							style={{ width: `${s.progress}%` }}
						/>
					</div>
				</div>
				<div className="flex gap-4 mt-2 ml-6 text-xs text-gray-400">
					{s.startDate && (
						<span>Нач: {new Date(s.startDate).toLocaleDateString("ru-KG")}</span>
					)}
					{s.plannedEndDate && (
						<span>Конец: {new Date(s.plannedEndDate).toLocaleDateString("ru-KG")}</span>
					)}
					{s.budgetAmount && (
						<span>
							Бюджет: {parseFloat(s.budgetAmount).toLocaleString("ru-KG")} ₸
						</span>
					)}
				</div>
			</div>
			{hasChildren && expanded && (
				<div className="ml-8 mt-2 space-y-2 border-l-2 border-amber-100 pl-4">
					{children}
				</div>
			)}
		</div>
	);
}

export default function ConstructionStages() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<DialogState>(null);
	const [projectFilter, setProjectFilter] = useState<string>("all");

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

	// Build nested tree: root stages + their children
	const rootStages = stages.filter((s) => !s.parentStageId);
	const childrenOf = (parentId: number) =>
		stages.filter((s) => s.parentStageId === parentId);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Этапы работ</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Плановые этапы строительных проектов
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить этап
				</Button>
			</div>

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

			<div className="space-y-3">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))
				) : stages.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<Flag className="w-10 h-10 mx-auto mb-2 opacity-20" />
						<p>Этапов нет. Добавьте первый.</p>
					</div>
				) : (
					rootStages.map((s) => {
						const children = childrenOf(s.id);
						return (
							<StageCard
								key={s.id}
								s={s}
								projectMap={projectMap}
								onEdit={(s) => setDialog(s)}
								onDelete={handleDelete}
								onAddSub={(parent) =>
									setDialog({ parentStageId: parent.id, projectId: parent.projectId })
								}
							>
								{children.length > 0 &&
									children.map((child) => (
										<StageCard
											key={child.id}
											s={child}
											projectMap={projectMap}
											onEdit={(s) => setDialog(s)}
											onDelete={handleDelete}
											onAddSub={(parent) =>
												setDialog({ parentStageId: parent.id, projectId: parent.projectId })
											}
										/>
									))}
							</StageCard>
						);
					})
				)}
			</div>

			<StageDialog
				stage={dialog}
				projects={projects}
				parentStages={stages.filter((s) => !s.parentStageId)}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-stages"] })
				}
			/>
		</div>
	);
}
