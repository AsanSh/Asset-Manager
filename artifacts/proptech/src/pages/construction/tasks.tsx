import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
	AlertCircle,
	BarChart3,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Circle,
	Clock,
	Edit2,
	FilePlus2,
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
import { useEffect, useMemo, useRef, useState } from "react";
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
	contractorId?: number | null;
	salesContractId?: number | null;
	supplyRequestId?: number | null;
	dueDate?: string | null;
	estimatedHours?: string | null;
	progressPercent?: number | null;
	progressMode?: string | null;
	plannedStartDate?: string | null;
	plannedEndDate?: string | null;
	commentCount?: number;
	attachmentCount?: number;
	blockedByCount?: number;
	stageProgressPercent?: number;
	createdAt: string;
}
interface Project { id: number; name: string; }
interface Contractor { id: number; fullName: string; }
interface SalesContract { id: number; projectId: number; contractNumber?: string | null; buyerName?: string | null; }
interface SupplyRequest { id: number; projectId?: number | null; status?: string | null; neededByDate?: string | null; }
interface Stage {
	id: number;
	projectId: number;
	name: string;
	parentStageId?: number | null;
}
interface ApiUser { id: number; firstName: string; lastName: string; email: string; }
interface TaskDependency {
	id: number;
	predecessorTaskId: number;
	successorTaskId: number;
	dependencyType: "FS" | "SS";
	lagDays: number;
}

type TableGroupBy = "none" | "project" | "stage" | "assignee" | "status";

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
		contractorId: raw.contractorId ?? raw.contractor_id ?? null,
		salesContractId: raw.salesContractId ?? raw.sales_contract_id ?? null,
		supplyRequestId: raw.supplyRequestId ?? raw.supply_request_id ?? null,
		progressPercent: Number(raw.progressPercent ?? raw.progress_percent ?? 0),
		commentCount: Number(raw.commentCount ?? raw.comment_count ?? 0),
		attachmentCount: Number(raw.attachmentCount ?? raw.attachment_count ?? 0),
		blockedByCount: Number(raw.blockedByCount ?? raw.blocked_by_count ?? 0),
		stageProgressPercent: Number(raw.stageProgressPercent ?? raw.stage_progress_percent ?? 0),
	} as unknown as Task;
}

function taskTimelineDate(task: Task): string | null {
	return task.plannedEndDate || task.dueDate || task.createdAt || null;
}

function taskCalendarDateKeys(task: Task): string[] {
	const keys = new Set<string>();
	for (const d of [task.dueDate, task.plannedEndDate, task.plannedStartDate, task.createdAt]) {
		if (d) keys.add(String(d).slice(0, 10));
	}
	return [...keys];
}

function isTaskOverdue(task: Task): boolean {
	return Boolean(task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date());
}

const TASK_DRAG_MIME = "application/x-construction-task-id";

type ViewMode = "kanban" | "table" | "calendar" | "gantt";
const TASKS_VIEW_STORAGE_KEY = "construction-tasks-view-mode";

/** Задача попадает в период, если любая из дат в диапазоне; без дат — не скрываем */
function taskMatchesPeriod(task: Task, period: PeriodValue): boolean {
	if (period.preset === "all") return true;
	const candidates = [task.createdAt, task.dueDate, task.plannedEndDate, task.plannedStartDate].filter(
		Boolean,
	) as string[];
	if (candidates.length === 0) return true;
	return candidates.some((d) => inPeriod(d, period));
}

function stageLabel(stage: Stage, parentMap: Record<number, Stage>): string {
	if (stage.parentStageId && parentMap[stage.parentStageId]) {
		return `${parentMap[stage.parentStageId].name} → ${stage.name}`;
	}
	return stage.name;
}

