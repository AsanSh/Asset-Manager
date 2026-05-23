import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Flag, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

function StageDialog({
	stage,
	projects,
	onClose,
	onSaved,
}: {
	stage: Stage | null | "new";
	projects: Project[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = stage && stage !== "new";
	const init = isEdit ? (stage as Stage) : null;
	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || ""),
		name: init?.name || "",
		description: init?.description || "",
		status: init?.status || "planned",
		progress: String(init?.progress || 0),
		startDate: init?.startDate || "",
		plannedEndDate: init?.plannedEndDate || "",
		budgetAmount: init?.budgetAmount || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/stages/${init?.id}`
				: `${BASE}/construction/stages`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					progress: parseInt(form.progress, 10),
				}),
			});
			toast({ title: isEdit ? "Этап обновлён" : "Этап добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!stage} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать этап" : "Добавить этап"}
					</DialogTitle>
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

export default function ConstructionStages() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Stage | null | "new">(null);
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
					stages.map((s) => (
						<div
							key={s.id}
							className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-200 transition-colors"
						>
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-0.5">
										<h3 className="font-semibold text-gray-900">{s.name}</h3>
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
										<p className="text-sm text-gray-500 mt-1">
											{s.description}
										</p>
									)}
								</div>
								<div className="flex gap-1 ml-3">
									<Button
										size="sm"
										variant="ghost"
										className="h-7 w-7 p-0"
										onClick={() => setDialog(s)}
									>
										<Edit2 className="w-3.5 h-3.5 text-gray-400" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 w-7 p-0"
										onClick={() => handleDelete(s.id)}
									>
										<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
									</Button>
								</div>
							</div>
							<div className="space-y-1">
								<div className="flex justify-between text-xs text-gray-500">
									<span>Прогресс</span>
									<span className="font-medium">{s.progress}%</span>
								</div>
								<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full transition-all ${s.progress >= 100 ? "bg-emerald-600" : s.progress >= 50 ? "bg-blue-600" : "bg-orange-400"}`}
										style={{ width: `${s.progress}%` }}
									/>
								</div>
							</div>
							<div className="flex gap-4 mt-2 text-xs text-gray-400">
								{s.startDate && (
									<span>
										Нач: {new Date(s.startDate).toLocaleDateString("ru-KG")}
									</span>
								)}
								{s.plannedEndDate && (
									<span>
										Конец:{" "}
										{new Date(s.plannedEndDate).toLocaleDateString("ru-KG")}
									</span>
								)}
								{s.budgetAmount && (
									<span>
										Бюджет: {parseFloat(s.budgetAmount).toLocaleString("ru-KG")}{" "}
										₸
									</span>
								)}
							</div>
						</div>
					))
				)}
			</div>

			<StageDialog
				stage={dialog}
				projects={projects}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-stages"] })
				}
			/>
		</div>
	);
}
