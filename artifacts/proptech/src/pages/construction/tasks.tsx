import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Circle,
	Clock,
	Plus,
	Trash2,
} from "lucide-react";
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
	{ value: "todo", label: "К выполнению" },
	{ value: "in_progress", label: "В работе" },
	{ value: "review", label: "На проверке" },
	{ value: "done", label: "Выполнено" },
];
const PRIORITY_OPTS = [
	{ value: "low", label: "Низкий" },
	{ value: "medium", label: "Средний" },
	{ value: "high", label: "Высокий" },
	{ value: "critical", label: "Критический" },
];
const STATUS_ICONS: Record<string, React.ElementType> = {
	todo: Circle,
	in_progress: Clock,
	review: AlertCircle,
	done: CheckCircle2,
};
const STATUS_COLORS: Record<string, string> = {
	todo: "text-gray-400",
	in_progress: "text-blue-500",
	review: "text-amber-600",
	done: "text-emerald-600",
};
const PRIORITY_COLORS: Record<string, string> = {
	low: "bg-gray-100 text-gray-700",
	medium: "bg-blue-100 text-blue-700",
	high: "bg-amber-100 text-amber-700",
	critical: "bg-rose-100 text-rose-700",
};

interface Task {
	id: number;
	projectId: number;
	stageId?: number;
	title: string;
	description?: string;
	status: string;
	priority: string;
	dueDate?: string;
	estimatedHours?: string;
	actualHours?: string;
	completedAt?: string;
	createdAt: string;
}
interface Project {
	id: number;
	name: string;
}

function TaskDialog({
	task,
	projects,
	onClose,
	onSaved,
}: {
	task: Task | null | "new";
	projects: Project[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = task && task !== "new";
	const init = isEdit ? (task as Task) : null;
	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || ""),
		title: init?.title || "",
		description: init?.description || "",
		status: init?.status || "todo",
		priority: init?.priority || "medium",
		dueDate: init?.dueDate || "",
		estimatedHours: init?.estimatedHours || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.title || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/tasks/${init?.id}`
				: `${BASE}/construction/tasks`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({ ...form, projectId: parseInt(form.projectId, 10) }),
			});
			toast({ title: isEdit ? "Задача обновлена" : "Задача добавлена" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать задачу" : "Новая задача"}
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
								<SelectValue />
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
						<Label>Название задачи *</Label>
						<Input
							className="mt-1"
							value={form.title}
							onChange={(e) => set("title", e.target.value)}
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
							<Label>Приоритет</Label>
							<Select
								value={form.priority}
								onValueChange={(v) => set("priority", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRIORITY_OPTS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Срок выполнения</Label>
							<Input
								className="mt-1"
								type="date"
								value={form.dueDate}
								onChange={(e) => set("dueDate", e.target.value)}
							/>
						</div>
						<div>
							<Label>Плановые часы</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.estimatedHours}
								onChange={(e) => set("estimatedHours", e.target.value)}
							/>
						</div>
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

export default function ConstructionTasks() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Task | null | "new">(null);
	const [projectFilter, setProjectFilter] = useState("all");

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: tasks = [], isLoading } = useQuery<Task[]>({
		queryKey: ["construction-tasks", projectFilter],
		queryFn: () =>
			api
				.get("/construction/tasks", {
					params:
						projectFilter !== "all" ? { projectId: projectFilter } : undefined,
				})
				.then((r) => r.data),
	});

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить задачу?")) return;
		await fetch(`${BASE}/construction/tasks/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-tasks"] });
	};

	const quickStatus = async (task: Task, status: string) => {
		await fetch(`${BASE}/construction/tasks/${task.id}`, {
			method: "PATCH",
			headers: ah(),
			body: JSON.stringify({ ...task, status }),
		});
		qc.invalidateQueries({ queryKey: ["construction-tasks"] });
	};

	// Group by status (kanban-like columns)
	const columns = STATUS_OPTS.map((s) => ({
		...s,
		tasks: tasks.filter((t) => t.status === s.value),
	}));
	const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						{tasks.length} задач ·{" "}
						{tasks.filter((t) => t.status === "done").length} выполнено
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить задачу
				</Button>
			</div>

			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setProjectFilter("all")}
					className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
				>
					Все
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

			{isLoading ? (
				<Skeleton className="h-64 rounded-xl" />
			) : (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{columns.map((col) => {
						const Icon = STATUS_ICONS[col.value];
						return (
							<div key={col.value} className="bg-gray-50 rounded-xl p-3">
								<div
									className={`flex items-center gap-1.5 mb-3 ${STATUS_COLORS[col.value]}`}
								>
									<Icon className="w-3.5 h-3.5" />
									<span className="text-xs font-semibold">{col.label}</span>
									<span className="ml-auto bg-white border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
										{col.tasks.length}
									</span>
								</div>
								<div className="space-y-2">
									{col.tasks.map((t) => (
										<div
											key={t.id}
											className="bg-white rounded-lg border border-gray-200 p-3 hover:border-amber-200 transition-colors group"
										>
											<div className="flex items-start justify-between gap-1 mb-1.5">
												<p className="text-xs font-medium text-gray-900 leading-snug">
													{t.title}
												</p>
												<button
													onClick={() => handleDelete(t.id)}
													className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-rose-600 flex-shrink-0"
												>
													<Trash2 className="w-3 h-3" />
												</button>
											</div>
											<p className="text-[10px] text-gray-400 mb-2">
												{projectMap[t.projectId]}
											</p>
											<div className="flex items-center justify-between">
												<Badge
													className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[t.priority] || ""}`}
													variant="secondary"
												>
													{
														PRIORITY_OPTS.find((p) => p.value === t.priority)
															?.label
													}
												</Badge>
												{t.dueDate && (
													<span className="text-[10px] text-gray-400">
														{new Date(t.dueDate).toLocaleDateString("ru-KG")}
													</span>
												)}
											</div>
											<div className="flex gap-1 mt-2">
												{col.value !== "done" && (
													<button
														onClick={() =>
															quickStatus(
																t,
																col.value === "todo"
																	? "in_progress"
																	: col.value === "in_progress"
																		? "review"
																		: "done",
															)
														}
														className="text-[10px] text-amber-600 hover:text-amber-600"
													>
														→{" "}
														{col.value === "todo"
															? "В работу"
															: col.value === "in_progress"
																? "На проверку"
																: "Готово"}
													</button>
												)}
												<button
													onClick={() => setDialog(t)}
													className="ml-auto text-[10px] text-gray-400 hover:text-blue-500"
												>
													✎
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<TaskDialog
				task={dialog}
				projects={projects}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-tasks"] })
				}
			/>
		</div>
	);
}
