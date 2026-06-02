import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
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

	const task = data?.task;
	const [descDraft, setDescDraft] = useState("");

	useEffect(() => {
		if (!task) return;
		setDescDraft(task.description || "");
	}, [task?.id, task?.description]);

	if (isLoading || !data || !task) {
		return <Skeleton className="h-[70vh] rounded-xl" />;
	}

	const { subtasks, checklist, activity, comments, stage, parentStage } = data;
	const progress = Number(task.progressPercent) || 0;

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
