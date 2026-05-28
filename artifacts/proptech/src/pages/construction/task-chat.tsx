import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Circle,
	Clock,
	CornerDownLeft,
	MessageSquare,
	RotateCcw,
	Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const PRIORITY_COLORS: Record<string, string> = {
	low: "bg-gray-100 text-gray-600",
	medium: "bg-blue-100 text-blue-700",
	high: "bg-amber-100 text-amber-700",
	critical: "bg-rose-100 text-rose-700",
};
const PRIORITY_LABELS: Record<string, string> = {
	low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
const STATUS_ICONS: Record<string, React.ElementType> = {
	todo: Circle, in_progress: Clock, review: AlertCircle, done: CheckCircle2,
};
const STATUS_COLORS: Record<string, string> = {
	todo: "text-gray-400", in_progress: "text-blue-500", review: "text-amber-500", done: "text-emerald-500",
};
const STATUS_LABELS: Record<string, string> = {
	todo: "К выполнению", in_progress: "В работе", review: "На проверке", done: "Выполнено",
};

interface Task {
	id: number;
	title: string;
	description?: string;
	status: string;
	priority: string;
	assignedTo?: number | null;
	createdBy?: number | null;
	dueDate?: string | null;
	estimatedHours?: string | null;
	createdAt: string;
}
interface Comment {
	id: number;
	taskId: number;
	userId: number;
	content: string;
	commentType: string;
	createdAt: string;
}
interface ApiUser {
	id: number;
	firstName: string;
	lastName: string;
}

function userName(u?: ApiUser) {
	if (!u) return "Неизвестный";
	return `${u.firstName} ${u.lastName}`.trim();
}

function AvatarBubble({ name, size = 6 }: { name: string; size?: number }) {
	const colors = ["bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400", "bg-rose-400"];
	const idx = name.charCodeAt(0) % colors.length;
	return (
		<div className={`w-${size} h-${size} ${colors[idx]} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
			{name.charAt(0).toUpperCase()}
		</div>
	);
}

function ChatBubble({
	comment,
	user,
	isMe,
}: {
	comment: Comment;
	user?: ApiUser;
	isMe: boolean;
}) {
	const typeStyle: Record<string, string> = {
		message: "",
		result: "border-l-4 border-emerald-400 bg-emerald-50",
		return: "border-l-4 border-rose-400 bg-rose-50",
		status_change: "bg-gray-100 text-gray-500 text-xs italic",
	};

	const typeIcon: Record<string, string> = {
		result: "✅",
		return: "↩️",
		status_change: "⚙️",
	};

	const isSystem = comment.commentType === "status_change";

	if (isSystem) {
		return (
			<div className="flex justify-center my-2">
				<span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
					{typeIcon.status_change} {comment.content}
				</span>
			</div>
		);
	}

	const name = userName(user);

	return (
		<div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} items-end`}>
			<AvatarBubble name={name} size={7} />
			<div className={`max-w-[70%] space-y-0.5 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
				<span className={`text-[10px] text-gray-400 ${isMe ? "text-right" : "text-left"}`}>
					{name} · {new Date(comment.createdAt).toLocaleString("ru-KG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
				</span>
				<div className={`px-3 py-2 rounded-2xl text-sm ${
					isMe ? "bg-amber-500 text-white rounded-br-sm" : "bg-white border border-gray-200 rounded-bl-sm"
				} ${typeStyle[comment.commentType] || ""}`}>
					{typeIcon[comment.commentType] && <span className="mr-1">{typeIcon[comment.commentType]}</span>}
					{comment.content}
				</div>
			</div>
		</div>
	);
}

export default function TaskChat({ taskId }: { taskId: number }) {
	const [, navigate] = useLocation();
	const { user: me } = useAuth();
	const qc = useQueryClient();
	const { toast } = useToast();
	const bottomRef = useRef<HTMLDivElement>(null);
	const [text, setText] = useState("");
	const [sendType, setSendType] = useState<"message" | "result" | "return">("message");
	const [sending, setSending] = useState(false);

	const { data: task, isLoading: taskLoading } = useQuery<Task>({
		queryKey: ["construction-task", taskId],
		queryFn: () => api.get(`/construction/tasks/${taskId}`).then((r) => r.data),
	});

	const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
		queryKey: ["task-comments", taskId],
		queryFn: () => api.get(`/construction/tasks/${taskId}/comments`).then((r) => r.data),
		refetchInterval: 10000, // Poll every 10s
	});

	const { data: users = [] } = useQuery<ApiUser[]>({
		queryKey: ["users"],
		queryFn: () => api.get("/users").then((r) => Array.isArray(r.data) ? r.data : r.data?.data ?? []),
	});

	const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [comments]);

	const sendMessage = async () => {
		if (!text.trim()) return;
		setSending(true);
		try {
			await api.post(`/construction/tasks/${taskId}/comments`, {
				content: text.trim(),
				commentType: sendType,
			});
			setText("");
			setSendType("message");
			qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
			qc.invalidateQueries({ queryKey: ["construction-tasks"] });
		} catch {
			toast({ title: "Ошибка отправки", variant: "destructive" });
		} finally {
			setSending(false);
		}
	};

	if (taskLoading) return <Skeleton className="h-96 rounded-xl" />;
	if (!task) return <div className="text-center text-gray-400 py-16">Задача не найдена</div>;

	const StatusIcon = STATUS_ICONS[task.status] ?? Circle;
	const assignee = task.assignedTo ? userMap[task.assignedTo] : null;
	const creator = task.createdBy ? userMap[task.createdBy] : null;
	const isCreator = me?.id === task.createdBy;
	const isAssignee = me?.id === task.assignedTo;

	return (
		<div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
				<div className="flex items-start gap-3">
					<button
						onClick={() => navigate("/construction/tasks")}
						className="text-gray-400 hover:text-gray-700 mt-0.5"
					>
						<ArrowLeft className="w-4 h-4" />
					</button>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<StatusIcon className={`w-4 h-4 flex-shrink-0 ${STATUS_COLORS[task.status]}`} />
							<h1 className="font-semibold text-gray-900 truncate">{task.title}</h1>
							<Badge className={`text-[10px] ${PRIORITY_COLORS[task.priority] || ""}`} variant="secondary">
								{PRIORITY_LABELS[task.priority] || task.priority}
							</Badge>
							<Badge variant="outline" className="text-[10px]">
								{STATUS_LABELS[task.status] || task.status}
							</Badge>
						</div>
						{task.description && (
							<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
						)}
						<div className="flex gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
							{creator && <span>Создал: {userName(creator)}</span>}
							{assignee && <span>Исполнитель: {userName(assignee)}</span>}
							{task.dueDate && (
								<span className={new Date(task.dueDate) < new Date() && task.status !== "done" ? "text-rose-600" : ""}>
									Срок: {new Date(task.dueDate).toLocaleDateString("ru-KG")}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Chat messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
				{commentsLoading ? (
					<Skeleton className="h-32" />
				) : comments.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						<MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
						<p className="text-sm">Пока нет сообщений. Начните обсуждение.</p>
					</div>
				) : (
					comments.map((c) => (
						<ChatBubble
							key={c.id}
							comment={c}
							user={userMap[c.userId]}
							isMe={c.userId === me?.id}
						/>
					))
				)}
				<div ref={bottomRef} />
			</div>

			{/* Input area */}
			<div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
				{/* Message type selector */}
				<div className="flex gap-1.5 mb-2">
					{([
						{ type: "message", label: "Сообщение", icon: MessageSquare },
						{ type: "result", label: "Результат", icon: CheckCircle2, show: isAssignee },
						{ type: "return", label: "Вернуть", icon: RotateCcw, show: isCreator },
					]).filter((b) => b.show !== false).map((btn: { type: string; label: string; icon: React.ElementType; show?: boolean }) => {
						const Icon = btn.icon;
						return (
							<button
								key={btn.type}
								onClick={() => setSendType(btn.type as any)}
								className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
									sendType === btn.type
										? "bg-amber-500 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200"
								}`}
							>
								<Icon className="w-3 h-3" />
								{btn.label}
							</button>
						);
					})}
				</div>

				<div className="flex gap-2 items-end">
					<textarea
						className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-amber-300"
						placeholder={
							sendType === "result" ? "Опишите что сделано..."
							: sendType === "return" ? "Укажите что нужно доработать..."
							: "Написать сообщение..."
						}
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={1}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								sendMessage();
							}
						}}
					/>
					<Button
						onClick={sendMessage}
						disabled={!text.trim() || sending}
						className="bg-amber-500 hover:bg-orange-600 h-10 w-10 p-0 rounded-xl flex-shrink-0"
					>
						{sendType === "return" ? <CornerDownLeft className="w-4 h-4" /> : <Send className="w-4 h-4" />}
					</Button>
				</div>
				<p className="text-[10px] text-gray-400 mt-1">Enter — отправить · Shift+Enter — перенос строки</p>
			</div>
		</div>
	);
}
