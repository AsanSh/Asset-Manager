import { Bot, FileText, Send, Trash2, Upload, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface Message {
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export default function AIChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [question, setQuestion] = useState("");
	const [documentText, setDocumentText] = useState("");
	const [documentName, setDocumentName] = useState("");
	const [loading, setLoading] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			setDocumentText(ev.target?.result as string);
			setDocumentName(file.name);
			toast.success(`Документ "${file.name}" загружен`);
		};
		reader.readAsText(file, "utf-8");
	};

	const sendMessage = async () => {
		if (!question.trim()) return;
		if (!documentText) {
			toast.error("Сначала загрузите тех.задание");
			return;
		}

		const userMsg: Message = {
			role: "user",
			content: question,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMsg]);
		setQuestion("");
		setLoading(true);

		try {
			const history = messages.map((m) => ({
				role: m.role,
				content: m.content,
			}));
			const { data } = await api.post("/ai/chat", {
				question,
				documentText,
				history,
			});
			const assistantMsg: Message = {
				role: "assistant",
				content: data.answer,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, assistantMsg]);
		} catch {
			toast.error("Ошибка AI-чата");
			setMessages((prev) => prev.slice(0, -1));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-[calc(100vh-120px)] gap-4 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">AI-Ассистент по ТЗ</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Задавайте вопросы по техническому заданию — AI отвечает строго по
						документу
					</p>
				</div>
				<div className="flex gap-2">
					<input
						ref={fileRef}
						type="file"
						accept=".txt,.md,.doc,.docx"
						className="hidden"
						onChange={handleFileUpload}
					/>
					<Button variant="outline" onClick={() => fileRef.current?.click()}>
						<Upload className="w-4 h-4 mr-2" />
						Загрузить ТЗ
					</Button>
					{messages.length > 0 && (
						<Button variant="ghost" onClick={() => setMessages([])}>
							<Trash2 className="w-4 h-4 mr-2" />
							Очистить
						</Button>
					)}
				</div>
			</div>

			{documentName && (
				<div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
					<FileText className="w-4 h-4 text-blue-600" />
					<span className="text-sm font-medium text-blue-700 dark:text-blue-300">
						{documentName}
					</span>
					<Badge variant="secondary" className="ml-auto text-xs">
						Документ загружен
					</Badge>
				</div>
			)}

			<Card className="flex-1 overflow-hidden">
				<ScrollArea className="h-full p-4">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-3">
							<Bot className="w-12 h-12 opacity-30" />
							<div>
								<p className="font-medium">
									Загрузите тех.задание и задайте вопрос
								</p>
								<p className="text-sm mt-1">
									AI ответит только на основе содержимого документа
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							{messages.map((msg, i) => (
								<div
									key={i}
									className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
									>
										{msg.role === "user" ? (
											<User className="w-4 h-4" />
										) : (
											<Bot className="w-4 h-4" />
										)}
									</div>
									<div
										className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}
									>
										<p className="whitespace-pre-wrap">{msg.content}</p>
										<p className={`text-xs mt-1 opacity-60`}>
											{msg.timestamp.toLocaleTimeString("ru-RU", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									</div>
								</div>
							))}
							{loading && (
								<div className="flex gap-3">
									<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
										<Bot className="w-4 h-4" />
									</div>
									<div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
										<div className="flex gap-1">
											<span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
											<span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
											<span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
										</div>
									</div>
								</div>
							)}
							<div ref={bottomRef} />
						</div>
					)}
				</ScrollArea>
			</Card>

			<div className="flex gap-2">
				<Textarea
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="Задайте вопрос по тех.заданию..."
					className="resize-none"
					rows={2}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							sendMessage();
						}
					}}
				/>
				<Button
					onClick={sendMessage}
					disabled={loading || !question.trim()}
					className="self-end px-6"
				>
					<Send className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
