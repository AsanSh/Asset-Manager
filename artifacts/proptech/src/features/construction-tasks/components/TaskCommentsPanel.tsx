import { useQueryClient } from "@tanstack/react-query";
import {
	Paperclip,
	Reply,
	CheckCircle2,
	CornerDownLeft,
	MessageSquare,
	RotateCcw,
	Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { taskKeys } from "../api";
import type { TaskComment, ConstructionTaskRow } from "../types";

function userName(u?: { firstName: string; lastName: string }) {
	if (!u) return "Неизвестный";
	return `${u.firstName} ${u.lastName}`.trim();
}

function ChatBubble({
	comment,
	replyTarget,
	user,
	isMe,
	onReply,
}: {
	comment: TaskComment;
	replyTarget?: TaskComment;
	user?: { firstName: string; lastName: string };
	isMe: boolean;
	onReply: (comment: TaskComment) => void;
}) {
	if (comment.commentType === "status_change") {
		return (
			<div className="flex justify-center my-2">
				<span className="text-[11px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
					{comment.content}
				</span>
			</div>
		);
	}

	const name = userName(user);
	return (
		<div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} items-end`}>
			<div
				className={`w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
			>
				{name.charAt(0).toUpperCase()}
			</div>
			<div className={`max-w-[85%] ${isMe ? "text-right" : ""}`}>
				<span className="text-[10px] text-gray-600 block mb-0.5">{name}</span>
				{replyTarget && (
					<div className="text-[10px] text-gray-500 mb-1">
						↳ Ответ на: {replyTarget.content.slice(0, 60)}
					</div>
				)}
				<div
					className={`px-3 py-2 rounded-2xl text-sm inline-block ${
						isMe
							? "bg-amber-500 text-white rounded-br-sm"
							: "bg-white border border-gray-200 rounded-bl-sm"
					}`}
				>
					{comment.content}
				</div>
				<div className={`mt-1 ${isMe ? "text-right" : "text-left"}`}>
					<button
						type="button"
						className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-700"
						onClick={() => onReply(comment)}
					>
						<Reply className="w-3 h-3" />
						Ответить
					</button>
				</div>
			</div>
		</div>
	);
}

