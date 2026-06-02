import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	Bell,
	CalendarClock,
	Link2,
	Loader2,
	Sparkles,
	Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useToast } from "@/hooks/use-toast";
import { fetchTaskFull, taskKeys } from "./api";
import { TaskActivityFeed } from "./components/TaskActivityFeed";
import { TaskChecklistSection } from "./components/TaskChecklistSection";
import { TaskCommentsPanel } from "./components/TaskCommentsPanel";
import { TaskAttachmentsSection } from "./components/TaskAttachmentsSection";
import { TaskPhotosSection } from "./components/TaskPhotosSection";
import { TaskProgressBar } from "./components/TaskProgressBar";
import { TaskSubtasksSection } from "./components/TaskSubtasksSection";

const STATUS_LABELS: Record<string, string> = {
	todo: "К выполнению",
	in_progress: "В работе",
	review: "На проверке",
	done: "Готово",
};

const PRIORITY_LABELS: Record<string, string> = {
	low: "Низкий",
	medium: "Средний",
	high: "Высокий",
	critical: "Критический",
};

const NBA_URGENCY_LABELS: Record<string, string> = {
	critical: "Критично",
	high: "Высокий",
	normal: "Обычный",
};

function stagePath(
	parent: { name: string } | null,
	stage: { name: string } | null,
): string {
	if (!stage) return "—";
	if (parent) return `${parent.name} → ${stage.name}`;
	return stage.name;
}

