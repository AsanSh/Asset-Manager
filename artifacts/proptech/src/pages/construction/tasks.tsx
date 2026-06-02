import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
	AlertCircle,
	BarChart3,
	CalendarDays,
	CheckCircle2,
	Circle,
	Clock,
	Edit2,
	Flag,
	Inbox,
	LayoutGrid,
	List,
	MessageSquare,
	Plus,
	Send,
	Trash2,
	User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/lib/auth";
import { DataTable } from "@/components/data-table";
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
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const STATUS_OPTS = [
	{ value: "todo", label: "К выполнению", icon: Circle, color: "text-gray-400", bg: "bg-gray-50 border-gray-200" },
	{ value: "in_progress", label: "В работе", icon: Clock, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
	{ value: "review", label: "На проверке", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
	{ value: "done", label: "Готово", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
];

const PRIORITY_OPTS = [
	{ value: "low", label: "Низкий", color: "bg-gray-100 text-gray-600" },
	{ value: "medium", label: "Средний", color: "bg-blue-100 text-blue-700" },
	{ value: "high", label: "Высокий", color: "bg-amber-100 text-amber-700" },
	{ value: "critical", label: "Критический", color: "bg-rose-100 text-rose-700" },
];

const TABS = [
	{ id: "mine", label: "Мои задачи", icon: User, desc: "Назначены мне" },
	{ id: "delegated", label: "Делегированные", icon: Send, desc: "Назначил другим" },
	{ id: "incoming", label: "Входящие", icon: Inbox, desc: "Получил от коллег" },
	{ id: "personal", label: "Личные", icon: Flag, desc: "Поставил себе сам" },
	{ id: "all", label: "Все", icon: Circle, desc: "Все задачи проекта" },
] as const;

type TabId = typeof TABS[number]["id"];

interface Task {
	id: number;
	projectId: number;
	stageId?: number | null;
	title: string;
	description?: string;
	status: string;
	priority: string;
	assignedTo?: number | null;
	createdBy?: number | null;
	dueDate?: string | null;
	estimatedHours?: string | null;
	progressPercent?: number | null;
	progressMode?: string | null;
	plannedStartDate?: string | null;
	plannedEndDate?: string | null;
	commentCount?: number;
	attachmentCount?: number;
	blockedByCount?: number;
	createdAt: string;
}
interface Project { id: number; name: string; }
interface Stage {
	id: number;
	projectId: number;
	name: string;
	parentStageId?: number | null;
}
interface ApiUser { id: number; firstName: string; lastName: string; email: string; }

function userName(u: ApiUser) { return `${u.firstName} ${u.lastName}`.trim(); }

function taskAssignedTo(t: Task): number | null {
	const raw = t.assignedTo ?? (t as Task & { assigned_to?: number | null }).assigned_to;
	if (raw == null) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function taskCreatedBy(t: Task): number | null {
	const raw = t.createdBy ?? (t as Task & { created_by?: number | null }).created_by;
	if (raw == null) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function isMineTask(t: Task, me: number): boolean {
	const assignee = taskAssignedTo(t);
	const creator = taskCreatedBy(t);
	return assignee === me || (creator === me && assignee == null);
}

function isPersonalTask(t: Task, me: number): boolean {
	const assignee = taskAssignedTo(t);
	const creator = taskCreatedBy(t);
	if (creator === me && (assignee == null || assignee === me)) return true;
	// Задачи до миграции created_by: назначены себе без автора
	return creator == null && assignee === me;
}

function normalizeTask(raw: Record<string, unknown>): Task {
	return {
		...(raw as unknown as Task),
		assignedTo: raw.assignedTo ?? raw.assigned_to ?? null,
		createdBy: raw.createdBy ?? raw.created_by ?? null,
		stageId: raw.stageId ?? raw.stage_id ?? null,
		progressPercent: Number(raw.progressPercent ?? raw.progress_percent ?? 0),
		commentCount: Number(raw.commentCount ?? raw.comment_count ?? 0),
		attachmentCount: Number(raw.attachmentCount ?? raw.attachment_count ?? 0),
		blockedByCount: Number(raw.blockedByCount ?? raw.blocked_by_count ?? 0),
	} as unknown as Task;
}

function taskTimelineDate(task: Task): string | null {
	return task.plannedEndDate || task.dueDate || task.createdAt || null;
}

function stageLabel(stage: Stage, parentMap: Record<number, Stage>): string {
	if (stage.parentStageId && parentMap[stage.parentStageId]) {
		return `${parentMap[stage.parentStageId].name} → ${stage.name}`;
	}
	return stage.name;
}

function TaskDialog({
	task, projects, users, currentUserId, onClose, onSaved,
}: {
	task: Task | null | "new";
	projects: Project[];
	users: ApiUser[];
	currentUserId: number | undefined;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = task && task !== "new";
	const init = isEdit ? (task as Task) : null;

	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || ""),
		stageId: String(init?.stageId || ""),
		title: init?.title || "",
		description: init?.description || "",
		status: init?.status || "todo",
		priority: init?.priority || "medium",
		dueDate: init?.dueDate || "",
		plannedStartDate: init?.plannedStartDate || "",
		plannedEndDate: init?.plannedEndDate || "",
		estimatedHours: init?.estimatedHours || "",
		assignedTo: String(init?.assignedTo || ""),
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const { data: stages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages", form.projectId],
		queryFn: () =>
			api
				.get(`/construction/stages?projectId=${form.projectId}`)
				.then((r) => r.data),
		enabled: !!form.projectId && form.projectId !== "",
	});

	const parentStageMap = useMemo(() => {
		const m: Record<number, Stage> = {};
		for (const s of stages) {
			if (!s.parentStageId) m[s.id] = s;
		}
		return m;
	}, [stages]);

	useEffect(() => {
		if (!task) return;
		if (task === "new") {
			setForm({
				projectId: String(projects[0]?.id || ""),
				stageId: "",
				title: "",
				description: "",
				status: "todo",
				priority: "medium",
				dueDate: "",
				plannedStartDate: "",
				plannedEndDate: "",
				estimatedHours: "",
				assignedTo: currentUserId ? String(currentUserId) : "",
			});
		} else {
			const t = task as Task;
			setForm({
				projectId: String(t.projectId),
				stageId: String(t.stageId || ""),
				title: t.title,
				description: t.description || "",
				status: t.status,
				priority: t.priority,
				dueDate: t.dueDate || "",
				plannedStartDate: t.plannedStartDate || "",
				plannedEndDate: t.plannedEndDate || "",
				estimatedHours: t.estimatedHours || "",
				assignedTo: String(t.assignedTo || ""),
			});
		}
	}, [task, projects, currentUserId]);

	useEffect(() => {
		if (task !== "new" || !stages.length || form.stageId) return;
		const first = stages.find((s) => s.parentStageId) ?? stages[0];
		if (first) setForm((p) => ({ ...p, stageId: String(first.id) }));
	}, [stages, task, form.stageId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.title || !form.projectId || !form.stageId) {
			toast({
				title: "Заполните проект, этап и название",
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		try {
			const url = isEdit ? `${BASE}/construction/tasks/${init?.id}` : `${BASE}/construction/tasks`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					stageId: parseInt(form.stageId, 10),
					assignedTo: form.assignedTo
						? parseInt(form.assignedTo, 10)
						: !isEdit && currentUserId
							? currentUserId
							: null,
				}),
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
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Редактировать задачу" : "Новая задача"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>Проект *</Label>
						<Select
							value={form.projectId}
							onValueChange={(v) => {
								setForm((p) => ({ ...p, projectId: v, stageId: "" }));
							}}
						>
							<SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Этап / подэтап *</Label>
						<Select value={form.stageId} onValueChange={(v) => set("stageId", v)}>
							<SelectTrigger className="mt-1"><SelectValue placeholder="Выберите этап" /></SelectTrigger>
							<SelectContent>
								{stages.map((s) => (
									<SelectItem key={s.id} value={String(s.id)}>
										{stageLabel(s, parentStageMap)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Название *</Label>
						<Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} required />
					</div>
					<div>
						<Label>Описание</Label>
						<Input className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select value={form.status} onValueChange={(v) => set("status", v)}>
								<SelectTrigger className="mt-auto"><SelectValue /></SelectTrigger>
								<SelectContent>
									{STATUS_OPTS.map((o) => (
										<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Приоритет</Label>
							<Select value={form.priority} onValueChange={(v) => set("priority", v)}>
								<SelectTrigger className="mt-auto"><SelectValue /></SelectTrigger>
								<SelectContent>
									{PRIORITY_OPTS.map((o) => (
										<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Срок</Label>
							<Input className="mt-auto" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">План начала</Label>
							<Input className="mt-auto" type="date" value={form.plannedStartDate} onChange={(e) => set("plannedStartDate", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">План окончания</Label>
							<Input className="mt-auto" type="date" value={form.plannedEndDate} onChange={(e) => set("plannedEndDate", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Плановые часы</Label>
							<Input className="mt-auto" type="number" value={form.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} />
						</div>
					</div>
					<div>
						<Label>Ответственный</Label>
						<Select value={form.assignedTo || "none"} onValueChange={(v) => set("assignedTo", v === "none" ? "" : v)}>
							<SelectTrigger className="mt-1"><SelectValue placeholder="Не назначен" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="none">— Не назначен —</SelectItem>
								{currentUserId && (
									<SelectItem value={String(currentUserId)}>
										👤 Себе
									</SelectItem>
								)}
								{users.filter((u) => u.id !== currentUserId).map((u) => (
									<SelectItem key={u.id} value={String(u.id)}>{userName(u)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>Отмена</Button>
						<Button type="submit" className="bg-amber-500 hover:bg-orange-600" disabled={loading}>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
	const colors = ["bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400"];
	const idx = name.charCodeAt(0) % colors.length;
	const cls = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
	return (
		<div className={`${cls} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
			{name.charAt(0).toUpperCase()}
		</div>
	);
}

function TaskCard({
	task, userMap, projectMap, stageLabelText, onEdit, onDelete, onStatusChange,
}: {
	task: Task;
	userMap: Record<number, ApiUser>;
	projectMap: Record<number, string>;
	stageLabelText?: string;
	onEdit: (t: Task) => void;
	onDelete: (id: number) => void;
	onStatusChange: (task: Task, status: string) => void;
}) {
	const [, navigate] = useLocation();
	const statusOpt = STATUS_OPTS.find((s) => s.value === task.status);
	const StatusIcon = statusOpt?.icon ?? Circle;
	const priorityOpt = PRIORITY_OPTS.find((p) => p.value === task.priority);
	const assignee = taskAssignedTo(task) ? userMap[taskAssignedTo(task)!] : null;
	const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();

	const nextStatus = task.status === "todo" ? "in_progress"
		: task.status === "in_progress" ? "review"
		: task.status === "review" ? "done" : null;

	const openChat = () => navigate(`/construction/tasks/${task.id}`);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={openChat}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openChat();
				}
			}}
			className="bg-white border border-gray-200 rounded-lg p-3 hover:border-amber-300 hover:shadow-sm transition-all group cursor-pointer"
		>
			<div className="flex items-start justify-between gap-2 mb-2">
				<div className="flex items-start gap-2 flex-1 min-w-0">
					<button
						type="button"
						className={`mt-0.5 flex-shrink-0 ${statusOpt?.color}`}
						onClick={(e) => {
							e.stopPropagation();
							if (nextStatus) onStatusChange(task, nextStatus);
						}}
						title={nextStatus ? `→ ${STATUS_OPTS.find(s => s.value === nextStatus)?.label}` : "Завершено"}
					>
						<StatusIcon className="w-4 h-4" />
					</button>
					<div className="flex-1 min-w-0">
						<p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
							{task.title}
						</p>
						{task.description && (
							<p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
						)}
					</div>
				</div>
				<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							openChat();
						}}
						className="text-gray-300 hover:text-amber-500"
						title="Открыть чат задачи"
					>
						<MessageSquare className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(task);
						}}
						className="text-gray-300 hover:text-gray-600"
					>
						<Edit2 className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(task.id);
						}}
						className="text-gray-300 hover:text-rose-500"
					>
						<Trash2 className="w-3 h-3" />
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{priorityOpt && (
					<span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityOpt.color}`}>
						{priorityOpt.label}
					</span>
				)}
				{task.dueDate && (
					<span className={`text-[10px] ${isOverdue ? "text-rose-600 font-semibold" : "text-gray-400"}`}>
						{isOverdue ? "⚠ " : ""}
						{new Date(task.dueDate).toLocaleDateString("ru-KG", { day: "numeric", month: "short" })}
					</span>
				)}
				{stageLabelText && (
					<span className="text-[10px] text-indigo-600 truncate max-w-[120px]">
						{stageLabelText}
					</span>
				)}
				{projectMap[task.projectId] && (
					<span className="text-[10px] text-gray-400 truncate max-w-[100px]">
						{projectMap[task.projectId]}
					</span>
				)}
				<span className="text-[10px] font-medium text-gray-600">
					{Number(task.progressPercent) || 0}%
				</span>
				{assignee && (
					<div className="ml-auto flex items-center gap-1">
						<Avatar name={userName(assignee)} size="sm" />
						<span className="text-[10px] text-gray-500">{assignee.firstName}</span>
					</div>
				)}
			</div>
		</div>
	);
}

function EmptyState({ tab }: { tab: TabId }) {
	const msgs: Record<TabId, string> = {
		mine: "Нет задач, назначенных вам",
		delegated: "Нет задач, которые вы делегировали другим",
		incoming: "Нет входящих задач от коллег",
		personal: "Нет личных задач",
		all: "Задач пока нет",
	};
	return (
		<div className="text-center py-16 text-gray-400">
			<Flag className="w-8 h-8 mx-auto mb-2 opacity-20" />
			<p className="text-sm">{msgs[tab]}</p>
		</div>
	);
}

function TasksTable({
	tasks,
	userMap,
	projectMap,
	stageLabelByTaskId,
	onRowClick,
}: {
	tasks: Task[];
	userMap: Record<number, ApiUser>;
	projectMap: Record<number, string>;
	stageLabelByTaskId: Record<number, string>;
	onRowClick: (task: Task) => void;
}) {
	const columns = useMemo<ColumnDef<Task, unknown>[]>(
		() => [
			{
				id: "title",
				accessorKey: "title",
				header: "Название",
				meta: { exportLabel: "Название" },
				cell: ({ getValue }) => (
					<div className="font-medium text-gray-900">{getValue() as string}</div>
				),
			},
			{
				id: "projectId",
				accessorKey: "projectId",
				header: "Проект",
				meta: { exportLabel: "Проект" },
				cell: ({ getValue }) => (
					<div className="text-sm text-gray-600">
						{projectMap[Number(getValue())] || "—"}
					</div>
				),
			},
			{
				id: "stage",
				header: "Этап",
				meta: { exportLabel: "Этап" },
				cell: ({ row }) => (
					<div className="text-sm text-gray-600 max-w-[160px] truncate">
						{stageLabelByTaskId[row.original.id] || "—"}
					</div>
				),
			},
			{
				id: "progressPercent",
				header: "Прогресс",
				meta: { exportLabel: "Прогресс" },
				cell: ({ row }) => (
					<span className="text-sm font-medium tabular-nums">
						{Number(row.original.progressPercent) || 0}%
					</span>
				),
			},
			{
				id: "status",
				accessorKey: "status",
				header: "Статус",
				meta: { exportLabel: "Статус" },
				cell: ({ getValue }) => {
					const status = STATUS_OPTS.find((s) => s.value === getValue());
					if (!status) return <span className="text-gray-400">—</span>;
					const Icon = status.icon;
					return (
						<div
							className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${status.bg} ${status.color}`}
						>
							<Icon className="w-3.5 h-3.5" />
							{status.label}
						</div>
					);
				},
			},
			{
				id: "priority",
				accessorKey: "priority",
				header: "Приоритет",
				meta: { exportLabel: "Приоритет" },
				cell: ({ getValue }) => {
					const priority = PRIORITY_OPTS.find((p) => p.value === getValue());
					if (!priority) return <span className="text-gray-400">—</span>;
					return (
						<div
							className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${priority.color}`}
						>
							{priority.label}
						</div>
					);
				},
			},
			{
				id: "assignedTo",
				header: "Ответственный",
				meta: { exportLabel: "Ответственный" },
				cell: ({ row }) => {
					const assigneeId = taskAssignedTo(row.original);
					if (!assigneeId) {
						return <span className="text-gray-400 text-sm">Не назначен</span>;
					}
					const user = userMap[assigneeId];
					return (
						<div className="text-sm text-gray-700">
							{user ? userName(user) : "—"}
						</div>
					);
				},
			},
			{
				id: "dueDate",
				accessorKey: "dueDate",
				header: "Срок",
				meta: { exportLabel: "Срок" },
				cell: ({ getValue, row }) => {
					const date = getValue() as string | null;
					if (!date) return <span className="text-gray-400 text-sm">—</span>;
					const d = new Date(date);
					const isOverdue =
						d < new Date() && row.original.status !== "done";
					return (
						<div
							className={`text-sm ${isOverdue ? "text-rose-600 font-medium" : "text-gray-600"}`}
						>
							{d.toLocaleDateString("ru-RU", {
								day: "2-digit",
								month: "short",
							})}
						</div>
					);
				},
			},
			{
				id: "comments",
				header: "Комментарии",
				meta: { exportLabel: "Комментарии" },
				cell: ({ row }) => (
					<div className="text-xs text-gray-600">{Number(row.original.commentCount ?? 0)}</div>
				),
			},
			{
				id: "attachments",
				header: "Вложения",
				meta: { exportLabel: "Вложения" },
				cell: ({ row }) => (
					<div className="text-xs text-gray-600">{Number(row.original.attachmentCount ?? 0)}</div>
				),
			},
			{
				id: "blockedBy",
				header: "Блокеры",
				meta: { exportLabel: "Блокеры" },
				cell: ({ row }) => {
					const value = Number(row.original.blockedByCount ?? 0);
					return (
						<div className={`text-xs font-medium ${value > 0 ? "text-rose-600" : "text-gray-500"}`}>
							{value}
						</div>
					);
				},
			},
		],
		[userMap, projectMap, stageLabelByTaskId],
	);

	return (
		<DataTable
			tableId="construction-tasks"
			columns={columns}
			data={tasks}
			onRowClick={onRowClick}
			initialSorting={[{ id: "dueDate", desc: false }]}
			emptyState={
				<div className="text-center py-8 text-gray-400 text-sm">
					Нет задач по выбранным фильтрам
				</div>
			}
		/>
	);
}

function TasksCalendarView({
	tasks,
	projectMap,
	onTaskClick,
}: {
	tasks: Task[];
	projectMap: Record<number, string>;
	onTaskClick: (task: Task) => void;
}) {
	const groups = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const task of tasks) {
			const key = String(taskTimelineDate(task) || "").slice(0, 10);
			if (!key) continue;
			const arr = map.get(key) ?? [];
			arr.push(task);
			map.set(key, arr);
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, rows]) => ({ date, rows }));
	}, [tasks]);

	if (groups.length === 0) {
		return <div className="text-sm text-gray-400 py-10 text-center">Нет задач в выбранном периоде</div>;
	}

	return (
		<div className="space-y-3">
			{groups.map((group) => (
				<div key={group.date} className="rounded-xl border border-gray-200 bg-white">
					<div className="px-3 py-2 border-b border-gray-100 text-sm font-semibold text-gray-700">
						{new Date(group.date).toLocaleDateString("ru-RU", {
							weekday: "long",
							day: "2-digit",
							month: "long",
						})}
					</div>
					<div className="divide-y divide-gray-100">
						{group.rows.map((task) => (
							<button
								key={task.id}
								onClick={() => onTaskClick(task)}
								className="w-full text-left px-3 py-2 hover:bg-gray-50"
							>
								<div className="text-sm font-medium text-gray-900">{task.title}</div>
								<div className="text-xs text-gray-500 mt-0.5">
									{projectMap[task.projectId] || "—"} · {task.status}
								</div>
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function TasksGanttView({
	tasks,
	onTaskClick,
}: {
	tasks: Task[];
	onTaskClick: (task: Task) => void;
}) {
	const bars = useMemo(() => {
		const withDates = tasks
			.map((task) => {
				const start = task.plannedStartDate || task.createdAt;
				const end = task.plannedEndDate || task.dueDate || start;
				return { task, start: String(start).slice(0, 10), end: String(end).slice(0, 10) };
			})
			.filter((x) => x.start && x.end)
			.sort((a, b) => a.start.localeCompare(b.start));
		if (!withDates.length) return [];
		const min = withDates[0].start;
		const max = withDates.reduce((m, x) => (x.end > m ? x.end : m), withDates[0].end);
		const minMs = new Date(min).getTime();
		const maxMs = new Date(max).getTime();
		const total = Math.max(1, maxMs - minMs);
		return withDates.map((row) => {
			const startMs = new Date(row.start).getTime();
			const endMs = new Date(row.end).getTime();
			const left = ((startMs - minMs) / total) * 100;
			const width = (Math.max(1, endMs - startMs) / total) * 100;
			return { ...row, left, width };
		});
	}, [tasks]);

	if (bars.length === 0) {
		return <div className="text-sm text-gray-400 py-10 text-center">Нет плановых дат для Gantt</div>;
	}

	return (
		<div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
			{bars.map((row) => (
				<button
					key={row.task.id}
					onClick={() => onTaskClick(row.task)}
					className="w-full text-left"
				>
					<div className="text-xs text-gray-700 mb-1 flex items-center justify-between">
						<span className="truncate pr-2">{row.task.title}</span>
						<span className="text-gray-400">
							{row.start} → {row.end}
						</span>
					</div>
					<div className="relative h-6 rounded bg-gray-100 overflow-hidden">
						<div
							className={`absolute top-0 h-full rounded ${row.task.status === "done" ? "bg-emerald-400" : "bg-blue-400"}`}
							style={{ left: `${row.left}%`, width: `${Math.max(row.width, 2)}%` }}
						/>
					</div>
				</button>
			))}
		</div>
	);
}

export default function ConstructionTasks() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const { user: authUser } = useAuth();
	const currentUserId = authUser?.id;
	const me = currentUserId != null ? Number(currentUserId) : null;
	const [dialog, setDialog] = useState<Task | null | "new">(null);
	const [activeTab, setActiveTab] = useState<TabId>("mine");
	const [projectFilter, setProjectFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod("month"));
	const [viewMode, setViewMode] = useState<"kanban" | "table" | "calendar" | "gantt">("kanban");
	const [, navigate] = useLocation();

	useEffect(() => {
		void api.post("/construction/tasks/overdue/check").catch(() => {});
	}, []);

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: usersRaw = [] } = useQuery<ApiUser[]>({
		queryKey: ["users"],
		queryFn: () => api.get("/users").then((r) => Array.isArray(r.data) ? r.data : r.data?.data ?? []),
	});
	const { data: tasks = [], isLoading } = useQuery<Task[]>({
		queryKey: ["construction-tasks", period.from, period.to],
		queryFn: () =>
			api.get(`/construction/tasks?fromDate=${encodeURIComponent(period.from)}&toDate=${encodeURIComponent(period.to)}`).then((r) =>
				(Array.isArray(r.data) ? r.data : []).map((t) => normalizeTask(t as Record<string, unknown>)),
			),
	});
	const { data: allStages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages-all"],
		queryFn: () => api.get("/construction/stages").then((r) => r.data),
	});

	const userMap = useMemo(
		() => Object.fromEntries(usersRaw.map((u) => [u.id, u])),
		[usersRaw],
	);
	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((p) => [p.id, p.name])),
		[projects],
	);

	const stageLabelByTaskId = useMemo(() => {
		const byId = Object.fromEntries(allStages.map((s) => [s.id, s]));
		const parents: Record<number, Stage> = {};
		for (const s of allStages) {
			if (!s.parentStageId) parents[s.id] = s;
		}
		const out: Record<number, string> = {};
		for (const t of tasks) {
			const sid = t.stageId != null ? Number(t.stageId) : null;
			if (sid && byId[sid]) {
				out[t.id] = stageLabel(byId[sid], parents);
			}
		}
		return out;
	}, [allStages, tasks]);

	const filterTasks = (list: Task[]) => {
		return list.filter((t) => {
			if (projectFilter !== "all" && String(t.projectId) !== projectFilter) return false;
			if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
			if (statusFilter !== "all" && t.status !== statusFilter) return false;
			if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
			if (!inPeriod(taskTimelineDate(t), period)) return false;
			return true;
		});
	};

	const tabTasks = useMemo((): Task[] => {
		if (me == null) return [];
		switch (activeTab) {
			case "mine":
				return tasks.filter((t) => isMineTask(t, me));
			case "delegated":
				return tasks.filter((t) => {
					const creator = taskCreatedBy(t);
					const assignee = taskAssignedTo(t);
					return creator === me && assignee != null && assignee !== me;
				});
			case "incoming":
				return tasks.filter((t) => {
					const creator = taskCreatedBy(t);
					const assignee = taskAssignedTo(t);
					return assignee === me && creator != null && creator !== me;
				});
			case "personal":
				return tasks.filter((t) => isPersonalTask(t, me));
			case "all":
			default:
				return tasks;
		}
	}, [tasks, me, activeTab]);

	const filteredTasks = useMemo(() => filterTasks(tabTasks), [tabTasks, projectFilter, priorityFilter, statusFilter, search, period]);

	const tabCounts = useMemo(() => {
		if (me == null) return {} as Record<TabId, number>;
		return {
			mine: tasks.filter((t) => isMineTask(t, me)).length,
			delegated: tasks.filter((t) => {
				const creator = taskCreatedBy(t);
				const assignee = taskAssignedTo(t);
				return creator === me && assignee != null && assignee !== me;
			}).length,
			incoming: tasks.filter((t) => {
				const creator = taskCreatedBy(t);
				const assignee = taskAssignedTo(t);
				return assignee === me && creator != null && creator !== me;
			}).length,
			personal: tasks.filter((t) => isPersonalTask(t, me)).length,
			all: tasks.length,
		};
	}, [tasks, me]);

	// Group by status within active tab
	const columns = STATUS_OPTS.map((s) => ({
		...s,
		tasks: filteredTasks.filter((t) => t.status === s.value),
	}));

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить задачу?")) return;
		await fetch(`${BASE}/construction/tasks/${id}`, { method: "DELETE", headers: ah() });
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-tasks"] });
	};

	const handleStatusChange = async (task: Task, status: string) => {
		await fetch(`${BASE}/construction/tasks/${task.id}`, {
			method: "PATCH",
			headers: ah(),
			body: JSON.stringify({ status }),
		});
		qc.invalidateQueries({ queryKey: ["construction-tasks"] });
	};

	const doneCount = filteredTasks.filter((t) => t.status === "done").length;
	const overdueCount = filteredTasks.filter((t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date()).length;

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						{filteredTasks.length} задач · {doneCount} выполнено
						{overdueCount > 0 && <span className="text-rose-600"> · {overdueCount} просрочено</span>}
					</p>
				</div>
				<Button onClick={() => setDialog("new")} className="bg-amber-500 hover:bg-orange-600 gap-2">
					<Plus className="w-4 h-4" /> Новая задача
				</Button>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 bg-gray-100 rounded-xl p-1">
				{TABS.map((tab) => {
					const Icon = tab.icon;
					const count = tabCounts[tab.id] ?? 0;
					const active = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
								active ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
							}`}
						>
							<Icon className="w-3.5 h-3.5 flex-shrink-0" />
							<span className="hidden sm:inline">{tab.label}</span>
							{count > 0 && (
								<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Filters */}
			<div className="flex gap-2 flex-wrap items-center">
				<Input
					placeholder="Поиск..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="h-8 text-sm w-44"
				/>
				<Select value={projectFilter} onValueChange={setProjectFilter}>
					<SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Проект" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все проекты</SelectItem>
						{projects.map((p) => (
							<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={priorityFilter} onValueChange={setPriorityFilter}>
					<SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Приоритет" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все приоритеты</SelectItem>
						{PRIORITY_OPTS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Статус" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						{STATUS_OPTS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<PeriodPicker value={period} onChange={setPeriod} />
				{(projectFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all" || search) && (
					<button
						className="text-xs text-gray-400 hover:text-gray-700"
						onClick={() => {
							setProjectFilter("all");
							setPriorityFilter("all");
							setStatusFilter("all");
							setSearch("");
							setPeriod(defaultPeriod("month"));
						}}
					>
						✕ сбросить
					</button>
				)}
				<div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-0.5">
					<button
						onClick={() => setViewMode("kanban")}
						className={`p-1.5 rounded transition-all ${viewMode === "kanban" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
						title="Канбан"
					>
						<LayoutGrid className="w-4 h-4" />
					</button>
					<button
						onClick={() => setViewMode("table")}
						className={`p-1.5 rounded transition-all ${viewMode === "table" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
						title="Таблица"
					>
						<List className="w-4 h-4" />
					</button>
					<button
						onClick={() => setViewMode("calendar")}
						className={`p-1.5 rounded transition-all ${viewMode === "calendar" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
						title="Календарь"
					>
						<CalendarDays className="w-4 h-4" />
					</button>
					<button
						onClick={() => setViewMode("gantt")}
						className={`p-1.5 rounded transition-all ${viewMode === "gantt" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
						title="Gantt"
					>
						<BarChart3 className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Content */}
			{isLoading ? (
				<Skeleton className="h-64 rounded-xl" />
			) : filteredTasks.length === 0 ? (
				<EmptyState tab={activeTab} />
			) : viewMode === "kanban" ? (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					{columns.map((col) => {
						const Icon = col.icon;
						return (
							<div key={col.value} className={`rounded-xl border ${col.bg} p-3`}>
								<div className={`flex items-center gap-1.5 mb-3 ${col.color}`}>
									<Icon className="w-3.5 h-3.5" />
									<span className="text-xs font-semibold text-gray-700">{col.label}</span>
									<span className="ml-auto bg-white border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
										{col.tasks.length}
									</span>
								</div>
								<div className="space-y-2">
									{col.tasks.map((t) => (
										<TaskCard
											key={t.id}
											task={t}
											userMap={userMap}
											projectMap={projectMap}
											stageLabelText={stageLabelByTaskId[t.id]}
											onEdit={setDialog}
											onDelete={handleDelete}
											onStatusChange={handleStatusChange}
										/>
									))}
									{col.tasks.length === 0 && (
										<p className="text-[11px] text-gray-300 text-center py-4">Пусто</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			) : viewMode === "table" ? (
				<TasksTable
					tasks={filteredTasks}
					userMap={userMap}
					projectMap={projectMap}
					stageLabelByTaskId={stageLabelByTaskId}
					onRowClick={(task) => navigate(`/construction/tasks/${task.id}`)}
				/>
			) : viewMode === "calendar" ? (
				<TasksCalendarView
					tasks={filteredTasks}
					projectMap={projectMap}
					onTaskClick={(task) => navigate(`/construction/tasks/${task.id}`)}
				/>
			) : (
				<TasksGanttView
					tasks={filteredTasks}
					onTaskClick={(task) => navigate(`/construction/tasks/${task.id}`)}
				/>
			)}

			<TaskDialog
				task={dialog}
				projects={projects}
				users={usersRaw}
				currentUserId={currentUserId}
				onClose={() => setDialog(null)}
				onSaved={() => qc.invalidateQueries({ queryKey: ["construction-tasks"] })}
			/>
		</div>
	);
}