export function TaskCommentsPanel({
	task,
	comments,
	currentUserId,
	userMap,
}: {
	task: ConstructionTaskRow;
	comments: TaskComment[];
	currentUserId?: number;
	userMap: Record<number, { firstName: string; lastName: string }>;
}) {
	const qc = useQueryClient();
	const { toast } = useToast();
	const bottomRef = useRef<HTMLDivElement>(null);
	const [text, setText] = useState("");
	const [sendType, setSendType] = useState<"message" | "result" | "return">("message");
	const [sending, setSending] = useState(false);
	const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
	const [files, setFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isCreator = currentUserId != null && Number(task.createdBy) === currentUserId;
	const isAssignee =
		currentUserId != null && Number(task.assignedTo) === currentUserId;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [comments]);

	const extractMentionIdsFromText = (value: string): number[] => {
		const names = Object.entries(userMap).map(([id, u]) => ({
			id: Number(id),
			full: `${u.firstName} ${u.lastName}`.trim().toLowerCase(),
			first: u.firstName.toLowerCase(),
			last: u.lastName.toLowerCase(),
		}));
		const mentionMatches = Array.from(value.matchAll(/@([\p{L}\d_.\- ]{2,60})/gu));
		const ids = new Set<number>();
		for (const m of mentionMatches) {
			const token = m[1].trim().toLowerCase();
			const hit = names.find(
				(n) => n.full === token || n.first === token || n.last === token,
			);
			if (hit) ids.add(hit.id);
		}
		return Array.from(ids);
	};

	const fileToBase64 = async (file: File): Promise<string> =>
		new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				resolve(result.includes(",") ? result.split(",")[1] : result);
			};
			reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
			reader.readAsDataURL(file);
		});

	const sendMessage = async () => {
		if (!text.trim()) return;
		setSending(true);
		try {
			const mentionIds = extractMentionIdsFromText(text);
			const attachmentPayload = await Promise.all(
				files.slice(0, 5).map(async (f) => ({
					fileName: f.name,
					mimeType: f.type || "application/octet-stream",
					base64: await fileToBase64(f),
				})),
			);
			await api.post(`/construction/tasks/${task.id}/comments`, {
				content: text.trim(),
				commentType: sendType,
				parentCommentId: replyTo?.id ?? null,
				mentions: mentionIds,
				attachments: attachmentPayload,
			});
			setText("");
			setSendType("message");
			setReplyTo(null);
			setFiles([]);
			if (fileInputRef.current) fileInputRef.current.value = "";
			qc.invalidateQueries({ queryKey: taskKeys.full(task.id) });
			qc.invalidateQueries({ queryKey: taskKeys.all });
		} catch {
			toast({ title: "Ошибка отправки", variant: "destructive" });
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="flex flex-col h-full min-h-[320px]">
			<div className="flex-1 overflow-y-auto space-y-3 p-1">
				{comments.length === 0 ? (
					<div className="text-center py-8 text-gray-600">
						<MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
						<p className="text-sm">Нет сообщений</p>
					</div>
				) : (
					comments.map((c) => (
						<ChatBubble
							key={c.id}
							comment={c}
							replyTarget={
								c.parentCommentId
									? comments.find((r) => r.id === c.parentCommentId)
									: undefined
							}
							user={userMap[c.userId]}
							isMe={c.userId === currentUserId}
							onReply={setReplyTo}
						/>
					))
				)}
				<div ref={bottomRef} />
			</div>
			<div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
				<div className="flex gap-1 flex-wrap">
					{(
						[
							{ type: "message" as const, label: "Сообщение", icon: MessageSquare },
							{ type: "result" as const, label: "Результат", icon: CheckCircle2, show: isAssignee },
							{ type: "return" as const, label: "Вернуть", icon: RotateCcw, show: isCreator },
						] as const
					)
							.filter((b) => !("show" in b) || b.show !== false)
						.map((btn) => {
							const Icon = btn.icon;
							return (
								<button
									key={btn.type}
									type="button"
									onClick={() => setSendType(btn.type)}
									className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
										sendType === btn.type
											? "bg-amber-500 text-white"
											: "bg-gray-100 text-gray-600"
									}`}
								>
									<Icon className="w-3 h-3" />
									{btn.label}
								</button>
							);
						})}
				</div>
				<div className="flex gap-2 items-end">
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept=".pdf,.dwg,.xlsx,.xls,.docx,.doc,image/*"
						className="hidden"
						onChange={(e) => {
							const picked = Array.from(e.target.files ?? []);
							setFiles((prev) => [...prev, ...picked].slice(0, 5));
						}}
					/>
					<textarea
						className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-300"
						placeholder="Комментарий..."
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={2}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								void sendMessage();
							}
						}}
					/>
					<Button
						type="button"
						variant="outline"
						className="h-10 w-10 p-0 rounded-xl"
						onClick={() => fileInputRef.current?.click()}
					>
						<Paperclip className="w-4 h-4" />
					</Button>
					<Button
						type="button"
						onClick={() => void sendMessage()}
						disabled={!text.trim() || sending}
						className="bg-amber-500 hover:bg-orange-600 h-10 w-10 p-0 rounded-xl"
					>
						{sendType === "return" ? (
							<CornerDownLeft className="w-4 h-4" />
						) : (
							<Send className="w-4 h-4" />
						)}
					</Button>
				</div>
				{replyTo && (
					<div className="text-[11px] text-gray-500">
						Ответ на: {replyTo.content.slice(0, 80)}{" "}
						<button
							type="button"
							className="text-amber-600 hover:underline"
							onClick={() => setReplyTo(null)}
						>
							Отменить
						</button>
					</div>
				)}
				{files.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{files.map((f, idx) => (
							<Badge key={`${f.name}-${idx}`} variant="secondary" className="text-[10px]">
								{f.name}
							</Badge>
						))}
					</div>
				)}
				<p className="text-[10px] text-gray-600">
					Поддержка @упоминаний: используйте формат @Имя Фамилия
				</p>
			</div>
		</div>
	);
}