export function TaskDetailPage({ taskId }: { taskId: number }) {
	const [, navigate] = useLocation();
	const { user } = useAuth();
	const { toast } = useToast();
	const qc = useQueryClient();
	const [rightTab, setRightTab] = useState<"comments" | "activity">("comments");

	const { data, isLoading, refetch } = useQuery({
		queryKey: taskKeys.full(taskId),
		queryFn: () => fetchTaskFull(taskId),
		refetchInterval: 15_000,
	});

	const { data: usersRaw = [] } = useQuery({
		queryKey: ["users"],
		queryFn: () =>
			api.get("/users").then((r) =>
				Array.isArray(r.data) ? r.data : r.data?.data ?? [],
			),
	});
	const { data: contractors = [] } = useQuery({
		queryKey: ["construction-contractors-all"],
		queryFn: () => api.get("/construction/contractors").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: salesContracts = [] } = useQuery({
		queryKey: ["construction-sales-contracts"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: supplyRequests = [] } = useQuery({
		queryKey: ["supply-requests-all"],
		queryFn: () => api.get("/supply/requests").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: dependencies = [] } = useQuery({
		queryKey: ["construction-task-dependencies-all"],
		queryFn: () => api.get("/construction/tasks/dependencies").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: projectTasks = [] } = useQuery({
		queryKey: ["construction-tasks-by-project", data?.task?.projectId],
		queryFn: () =>
			api
				.get(`/construction/tasks?projectId=${data?.task?.projectId}`)
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
		enabled: Boolean(data?.task?.projectId),
	});

	const userMap = useMemo(
		() =>
			Object.fromEntries(
				usersRaw.map((u: { id: number; firstName: string; lastName: string }) => [
					u.id,
					u,
				]),
			),
		[usersRaw],
	);

	const saveDescription = useMutation({
		mutationFn: async (description: string) => {
			await api.patch(`/construction/tasks/${taskId}`, { description });
		},
		onSuccess: () => {
			void refetch();
			qc.invalidateQueries({ queryKey: taskKeys.all });
		},
	});

	const setProgressMode = useMutation({
		mutationFn: async (payload: { progressMode: string; progressPercent?: number }) => {
			await api.patch(`/construction/tasks/${taskId}/progress-mode`, payload);
		},
		onSuccess: () => void refetch(),
	});
	const generateRiskPlan = useMutation({
		mutationFn: async () =>
			api
				.post(`/construction/tasks/${taskId}/risk-action-plan`)
				.then((r) => r.data),
	});
	const checkSlaReminders = useMutation({
		mutationFn: async () =>
			api
				.post(`/construction/tasks/${taskId}/sla-reminders/check`)
				.then((r) => r.data),
	});
	const scheduleSlaReminders = useMutation({
		mutationFn: async (steps: Array<{
			title: string;
			ownerRole: string;
			slaHours: number;
			reason: string;
		}>) =>
			api
				.post(`/construction/tasks/${taskId}/risk-plan-reminders`, { steps })
				.then((r) => r.data),
		onSuccess: (data) => {
			toast({
				title: "SLA-напоминания запланированы",
				description: `Шагов: ${data.scheduled}, отправлено сейчас: ${data.notificationsCreated}, ожидают: ${data.pending}`,
			});
			void checkSlaReminders.mutateAsync();
		},
		onError: (err) => {
			toast({
				title: "Не удалось поставить напоминания",
				description: getApiErrorMessage(err),
				variant: "destructive",
			});
		},
	});

	const task = data?.task;
	const [descDraft, setDescDraft] = useState("");

	useEffect(() => {
		if (!task) return;
		setDescDraft(task.description || "");
	}, [task?.id, task?.description]);

	useEffect(() => {
		checkSlaReminders.mutate();
	}, [taskId]);

	if (isLoading || !data || !task) {
		return <Skeleton className="h-[70vh] rounded-xl" />;
	}

	const { subtasks, checklist, activity, comments, stage, parentStage } = data;
	const progress = Number(task.progressPercent) || 0;
	const contractorName = task.contractorId
		? contractors.find((c: { id: number; fullName?: string }) => Number(c.id) === Number(task.contractorId))?.fullName || `#${task.contractorId}`
		: null;
	const salesContractLabel = task.salesContractId
		? salesContracts.find((c: { id: number; contractNumber?: string }) => Number(c.id) === Number(task.salesContractId))?.contractNumber || `#${task.salesContractId}`
		: null;
	const supplyRequestLabel = task.supplyRequestId
		? `#${task.supplyRequestId} ${
			supplyRequests.find((s: { id: number; status?: string }) => Number(s.id) === Number(task.supplyRequestId))?.status || ""
		}`.trim()
		: null;
	const predecessorIds = dependencies
		.filter((d: { successorTaskId: number }) => Number(d.successorTaskId) === Number(task.id))
		.map((d: { predecessorTaskId: number }) => Number(d.predecessorTaskId));
	const blockingOpenDeps = predecessorIds.filter((pid) => {
		const maybeTask = projectTasks.find((s: { id: number; status?: string }) => Number(s.id) === pid);
		if (!maybeTask) return true;
		return maybeTask.status !== "done";
	}).length;
	const dueDate = task.plannedEndDate || task.dueDate || null;
	const overdueDays = dueDate
		? Math.max(
			0,
			Math.floor((Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000)),
		)
		: 0;

	return (
		<div className="space-y-4 -m-2">
			<div className="flex items-start gap-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={() => navigate("/construction/tasks")}
				>
					<ArrowLeft className="w-4 h-4" />
				</Button>
				<div className="flex-1 min-w-0">
					<p className="text-xs text-gray-500 mb-1">
						{stagePath(parentStage, stage)}
					</p>
					<h1 className="text-xl font-bold text-gray-900 truncate">{task.title}</h1>
					<div className="flex flex-wrap gap-2 mt-2">
						<Badge variant="outline">{STATUS_LABELS[task.status] || task.status}</Badge>
						<Badge variant="secondary">
							{PRIORITY_LABELS[task.priority] || task.priority}
						</Badge>
					</div>
				</div>
				<div className="w-40 flex-shrink-0">
					<TaskProgressBar percent={progress} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[calc(100vh-200px)]">
				<div className="lg:col-span-3 space-y-6 bg-white rounded-xl border border-gray-100 p-4 md:p-5">
					<section>
						<Label className="text-xs text-gray-500">Описание</Label>
						<Textarea
							className="mt-1 min-h-[80px]"
							value={descDraft}
							onChange={(e) => setDescDraft(e.target.value)}
							onBlur={() => {
								if (descDraft !== (task.description || "")) {
									saveDescription.mutate(descDraft);
								}
							}}
							placeholder="Опишите объём работ..."
						/>
					</section>

					<section className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="text-gray-400 text-xs">План начала</span>
							<p className="font-medium">
								{task.plannedStartDate
									? new Date(task.plannedStartDate).toLocaleDateString("ru-KG")
									: "—"}
							</p>
						</div>
						<div>
							<span className="text-gray-400 text-xs">План окончания</span>
							<p className="font-medium">
								{task.plannedEndDate
									? new Date(task.plannedEndDate).toLocaleDateString("ru-KG")
									: task.dueDate
										? new Date(task.dueDate).toLocaleDateString("ru-KG")
										: "—"}
							</p>
						</div>
						<div>
							<span className="text-gray-400 text-xs">Исполнитель</span>
							<p className="font-medium">
								{task.assignedTo && userMap[task.assignedTo]
									? `${userMap[task.assignedTo].firstName} ${userMap[task.assignedTo].lastName}`
									: "Не назначен"}
							</p>
						</div>
						<div>
							<span className="text-gray-400 text-xs">План часов</span>
							<p className="font-medium">{task.estimatedHours || "—"}</p>
						</div>
					</section>

					<section className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
						<div className="flex items-center gap-2 mb-2">
							<AlertTriangle className="w-4 h-4 text-amber-600" />
							<p className="text-sm font-semibold text-gray-800">KPI и риски</p>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
							<div>
								<p className="text-gray-500">Прогресс задачи</p>
								<p className="font-semibold text-gray-900">{progress}%</p>
							</div>
							<div>
								<p className="text-gray-500">Срок</p>
								<p className="font-semibold text-gray-900">
									{dueDate ? new Date(dueDate).toLocaleDateString("ru-KG") : "—"}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Просрочка</p>
								<p className={`font-semibold ${overdueDays > 0 ? "text-rose-600" : "text-gray-900"}`}>
									{overdueDays > 0 ? `${overdueDays} дн` : "нет"}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Блокеры (deps)</p>
								<p className={`font-semibold ${blockingOpenDeps > 0 ? "text-rose-600" : "text-gray-900"}`}>
									{blockingOpenDeps}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
							<div className="rounded border border-gray-200 bg-white px-2 py-1.5">
								<div className="flex items-center gap-1 text-gray-500"><Link2 className="w-3 h-3" /> Подрядчик</div>
								<div className="font-medium text-gray-800">{contractorName || "Не связан"}</div>
							</div>
							<div className="rounded border border-gray-200 bg-white px-2 py-1.5">
								<div className="flex items-center gap-1 text-gray-500"><CalendarClock className="w-3 h-3" /> Договор</div>
								<div className="font-medium text-gray-800">{salesContractLabel || "Не связан"}</div>
							</div>
							<div className="rounded border border-gray-200 bg-white px-2 py-1.5">
								<div className="flex items-center gap-1 text-gray-500"><Link2 className="w-3 h-3" /> Снабжение</div>
								<div className="font-medium text-gray-800">{supplyRequestLabel || "Не связано"}</div>
							</div>
						</div>
						<div className="mt-3 rounded border border-amber-200 bg-white p-2.5">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-1.5">
									<Sparkles className="w-3.5 h-3.5 text-amber-600" />
									<p className="text-xs font-semibold text-gray-800">
										AI-план действий по рискам
									</p>
								</div>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 text-xs"
									onClick={() => generateRiskPlan.mutate()}
									disabled={generateRiskPlan.isPending}
								>
									{generateRiskPlan.isPending ? "Генерация..." : "Сгенерировать план"}
								</Button>
							</div>
							{generateRiskPlan.data ? (
								<div className="mt-2 space-y-2">
									<div className="flex flex-wrap gap-2 items-center">
										<Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
											Риск: {String(generateRiskPlan.data?.riskLevel || "medium")}
										</Badge>
										<Badge variant="outline" className="text-[10px] uppercase tracking-wide">
											Источник: {generateRiskPlan.data?.source === "ai" ? "AI" : "Fallback"}
										</Badge>
									</div>
									{generateRiskPlan.data?.nextBestAction ? (
										<div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-2">
											<div className="flex items-center gap-1.5 mb-1">
												<Zap className="w-3.5 h-3.5 text-emerald-600" />
												<p className="text-xs font-semibold text-emerald-900">
													Следующее лучшее действие
												</p>
												<Badge
													variant="outline"
													className="text-[10px] border-emerald-300 text-emerald-800"
												>
													{NBA_URGENCY_LABELS[
														String(generateRiskPlan.data.nextBestAction.urgency || "normal")
													] || "Обычный"}
												</Badge>
											</div>
											<p className="text-xs font-medium text-gray-900">
												{generateRiskPlan.data.nextBestAction.title}
											</p>
											<p className="text-[11px] text-gray-600 mt-0.5">
												{generateRiskPlan.data.nextBestAction.ownerRole} · SLA{" "}
												{Number(generateRiskPlan.data.nextBestAction.slaHours || 24)}ч · до{" "}
												{new Date(
													String(generateRiskPlan.data.nextBestAction.dueAt),
												).toLocaleString("ru-KG")}
											</p>
											<p className="text-[11px] text-gray-500 mt-0.5">
												{generateRiskPlan.data.nextBestAction.reason}
											</p>
										</div>
									) : null}
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											size="sm"
											variant="secondary"
											className="h-7 text-xs gap-1"
											disabled={
												scheduleSlaReminders.isPending ||
												!Array.isArray(generateRiskPlan.data?.steps) ||
												generateRiskPlan.data.steps.length === 0
											}
											onClick={() => {
												if (!Array.isArray(generateRiskPlan.data?.steps)) return;
												scheduleSlaReminders.mutate(generateRiskPlan.data.steps);
											}}
										>
											<Bell className="w-3 h-3" />
											{scheduleSlaReminders.isPending
												? "Планируем..."
												: "Поставить SLA-напоминания"}
										</Button>
									</div>
									<p className="text-xs text-gray-700">
										{String(generateRiskPlan.data?.summary || "")}
									</p>
									<div className="space-y-1.5">
										{Array.isArray(generateRiskPlan.data?.steps) &&
											generateRiskPlan.data.steps.map(
												(
													step: {
														title?: string;
														ownerRole?: string;
														slaHours?: number;
														reason?: string;
													},
													idx: number,
												) => (
													<div
														key={`${idx}-${step.title || "step"}`}
														className="rounded border border-gray-200 px-2 py-1.5 text-xs"
													>
														<p className="font-medium text-gray-900">
															{idx + 1}. {step.title || "Действие"}
														</p>
														<p className="text-gray-600">
															{step.ownerRole || "Ответственный"} · SLA{" "}
															{Number(step.slaHours || 24)}ч
														</p>
														<p className="text-gray-500">{step.reason || "—"}</p>
													</div>
												),
											)}
									</div>
								</div>
							) : (
								<p className="mt-2 text-xs text-gray-500">
									Соберите план прямо из KPI: шаги, ответственные и SLA.
								</p>
							)}
						</div>
					</section>

					<section className="flex flex-wrap items-end gap-3">
						<div className="w-48">
							<Label className="text-xs">Расчёт прогресса</Label>
							<Select
								value={task.progressMode || "checklist"}
								onValueChange={(v) =>
									setProgressMode.mutate({ progressMode: v })
								}
							>
								<SelectTrigger className="mt-1 h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="checklist">По чек-листу</SelectItem>
									<SelectItem value="subtasks">По подзадачам</SelectItem>
									<SelectItem value="manual">Вручную</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{task.progressMode === "manual" && (
							<div className="flex-1 min-w-[120px]">
								<Label className="text-xs">% вручную</Label>
								<input
									type="range"
									min={0}
									max={100}
									value={progress}
									className="w-full mt-2"
									onChange={(e) => {
										const v = parseInt(e.target.value, 10);
										setProgressMode.mutate({
											progressMode: "manual",
											progressPercent: v,
										});
									}}
								/>
							</div>
						)}
						{setProgressMode.isPending && (
							<Loader2 className="w-4 h-4 animate-spin text-gray-400" />
						)}
					</section>

					<TaskSubtasksSection
						taskId={taskId}
						subtasks={subtasks}
						onChanged={() => void refetch()}
					/>

					<TaskChecklistSection
						taskId={taskId}
						items={checklist}
						progressPercent={progress}
						onChanged={() => void refetch()}
					/>

					<TaskPhotosSection taskId={taskId} />
					<TaskAttachmentsSection taskId={taskId} />
				</div>

				<div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 flex flex-col min-h-[400px]">
					<Tabs
						value={rightTab}
						onValueChange={(v) => setRightTab(v as typeof rightTab)}
						className="flex flex-col flex-1"
					>
						<TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
							<TabsTrigger
								value="comments"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500"
							>
								Комментарии ({comments.length})
							</TabsTrigger>
							<TabsTrigger
								value="activity"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500"
							>
								История
							</TabsTrigger>
						</TabsList>
						<TabsContent value="comments" className="flex-1 p-4 mt-0">
							<TaskCommentsPanel
								task={task}
								comments={comments}
								currentUserId={user?.id}
								userMap={userMap}
							/>
						</TabsContent>
						<TabsContent value="activity" className="flex-1 p-4 mt-0 overflow-y-auto">
							<TaskActivityFeed activity={activity} userMap={userMap} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
