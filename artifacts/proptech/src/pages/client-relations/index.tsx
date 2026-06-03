import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Newspaper, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/am/PageShell";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type Segment = {
	id: number;
	name: string;
	description?: string | null;
};

type Publication = {
	id: number;
	title: string;
	body: string;
	audience: string;
	isActive: boolean;
	publishedAt?: string;
};

type Appeal = {
	id: number;
	subject: string;
	message: string;
	status: string;
	response?: string | null;
	buyerName?: string | null;
	createdAt: string;
};

const appealStatus: Record<string, string> = {
	open: "Открыто",
	in_progress: "В работе",
	closed: "Закрыто",
};

export default function ClientRelationsPage() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [tab, setTab] = useState<"segments" | "publications" | "appeals">(
		"appeals",
	);

	const { data: segments = [] } = useQuery<Segment[]>({
		queryKey: ["client-segments"],
		queryFn: () => api.get("/client-relations/segments").then((r) => r.data),
	});
	const { data: publications = [] } = useQuery<Publication[]>({
		queryKey: ["client-publications"],
		queryFn: () => api.get("/client-relations/publications").then((r) => r.data),
	});
	const { data: appeals = [] } = useQuery<Appeal[]>({
		queryKey: ["client-appeals"],
		queryFn: () => api.get("/client-relations/appeals").then((r) => r.data),
	});

	const [segOpen, setSegOpen] = useState(false);
	const [segName, setSegName] = useState("");
	const [segDesc, setSegDesc] = useState("");

	const [pubOpen, setPubOpen] = useState(false);
	const [pubTitle, setPubTitle] = useState("");
	const [pubBody, setPubBody] = useState("");
	const [pubAudience, setPubAudience] = useState("all");

	const [replyId, setReplyId] = useState<number | null>(null);
	const [replyText, setReplyText] = useState("");
	const [replyStatus, setReplyStatus] = useState("closed");

	const createSeg = useMutation({
		mutationFn: () =>
			api.post("/client-relations/segments", {
				name: segName,
				description: segDesc || undefined,
			}),
		onSuccess: () => {
			toast({ title: "Сегмент создан" });
			setSegOpen(false);
			setSegName("");
			setSegDesc("");
			qc.invalidateQueries({ queryKey: ["client-segments"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const createPub = useMutation({
		mutationFn: () =>
			api.post("/client-relations/publications", {
				title: pubTitle,
				body: pubBody,
				audience: pubAudience,
			}),
		onSuccess: () => {
			toast({ title: "Публикация добавлена" });
			setPubOpen(false);
			setPubTitle("");
			setPubBody("");
			qc.invalidateQueries({ queryKey: ["client-publications"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const replyAppeal = useMutation({
		mutationFn: () =>
			api.patch(`/client-relations/appeals/${replyId}`, {
				response: replyText,
				status: replyStatus,
			}),
		onSuccess: () => {
			toast({ title: "Ответ сохранён" });
			setReplyId(null);
			setReplyText("");
			qc.invalidateQueries({ queryKey: ["client-appeals"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const deleteSeg = useMutation({
		mutationFn: (id: number) => api.delete(`/client-relations/segments/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["client-segments"] }),
	});

	const tabs = [
		{ id: "appeals" as const, label: "Обращения", icon: MessageSquare },
		{ id: "publications" as const, label: "Новости", icon: Newspaper },
		{ id: "segments" as const, label: "Сегменты", icon: Tags },
	];

	return (
		<PageShell.List
			title="Client Relations"
			subtitle="Сегменты покупателей, новости в портале и обращения из личного кабинета"
		>
			<div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
				{tabs.map((t) => {
					const Icon = t.icon;
					return (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className={cn(
								"inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
								tab === t.id
									? "bg-indigo-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200",
							)}
						>
							<Icon className="w-4 h-4" />
							{t.label}
						</button>
					);
				})}
			</div>

			{tab === "segments" && (
				<div className="space-y-4">
					<div className="flex justify-end">
						<Button className="gap-2" onClick={() => setSegOpen(true)}>
							<Plus className="w-4 h-4" /> Сегмент
						</Button>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{segments.map((s) => (
							<div
								key={s.id}
								className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div className="flex items-start justify-between gap-2">
									<p className="font-semibold text-gray-900">{s.name}</p>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-rose-600"
										onClick={() => deleteSeg.mutate(s.id)}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
								{s.description && (
									<p className="text-sm text-gray-500 mt-2">{s.description}</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{tab === "publications" && (
				<div className="space-y-4">
					<div className="flex justify-end">
						<Button className="gap-2" onClick={() => setPubOpen(true)}>
							<Plus className="w-4 h-4" /> Новость
						</Button>
					</div>
					<div className="space-y-3">
						{publications.map((p) => (
							<div
								key={p.id}
								className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div className="flex items-center gap-2 flex-wrap">
									<p className="font-semibold text-gray-900">{p.title}</p>
									<Badge variant="secondary">{p.audience}</Badge>
									{!p.isActive && (
										<Badge className="bg-gray-100 text-gray-600">Скрыта</Badge>
									)}
								</div>
								<p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
									{p.body}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{tab === "appeals" && (
				<div className="space-y-3">
					{appeals.length === 0 ? (
						<p className="text-sm text-gray-500 py-8 text-center">
							Обращений пока нет
						</p>
					) : (
						appeals.map((a) => (
							<div
								key={a.id}
								className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div className="flex flex-wrap items-center gap-2 justify-between">
									<div>
										<p className="font-semibold text-gray-900">{a.subject}</p>
										<p className="text-xs text-gray-500">
											{a.buyerName || "Покупатель"} ·{" "}
											{new Date(a.createdAt).toLocaleString("ru-KG")}
										</p>
									</div>
									<Badge variant="secondary">
										{appealStatus[a.status] || a.status}
									</Badge>
								</div>
								<p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
									{a.message}
								</p>
								{a.response && (
									<p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-3 mt-2">
										Ответ: {a.response}
									</p>
								)}
								<Button
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={() => {
										setReplyId(a.id);
										setReplyText(a.response || "");
										setReplyStatus(a.status === "open" ? "in_progress" : a.status);
									}}
								>
									Ответить
								</Button>
							</div>
						))
					)}
				</div>
			)}

			<Dialog open={segOpen} onOpenChange={setSegOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый сегмент</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Название</Label>
							<Input
								className="mt-1"
								value={segName}
								onChange={(e) => setSegName(e.target.value)}
							/>
						</div>
						<div>
							<Label>Описание</Label>
							<Textarea
								className="mt-1"
								value={segDesc}
								onChange={(e) => setSegDesc(e.target.value)}
							/>
						</div>
						<Button
							className="w-full"
							disabled={!segName.trim() || createSeg.isPending}
							onClick={() => createSeg.mutate()}
						>
							Сохранить
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={pubOpen} onOpenChange={setPubOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новость в портал</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Заголовок</Label>
							<Input
								className="mt-1"
								value={pubTitle}
								onChange={(e) => setPubTitle(e.target.value)}
							/>
						</div>
						<div>
							<Label>Текст</Label>
							<Textarea
								className="mt-1 min-h-[120px]"
								value={pubBody}
								onChange={(e) => setPubBody(e.target.value)}
							/>
						</div>
						<div>
							<Label>Аудитория</Label>
							<Select value={pubAudience} onValueChange={setPubAudience}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Все покупатели</SelectItem>
									<SelectItem value="segment">По сегменту</SelectItem>
									<SelectItem value="project">По проекту</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							className="w-full"
							disabled={
								!pubTitle.trim() || !pubBody.trim() || createPub.isPending
							}
							onClick={() => createPub.mutate()}
						>
							Опубликовать
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={replyId != null} onOpenChange={(o) => !o && setReplyId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ответ покупателю</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Статус</Label>
							<Select value={replyStatus} onValueChange={setReplyStatus}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="in_progress">В работе</SelectItem>
									<SelectItem value="closed">Закрыто</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Ответ</Label>
							<Textarea
								className="mt-1 min-h-[100px]"
								value={replyText}
								onChange={(e) => setReplyText(e.target.value)}
							/>
						</div>
						<Button
							className="w-full"
							disabled={!replyText.trim() || replyAppeal.isPending}
							onClick={() => replyAppeal.mutate()}
						>
							Сохранить
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</PageShell.List>
	);
}