function TaskDialog({
	task, projects, users, contractors, salesContracts, supplyRequests, currentUserId, onClose, onSaved,
}: {
	task: Task | null | "new";
	projects: Project[];
	users: ApiUser[];
	contractors: Contractor[];
	salesContracts: SalesContract[];
	supplyRequests: SupplyRequest[];
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
		contractorId: String(init?.contractorId || ""),
		salesContractId: String(init?.salesContractId || ""),
		supplyRequestId: String(init?.supplyRequestId || ""),
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
				contractorId: "",
				salesContractId: "",
				supplyRequestId: "",
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
				contractorId: String(t.contractorId || ""),
				salesContractId: String(t.salesContractId || ""),
				supplyRequestId: String(t.supplyRequestId || ""),
			});
		}
	}, [task, projects, currentUserId]);

	const availableSalesContracts = useMemo(
		() =>
			salesContracts.filter(
				(c) => String(c.projectId) === form.projectId,
			),
		[salesContracts, form.projectId],
	);

	const availableSupplyRequests = useMemo(
		() =>
			supplyRequests.filter(
				(r) =>
					r.projectId == null || String(r.projectId) === form.projectId,
			),
		[supplyRequests, form.projectId],
	);

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
			const res = await fetch(url, {
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
					contractorId: form.contractorId ? parseInt(form.contractorId, 10) : null,
					salesContractId: form.salesContractId ? parseInt(form.salesContractId, 10) : null,
					supplyRequestId: form.supplyRequestId ? parseInt(form.supplyRequestId, 10) : null,
				}),
			});
			if (!res.ok) {
				const errBody = await res.json().catch(() => ({}));
				throw new Error(
					typeof errBody?.error === "string" ? errBody.error : `HTTP ${res.status}`,
				);
			}
			toast({ title: isEdit ? "Задача обновлена" : "Задача добавлена" });
			onSaved();
			onClose();
		} catch (err) {
			toast({
				title: "Ошибка",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
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
								setForm((p) => ({
									...p,
									projectId: v,
									stageId: "",
									salesContractId: "",
									supplyRequestId: "",
								}));
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
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<Label>Подрядчик</Label>
							<Select value={form.contractorId || "none"} onValueChange={(v) => set("contractorId", v === "none" ? "" : v)}>
								<SelectTrigger className="mt-1"><SelectValue placeholder="Не связан" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Не связан —</SelectItem>
									{contractors.map((c) => (
										<SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Договор</Label>
							<Select value={form.salesContractId || "none"} onValueChange={(v) => set("salesContractId", v === "none" ? "" : v)}>
								<SelectTrigger className="mt-1"><SelectValue placeholder="Не связан" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Не связан —</SelectItem>
									{availableSalesContracts.map((c) => (
										<SelectItem key={c.id} value={String(c.id)}>
											{c.contractNumber || `Договор #${c.id}`} {c.buyerName ? `· ${c.buyerName}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Заявка снабжения</Label>
							<Select value={form.supplyRequestId || "none"} onValueChange={(v) => set("supplyRequestId", v === "none" ? "" : v)}>
								<SelectTrigger className="mt-1"><SelectValue placeholder="Не связана" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Не связана —</SelectItem>
									{availableSupplyRequests.map((r) => (
										<SelectItem key={r.id} value={String(r.id)}>
											Заявка #{r.id}{r.status ? ` · ${r.status}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
	task, userMap, projectMap, stageLabelText, contractorMap, salesContractMap, supplyRequestMap, onEdit, onDelete, onStatusChange, onQuickSupplyRequest, onQuickSalesContract, kanbanDraggable = false,
}: {
	task: Task;
	userMap: Record<number, ApiUser>;
	projectMap: Record<number, string>;
	stageLabelText?: string;
	contractorMap: Record<number, string>;
	salesContractMap: Record<number, string>;
	supplyRequestMap: Record<number, string>;
	onEdit: (t: Task) => void;
	onDelete: (id: number) => void;
	onStatusChange: (task: Task, status: string) => void;
	onQuickSupplyRequest: (task: Task) => void;
	onQuickSalesContract: (task: Task) => void;
	kanbanDraggable?: boolean;
}) {
	const [, navigate] = useLocation();
	const dragMovedRef = useRef(false);
	const statusOpt = STATUS_OPTS.find((s) => s.value === task.status);
	const StatusIcon = statusOpt?.icon ?? Circle;
	const priorityOpt = PRIORITY_OPTS.find((p) => p.value === task.priority);
	const assignee = taskAssignedTo(task) ? userMap[taskAssignedTo(task)!] : null;
	const isOverdue = isTaskOverdue(task);

	const nextStatus = task.status === "todo" ? "in_progress"
		: task.status === "in_progress" ? "review"
		: task.status === "review" ? "done" : null;

	const openChat = () => navigate(`/construction/tasks/${task.id}`);

	return (
		<div
			role="button"
			tabIndex={0}
			draggable={kanbanDraggable}
			onDragStart={(e) => {
				if (!kanbanDraggable) return;
				dragMovedRef.current = true;
				e.dataTransfer.setData(TASK_DRAG_MIME, String(task.id));
				e.dataTransfer.effectAllowed = "move";
			}}
			onDragEnd={() => {
				window.setTimeout(() => {
					dragMovedRef.current = false;
				}, 0);
			}}
			onClick={() => {
				if (dragMovedRef.current) return;
				openChat();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openChat();
				}
			}}
			className={`bg-white border rounded-lg p-3 hover:border-amber-300 hover:shadow-sm transition-all group cursor-pointer ${
				isOverdue
					? "border-rose-300 am-task-overdue-pulse"
					: "border-gray-200"
			} ${kanbanDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
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
					{!task.supplyRequestId && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickSupplyRequest(task);
							}}
							className="text-gray-300 hover:text-teal-600"
							title="Создать заявку снабжения"
						>
							<FilePlus2 className="w-3.5 h-3.5" />
						</button>
					)}
					{!task.salesContractId && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickSalesContract(task);
							}}
							className="text-gray-300 hover:text-cyan-700"
							title="Создать черновик договора"
						>
							<FilePlus2 className="w-3.5 h-3.5" />
						</button>
					)}
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
				{task.contractorId && (
					<span className="text-[10px] text-purple-600 truncate max-w-[130px]">
						👷 {contractorMap[Number(task.contractorId)] || `#${task.contractorId}`}
					</span>
				)}
				{task.salesContractId && (
					<span className="text-[10px] text-cyan-700 truncate max-w-[130px]">
						📄 {salesContractMap[Number(task.salesContractId)] || `#${task.salesContractId}`}
					</span>
				)}
				{task.supplyRequestId && (
					<span className="text-[10px] text-teal-700 truncate max-w-[130px]">
						📦 {supplyRequestMap[Number(task.supplyRequestId)] || `#${task.supplyRequestId}`}
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
	contractorMap,
	salesContractMap,
	supplyRequestMap,
	onRowClick,
	footer,
}: {
	tasks: Task[];
	userMap: Record<number, ApiUser>;
	projectMap: Record<number, string>;
	stageLabelByTaskId: Record<number, string>;
	contractorMap: Record<number, string>;
	salesContractMap: Record<number, string>;
	supplyRequestMap: Record<number, string>;
	onRowClick: (task: Task) => void;
	footer?: React.ReactNode;
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
					<div className="text-sm font-medium tabular-nums">
						<div>{Number(row.original.progressPercent) || 0}%</div>
						<div className="text-[10px] text-gray-400">
							Этап: {Number(row.original.stageProgressPercent ?? 0)}%
						</div>
					</div>
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
				id: "links",
				header: "Связи",
				meta: { exportLabel: "Связи" },
				cell: ({ row }) => {
					const t = row.original;
					const parts: string[] = [];
					if (t.contractorId) parts.push(contractorMap[Number(t.contractorId)] || `Подрядчик #${t.contractorId}`);
					if (t.salesContractId) parts.push(salesContractMap[Number(t.salesContractId)] || `Договор #${t.salesContractId}`);
					if (t.supplyRequestId) parts.push(supplyRequestMap[Number(t.supplyRequestId)] || `Заявка #${t.supplyRequestId}`);
					return (
						<div className="text-xs text-gray-600 max-w-[220px] truncate">
							{parts.length ? parts.join(" · ") : "—"}
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
			{
				id: "overdueDays",
				header: "Просрочка, дн",
				meta: { exportLabel: "Просрочка, дн", align: "right" },
				cell: ({ row }) => {
					if (!row.original.dueDate || row.original.status === "done") {
						return <span className="text-xs text-gray-400">0</span>;
					}
					const due = new Date(row.original.dueDate);
					const now = new Date();
					const diff = Math.floor(
						(now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000),
					);
					return (
						<span className={`text-xs font-semibold ${diff > 0 ? "text-rose-600" : "text-gray-500"}`}>
							{Math.max(0, diff)}
						</span>
					);
				},
			},
		],
		[userMap, projectMap, stageLabelByTaskId, contractorMap, salesContractMap, supplyRequestMap],
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
			footer={footer}
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
	const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
	const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

	const tasksByDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const task of tasks) {
			for (const key of taskCalendarDateKeys(task)) {
				const arr = map.get(key) ?? [];
				if (!arr.some((t) => t.id === task.id)) arr.push(task);
				map.set(key, arr);
			}
		}
		return map;
	}, [tasks]);

	const calendarDays = useMemo(() => {
		const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
		const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
		return eachDayOfInterval({ start, end });
	}, [monthCursor]);

	const selectedKey = format(selectedDay, "yyyy-MM-dd");
	const selectedTasks = tasksByDate.get(selectedKey) ?? [];

	const weekDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

	if (tasks.length === 0) {
		return <div className="text-sm text-gray-400 py-10 text-center">Нет задач в выбранном периоде</div>;
	}

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => setMonthCursor((m) => subMonths(m, 1))}
						aria-label="Предыдущий месяц"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<div className="text-sm font-semibold text-gray-900 capitalize">
						{format(monthCursor, "LLLL yyyy", { locale: ru })}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => setMonthCursor((m) => addMonths(m, 1))}
						aria-label="Следующий месяц"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>

				<div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
					{weekDayLabels.map((label) => (
						<div
							key={label}
							className="py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
						>
							{label}
						</div>
					))}
				</div>

				<div className="grid grid-cols-7">
					{calendarDays.map((day) => {
						const key = format(day, "yyyy-MM-dd");
						const dayTasks = tasksByDate.get(key) ?? [];
						const inMonth = isSameMonth(day, monthCursor);
						const selected = isSameDay(day, selectedDay);
						const today = isToday(day);
						return (
							<button
								key={key}
								type="button"
								onClick={() => setSelectedDay(day)}
								className={`min-h-[88px] border-b border-r border-gray-100 p-1.5 text-left transition-colors ${
									!inMonth ? "bg-gray-50/80" : "bg-white"
								} ${selected ? "ring-2 ring-inset ring-amber-400 z-[1]" : "hover:bg-amber-50/40"}`}
							>
								<div className="flex items-center justify-between gap-1 mb-1">
									<span
										className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
											today
												? "bg-amber-500 text-white"
												: inMonth
													? "text-gray-800"
													: "text-gray-400"
										}`}
									>
										{format(day, "d")}
									</span>
									{dayTasks.length > 0 && (
										<span className="text-[10px] text-gray-500 font-medium tabular-nums">
											{dayTasks.length}
										</span>
									)}
								</div>
								<div className="space-y-0.5">
									{dayTasks.slice(0, 3).map((task) => {
										const overdue = isTaskOverdue(task);
										const statusOpt = STATUS_OPTS.find((s) => s.value === task.status);
										return (
											<div
												key={task.id}
												className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
													overdue
														? "bg-rose-100 text-rose-800 am-task-overdue-pulse"
														: statusOpt?.bg ?? "bg-gray-100 text-gray-700"
												}`}
												title={task.title}
											>
												{task.title}
											</div>
										);
									})}
									{dayTasks.length > 3 && (
										<div className="text-[10px] text-gray-400 px-1">
											+{dayTasks.length - 3} ещё
										</div>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white">
				<div className="px-3 py-2 border-b border-gray-100 text-sm font-semibold text-gray-700">
					{format(selectedDay, "d MMMM yyyy, EEEE", { locale: ru })}
					{selectedTasks.length > 0 && (
						<span className="ml-2 text-xs font-normal text-gray-500">
							· {selectedTasks.length} задач
						</span>
					)}
				</div>
				{selectedTasks.length === 0 ? (
					<p className="text-sm text-gray-400 px-3 py-4">На этот день задач нет</p>
				) : (
					<div className="divide-y divide-gray-100">
						{selectedTasks.map((task) => (
							<button
								key={task.id}
								type="button"
								onClick={() => onTaskClick(task)}
								className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
									isTaskOverdue(task) ? "bg-rose-50/50" : ""
								}`}
							>
								<div
									className={`text-sm font-medium ${
										isTaskOverdue(task) ? "text-rose-800 am-task-overdue-pulse rounded px-1 -mx-1" : "text-gray-900"
									}`}
								>
									{task.title}
								</div>
								<div className="text-xs text-gray-500 mt-0.5">
									{projectMap[task.projectId] || "—"} ·{" "}
									{STATUS_OPTS.find((s) => s.value === task.status)?.label || task.status}
									{isTaskOverdue(task) ? " · просрочено" : ""}
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function TasksGanttView({
	tasks,
	onTaskClick,
	dependencies,
}: {
	tasks: Task[];
	onTaskClick: (task: Task) => void;
	dependencies: TaskDependency[];
}) {
	const depsBySuccessor = useMemo(() => {
		const map = new Map<number, TaskDependency[]>();
		for (const dep of dependencies) {
			const arr = map.get(dep.successorTaskId) ?? [];
			arr.push(dep);
			map.set(dep.successorTaskId, arr);
		}
		return map;
	}, [dependencies]);

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
					{(depsBySuccessor.get(row.task.id)?.length ?? 0) > 0 && (
						<div className="mb-1 text-[10px] text-indigo-600">
							Зависимости:{" "}
							{(depsBySuccessor.get(row.task.id) ?? [])
								.map((dep) => `#${dep.predecessorTaskId} ${dep.dependencyType}${dep.lagDays ? ` (+${dep.lagDays}д)` : ""}`)
								.join(", ")}
						</div>
					)}
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
	const [activeTab, setActiveTab] = useState<TabId>("all");
	const [projectFilter, setProjectFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [tableGroupBy, setTableGroupBy] = useState<TableGroupBy>("none");
	const [search, setSearch] = useState("");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod("all"));
	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if (typeof window === "undefined") return "calendar";
		const saved = localStorage.getItem(TASKS_VIEW_STORAGE_KEY);
		if (saved === "kanban" || saved === "table" || saved === "calendar" || saved === "gantt") {
			return saved;
		}
		return "calendar";
	});
	const [kanbanDropStatus, setKanbanDropStatus] = useState<string | null>(null);
	const [, navigate] = useLocation();

	useEffect(() => {
		localStorage.setItem(TASKS_VIEW_STORAGE_KEY, viewMode);
	}, [viewMode]);

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
	const { data: tasks = [], isLoading, isError: tasksError } = useQuery<Task[]>({
		queryKey: ["construction-tasks", period.preset, period.from, period.to],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (period.preset !== "all") {
				params.set("fromDate", period.from);
				params.set("toDate", period.to);
			}
			const qs = params.toString();
			const { data } = await api.get(
				qs ? `/construction/tasks?${qs}` : "/construction/tasks",
			);
			return (Array.isArray(data) ? data : []).map((t) =>
				normalizeTask(t as Record<string, unknown>),
			);
		},
	});
	const { data: allStages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages-all"],
		queryFn: () => api.get("/construction/stages").then((r) => r.data),
	});
	const { data: contractors = [] } = useQuery<Contractor[]>({
		queryKey: ["construction-contractors-all"],
		queryFn: () => api.get("/construction/contractors").then((r) => Array.isArray(r.data) ? r.data : []),
	});
	const { data: salesContracts = [] } = useQuery<SalesContract[]>({
		queryKey: ["construction-sales-contracts"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => Array.isArray(r.data) ? r.data : []),
	});
	const { data: supplyRequests = [] } = useQuery<SupplyRequest[]>({
		queryKey: ["supply-requests-all"],
		queryFn: () => api.get("/supply/requests").then((r) => Array.isArray(r.data) ? r.data : []),
	});
	const { data: taskDependencies = [] } = useQuery<TaskDependency[]>({
		queryKey: ["construction-task-dependencies", projectFilter],
		queryFn: () =>
			api
				.get(
					projectFilter === "all"
						? "/construction/tasks/dependencies"
						: `/construction/tasks/dependencies?projectId=${projectFilter}`,
				)
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const userMap = useMemo(
		() => Object.fromEntries(usersRaw.map((u) => [u.id, u])),
		[usersRaw],
	);
	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((p) => [p.id, p.name])),
		[projects],
	);
	const contractorMap = useMemo(
		() => Object.fromEntries(contractors.map((c) => [c.id, c.fullName])),
		[contractors],
	);
	const salesContractMap = useMemo(
		() =>
			Object.fromEntries(
				salesContracts.map((c) => [c.id, c.contractNumber || `Договор #${c.id}`]),
			),
		[salesContracts],
	);
	const supplyRequestMap = useMemo(
		() => Object.fromEntries(supplyRequests.map((r) => [r.id, `Заявка #${r.id}`])),
		[supplyRequests],
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
			if (!taskMatchesPeriod(t, period)) return false;
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

	const handleQuickSupplyRequest = async (task: Task) => {
		try {
			await api.post(`/construction/tasks/${task.id}/quick-supply-request`);
			toast({ title: "Заявка снабжения создана и привязана к задаче" });
			qc.invalidateQueries({ queryKey: ["construction-tasks"] });
			qc.invalidateQueries({ queryKey: ["supply-requests-all"] });
		} catch {
			toast({ title: "Не удалось создать заявку снабжения", variant: "destructive" });
		}
	};

	const handleQuickSalesContract = async (task: Task) => {
		try {
			await api.post(`/construction/tasks/${task.id}/quick-sales-contract`);
			toast({ title: "Черновик договора создан и привязан к задаче" });
			qc.invalidateQueries({ queryKey: ["construction-tasks"] });
			qc.invalidateQueries({ queryKey: ["construction-sales-contracts"] });
		} catch {
			toast({ title: "Не удалось создать черновик договора", variant: "destructive" });
		}
	};

	const doneCount = filteredTasks.filter((t) => t.status === "done").length;
	const overdueCount = filteredTasks.filter((t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date()).length;
	const totalComments = filteredTasks.reduce((sum, t) => sum + Number(t.commentCount ?? 0), 0);
	const totalAttachments = filteredTasks.reduce((sum, t) => sum + Number(t.attachmentCount ?? 0), 0);
	const totalBlocked = filteredTasks.reduce((sum, t) => sum + Number(t.blockedByCount ?? 0), 0);

	const groupedTableData = useMemo(() => {
		if (tableGroupBy === "none") return [{ key: "all", label: "Все задачи", rows: filteredTasks }];
		const buckets = new Map<string, Task[]>();
		for (const task of filteredTasks) {
			let groupKey = "—";
			if (tableGroupBy === "project") groupKey = projectMap[task.projectId] || "Без проекта";
			if (tableGroupBy === "stage") groupKey = stageLabelByTaskId[task.id] || "Без этапа";
			if (tableGroupBy === "status") {
				groupKey = STATUS_OPTS.find((s) => s.value === task.status)?.label || task.status;
			}
			if (tableGroupBy === "assignee") {
				const assignee = taskAssignedTo(task);
				groupKey = assignee ? userName(userMap[assignee] ?? ({ firstName: "Неизвестный", lastName: "", email: "", id: assignee } as ApiUser)) : "Не назначен";
			}
			const arr = buckets.get(groupKey) ?? [];
			arr.push(task);
			buckets.set(groupKey, arr);
		}
		return Array.from(buckets.entries())
			.map(([label, rows]) => ({ key: label, label, rows }))
			.sort((a, b) => b.rows.length - a.rows.length);
	}, [tableGroupBy, filteredTasks, projectMap, stageLabelByTaskId, userMap]);

	const tableFooter = (
		<tr className="bg-gray-50 border-t border-gray-200">
			<td colSpan={20} className="px-3 py-2 text-xs text-gray-700 font-medium">
				Итого: {filteredTasks.length} задач · {doneCount} выполнено · {overdueCount} просрочено ·{" "}
				{totalComments} комментариев · {totalAttachments} вложений · {totalBlocked} блокеров
			</td>
		</tr>
	);

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
				{viewMode === "table" && (
					<Select value={tableGroupBy} onValueChange={(v) => setTableGroupBy(v as TableGroupBy)}>
						<SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Группировка" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="none">Без группировки</SelectItem>
							<SelectItem value="project">По проекту</SelectItem>
							<SelectItem value="stage">По этапу</SelectItem>
							<SelectItem value="assignee">По исполнителю</SelectItem>
							<SelectItem value="status">По статусу</SelectItem>
						</SelectContent>
					</Select>
				)}
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
			{tasksError ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
					Не удалось загрузить задачи. Обновите страницу или проверьте доступ к API.
				</div>
			) : isLoading ? (
				<Skeleton className="h-64 rounded-xl" />
			) : filteredTasks.length === 0 ? (
				<EmptyState tab={activeTab} />
			) : viewMode === "kanban" ? (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					{columns.map((col) => {
						const Icon = col.icon;
						const isDropTarget = kanbanDropStatus === col.value;
						return (
							<div
								key={col.value}
								className={`rounded-xl border ${col.bg} p-3 transition-shadow ${
									isDropTarget ? "ring-2 ring-amber-400 ring-offset-2 shadow-md" : ""
								}`}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setKanbanDropStatus(col.value);
								}}
								onDragLeave={(e) => {
									const next = e.relatedTarget as Node | null;
									if (next && e.currentTarget.contains(next)) return;
									setKanbanDropStatus((prev) => (prev === col.value ? null : prev));
								}}
								onDrop={(e) => {
									e.preventDefault();
									const id = Number(e.dataTransfer.getData(TASK_DRAG_MIME));
									if (!Number.isFinite(id)) {
										setKanbanDropStatus(null);
										return;
									}
									const dropped = filteredTasks.find((t) => t.id === id);
									if (dropped && dropped.status !== col.value) {
										void handleStatusChange(dropped, col.value);
									}
									setKanbanDropStatus(null);
								}}
							>
								<div className={`flex items-center gap-1.5 mb-3 ${col.color}`}>
									<Icon className="w-3.5 h-3.5" />
									<span className="text-xs font-semibold text-gray-700">{col.label}</span>
									<span className="ml-auto bg-white border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
										{col.tasks.length}
									</span>
								</div>
								<div className="space-y-2 min-h-[72px]">
									{col.tasks.map((t) => (
										<TaskCard
											key={t.id}
											task={t}
											userMap={userMap}
											projectMap={projectMap}
											stageLabelText={stageLabelByTaskId[t.id]}
											contractorMap={contractorMap}
											salesContractMap={salesContractMap}
											supplyRequestMap={supplyRequestMap}
											onEdit={setDialog}
											onDelete={handleDelete}
											onStatusChange={handleStatusChange}
											onQuickSupplyRequest={handleQuickSupplyRequest}
											onQuickSalesContract={handleQuickSalesContract}
											kanbanDraggable
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
				<div className="space-y-3">
					{groupedTableData.map((group) => (
						<div key={group.key} className="space-y-1">
							{tableGroupBy !== "none" && (
								<div className="text-xs font-semibold text-gray-600">
									{group.label} · {group.rows.length}
								</div>
							)}
							<TasksTable
								tasks={group.rows}
								userMap={userMap}
								projectMap={projectMap}
								stageLabelByTaskId={stageLabelByTaskId}
								contractorMap={contractorMap}
								salesContractMap={salesContractMap}
								supplyRequestMap={supplyRequestMap}
								onRowClick={(task) => navigate(`/construction/tasks/${task.id}`)}
								footer={tableGroupBy === "none" ? tableFooter : undefined}
							/>
						</div>
					))}
				</div>
			) : viewMode === "calendar" ? (
				<TasksCalendarView
					tasks={filteredTasks}
					projectMap={projectMap}
					onTaskClick={(task) => navigate(`/construction/tasks/${task.id}`)}
				/>
			) : (
				<TasksGanttView
					tasks={filteredTasks}
					dependencies={taskDependencies}
					onTaskClick={(task) => navigate(`/construction/tasks/${task.id}`)}
				/>
			)}

			<TaskDialog
				task={dialog}
				projects={projects}
				users={usersRaw}
				contractors={contractors}
				salesContracts={salesContracts}
				supplyRequests={supplyRequests}
				currentUserId={currentUserId}
				onClose={() => setDialog(null)}
				onSaved={() => qc.invalidateQueries({ queryKey: ["construction-tasks"] })}
			/>
		</div>
	);
}
