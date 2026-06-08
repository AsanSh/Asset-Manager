import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	ChevronLeft,
	Mail,
	MessageCircle,
	Phone,
	Plus,
	Search,
	Send,
	Send as SendIcon,
	User,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function timeAgo(ts: string) {
	const diff = Date.now() - new Date(ts).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "только что";
	if (mins < 60) return `${mins} мин.`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} ч.`;
	return new Date(ts).toLocaleDateString("ru-KG", {
		day: "numeric",
		month: "short",
	});
}

function fullTime(ts: string) {
	return new Date(ts).toLocaleTimeString("ru-KG", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getUserName(u: any) {
	if (!u) return "Пользователь";
	const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
	return full || u.fullName || u.email || "Пользователь";
}

function getInitials(u: any) {
	if (!u) return "П";
	const fn = u.firstName || (u.fullName ? u.fullName.split(" ")[0] : "") || "";
	const ln = u.lastName || (u.fullName ? u.fullName.split(" ")[1] : "") || "";
	if (fn && ln) return fn[0] + ln[0];
	if (fn) return fn[0];
	if (u.email) return u.email[0].toUpperCase();
	return "П";
}

const AVATAR_COLORS = [
	"#4F46E5",
	"#0EA5E9",
	"#10B981",
	"#F59E0B",
	"#EF4444",
	"#8B5CF6",
	"#EC4899",
];
function avatarColor(id: number) {
	return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

type ContactType = "employee" | "tenant" | "investor" | "counterparty";

interface ContactInfo {
	id: string; // "user-{id}" | "tenant-{id}" | "investor-{id}" | "ct-{id}"
	userId?: number;
	name: string;
	sub: string;
	phone?: string;
	email?: string;
	telegram?: string;
	type: ContactType;
}

export default function ChatPanel() {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [activeConv, setActiveConv] = useState<number | null>(null);
	const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
	const [message, setMessage] = useState("");
	const [search, setSearch] = useState("");
	const [showNewChat, setShowNewChat] = useState(false);
	const [contactTab, setContactTab] = useState<"employees" | "counterparties">(
		"employees",
	);
	const panelRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const qc = useQueryClient();

	const {
		data: conversations = [],
		isError: conversationsError,
		isLoading: conversationsLoading,
	} = useQuery<any[]>({
		queryKey: ["chat-conversations"],
		queryFn: () => api.get("/messages/conversations").then((r) => r.data),
		refetchInterval: open ? 5000 : 60000,
	});

	const {
		data: messages = [],
		isError: messagesError,
		isLoading: messagesLoading,
	} = useQuery<any[]>({
		queryKey: ["chat-messages", activeConv],
		queryFn: () =>
			activeConv ? api.get(`/messages/${activeConv}`).then((r) => r.data) : [],
		enabled: !!activeConv,
		refetchInterval: activeConv ? 3000 : false,
	});

	const { data: companyUsers = [] } = useQuery<any[]>({
		queryKey: ["company-users"],
		queryFn: () => api.get("/users").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: ["rental-tenants"],
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});
	const { data: investors = [] } = useQuery<any[]>({
		queryKey: ["rental-investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});
	const { data: counterparties = [] } = useQuery<any[]>({
		queryKey: ["counterparties-list"],
		queryFn: () => api.get("/counterparties").then((r) => r.data),
	});

	const totalUnread = conversations.reduce(
		(s: number, c: any) => s + (c.unreadCount || 0),
		0,
	);
	const myId = (user as any)?.id;

	useEffect(() => {
		function onClick(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node))
				setOpen(false);
		}
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, []);

	useEffect(() => {
		if (messages.length > 0)
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		if (activeConv) qc.invalidateQueries({ queryKey: ["chat-conversations"] });
	}, [qc.invalidateQueries, activeConv]);

	async function sendMessage() {
		if (!message.trim() || !activeConv) return;
		try {
			await api.post("/messages", {
				toUserId: activeConv,
				content: message.trim(),
			});
			setMessage("");
			qc.invalidateQueries({ queryKey: ["chat-messages", activeConv] });
			qc.invalidateQueries({ queryKey: ["chat-conversations"] });
		} catch {
			toast.error("Сообщение не отправлено", {
				description: "Проверьте соединение с сервером и повторите попытку.",
			});
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	const activeUser = activeConv
		? companyUsers.find((u: any) => u.id === activeConv)
		: null;

	// Build contacts list for counterparties tab
	const counterpartyContacts: ContactInfo[] = [
		...tenants.map(
			(t: any): ContactInfo => ({
				id: `tenant-${t.id}`,
				name: t.fullName || t.name || "Арендатор",
				sub: "Арендатор",
				phone: t.phone,
				email: t.email,
				telegram: t.telegramId,
				type: "tenant",
			}),
		),
		...investors.map(
			(inv: any): ContactInfo => ({
				id: `investor-${inv.id}`,
				name: inv.fullName || inv.name || "Владелец",
				sub: "Владелец",
				phone: inv.phone,
				email: inv.email,
				telegram: inv.telegramId,
				type: "investor",
			}),
		),
		...counterparties
			.filter((c: any) => !tenants.find((t: any) => t.id === c.id))
			.map(
				(c: any): ContactInfo => ({
					id: `ct-${c.id}`,
					name: c.fullName || c.name || "Контрагент",
					sub: c.type === "company" ? "Юр. лицо" : "Физ. лицо",
					phone: c.phone,
					email: c.email,
					type: "counterparty",
				}),
			),
	];

	const employeeContacts: ContactInfo[] = companyUsers
		.filter((u: any) => u.id !== myId)
		.map(
			(u: any): ContactInfo => ({
				id: `user-${u.id}`,
				userId: u.id,
				name: getUserName(u),
				sub: u.role || "Сотрудник",
				email: u.email,
				type: "employee",
			}),
		);

	const q = search.toLowerCase();
	const filteredEmployees = q
		? employeeContacts.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.email?.toLowerCase().includes(q),
			)
		: employeeContacts;
	const filteredCounterparties = q
		? counterpartyContacts.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.phone?.includes(q) ||
					c.email?.toLowerCase().includes(q),
			)
		: counterpartyContacts;

	const typeIcon: Record<ContactType, React.ReactNode> = {
		employee: <User className="w-3.5 h-3.5" />,
		tenant: <Building2 className="w-3.5 h-3.5" />,
		investor: <Users className="w-3.5 h-3.5" />,
		counterparty: <User className="w-3.5 h-3.5" />,
	};

	const typeBadge: Record<ContactType, string> = {
		employee: "bg-blue-100 text-blue-700",
		tenant: "bg-emerald-100 text-emerald-700",
		investor: "bg-indigo-100 text-indigo-700",
		counterparty: "bg-gray-100 text-gray-700",
	};

	function openContact(c: ContactInfo) {
		if (c.userId) {
			setActiveConv(c.userId);
			setActiveContact(null);
		} else {
			setActiveContact(c);
		}
		setShowNewChat(false);
		setSearch("");
	}

	function goBack() {
		setActiveConv(null);
		setActiveContact(null);
	}

	return (
		<div ref={panelRef} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-slate-700 transition-colors hover:border-cyan-100 hover:bg-cyan-50"
				aria-label="Чаты"
			>
				<MessageCircle className="h-5 w-5" />
				{totalUnread > 0 && (
					<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-cyan-600 px-1 text-[10px] font-bold leading-none text-white">
						{totalUnread > 99 ? "99+" : totalUnread}
					</span>
				)}
			</button>

			{open && (
				<div
					className="absolute right-0 top-12 z-[9999] flex w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white/94 shadow-2xl shadow-slate-950/18 backdrop-blur-xl"
					style={{ height: "560px" }}
				>
					{/* ── CONTACT INFO VIEW (counterparty without account) ── */}
					{activeContact && !showNewChat ? (
						<>
							<div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-cyan-950 px-4 py-4 text-white">
								<button
									onClick={goBack}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<div
									className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white ring-1 ring-white/20"
									style={{
										background: avatarColor(activeContact.id.charCodeAt(0)),
									}}
								>
									{getInitials({ fullName: activeContact.name })}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-white">
										{activeContact.name}
									</p>
									<span
										className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-cyan-100"
									>
										{activeContact.sub}
									</span>
								</div>
								<button
									onClick={() => setOpen(false)}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto bg-slate-50/60 p-5">
								<h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
									Контактные данные
								</h3>
								<div className="space-y-3">
									{activeContact.phone && (
										<div className="flex items-center gap-3 rounded-3xl border border-white/80 bg-white/80 p-3 shadow-sm">
											<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
												<Phone className="w-4 h-4 text-emerald-600" />
											</div>
											<div className="flex-1">
												<p className="text-xs text-gray-500">Телефон</p>
												<p className="text-sm font-medium text-gray-900">
													{activeContact.phone}
												</p>
											</div>
											<a
												href={`tel:${activeContact.phone}`}
												className="text-xs text-emerald-600 hover:underline font-medium"
											>
												Позвонить
											</a>
										</div>
									)}
									{activeContact.email && (
										<div className="flex items-center gap-3 rounded-3xl border border-white/80 bg-white/80 p-3 shadow-sm">
											<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100">
												<Mail className="w-4 h-4 text-blue-600" />
											</div>
											<div className="flex-1">
												<p className="text-xs text-gray-500">Email</p>
												<p className="text-sm font-medium text-gray-900">
													{activeContact.email}
												</p>
											</div>
											<a
												href={`mailto:${activeContact.email}`}
												className="text-xs text-blue-600 hover:underline font-medium"
											>
												Написать
											</a>
										</div>
									)}
									{activeContact.telegram && (
										<div className="flex items-center gap-3 rounded-3xl border border-white/80 bg-white/80 p-3 shadow-sm">
											<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-100">
												<SendIcon className="w-4 h-4 text-sky-500" />
											</div>
											<div className="flex-1">
												<p className="text-xs text-gray-500">Telegram</p>
												<p className="text-sm font-medium text-gray-900">
													@{activeContact.telegram}
												</p>
											</div>
											<a
												href={`https://t.me/${activeContact.telegram}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-sky-600 hover:underline font-medium"
											>
												Открыть
											</a>
										</div>
									)}
									{!activeContact.phone &&
										!activeContact.email &&
										!activeContact.telegram && (
											<div className="text-center py-8 text-gray-600">
												<User className="w-10 h-10 opacity-20 mx-auto mb-2" />
												<p className="text-sm">Нет контактных данных</p>
											</div>
										)}
								</div>

								{/* Note about portal access */}
								<div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
									<p className="text-xs text-amber-700 font-medium">
										Портальный доступ
									</p>
									<p className="text-xs text-amber-600 mt-0.5">
										Этот контрагент пока не имеет доступа в систему. Вы можете
										создать для него учётную запись в настройках.
									</p>
								</div>
							</div>
						</>
					) : activeConv && !showNewChat ? (
						// ── CONVERSATION VIEW ──────────────────────────────────────
						<>
							<div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-cyan-950 px-4 py-4 text-white">
								<button
									onClick={goBack}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<div
									className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white ring-1 ring-white/20"
									style={{
										background: activeConv
											? avatarColor(activeConv)
											: "#4F46E5",
									}}
								>
									{getInitials(activeUser)}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-white">
										{getUserName(activeUser)}
									</p>
									<p className="text-[10px] text-white/55">
										{activeUser?.email}
									</p>
								</div>
								<button
									onClick={() => setOpen(false)}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
								{messagesLoading ? (
									<div className="flex h-full flex-col items-center justify-center text-slate-500">
										<div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
										<p className="text-sm">Загружаю переписку…</p>
									</div>
								) : messagesError ? (
									<div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
										<MessageCircle className="mb-2 h-9 w-9 text-amber-500" />
										<p className="text-sm font-semibold text-slate-900">Чат временно недоступен</p>
										<p className="mt-1 text-xs">Не удалось получить сообщения с сервера.</p>
									</div>
								) : messages.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-gray-600">
										<MessageCircle className="w-8 h-8 mb-2 opacity-30" />
										<p className="text-sm">Начните общение</p>
									</div>
								) : (
									messages.map((m: any, idx: number) => {
										const isMe = m.fromUserId === myId;
										const showDate =
											idx === 0 ||
											new Date(messages[idx - 1].createdAt).toDateString() !==
												new Date(m.createdAt).toDateString();
										return (
											<div key={m.id}>
												{showDate && (
													<div className="flex items-center gap-2 my-2">
														<div className="flex-1 h-px bg-gray-100" />
														<span className="text-[10px] text-gray-600">
															{new Date(m.createdAt).toLocaleDateString(
																"ru-KG",
																{ day: "numeric", month: "long" },
															)}
														</span>
														<div className="flex-1 h-px bg-gray-100" />
													</div>
												)}
												<div
													className={`flex ${isMe ? "justify-end" : "justify-start"}`}
												>
													<div
														className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}
													>
														<div
															className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${isMe ? "rounded-br-sm bg-gradient-to-br from-cyan-700 to-teal-600 text-white" : "rounded-bl-sm border border-white/80 bg-white text-slate-700"}`}
														>
															{m.content}
														</div>
														<span className="text-[10px] text-gray-600 mt-0.5 px-1">
															{fullTime(m.createdAt)}
														</span>
													</div>
												</div>
											</div>
										);
									})
								)}
								<div ref={messagesEndRef} />
							</div>
							<div className="flex gap-2 border-t border-slate-100 bg-white/90 p-3">
								<Input
									className="flex-1 text-sm h-9"
									placeholder="Написать сообщение..."
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									onKeyDown={handleKeyDown}
								/>
								<button
									onClick={sendMessage}
									disabled={!message.trim()}
									className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-700 to-teal-600 text-white shadow-lg shadow-cyan-950/16 transition-colors hover:from-cyan-600 hover:to-teal-500 disabled:bg-none disabled:bg-slate-200 disabled:shadow-none"
								>
									<Send className="w-4 h-4" />
								</button>
							</div>
						</>
					) : showNewChat ? (
						// ── NEW CHAT ────────────────────────────────────────────────
						<>
							<div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-cyan-950 px-4 py-4 text-white">
								<button
									onClick={() => setShowNewChat(false)}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="flex-1 text-sm font-semibold text-white">
									Новый чат
								</span>
								<button
									onClick={() => setOpen(false)}
									className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Tabs */}
							<div className="flex border-b border-slate-100 bg-white/80 p-1">
								<button
									onClick={() => setContactTab("employees")}
									className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-semibold transition-colors ${contactTab === "employees" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
								>
									<User className="w-3.5 h-3.5" /> Сотрудники (
									{employeeContacts.length})
								</button>
								<button
									onClick={() => setContactTab("counterparties")}
									className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-semibold transition-colors ${contactTab === "counterparties" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
								>
									<Users className="w-3.5 h-3.5" /> Контрагенты (
									{counterpartyContacts.length})
								</button>
							</div>

							<div className="p-3 border-b">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-600" />
									<Input
										className="pl-8 h-8 text-sm"
										placeholder={
											contactTab === "employees"
												? "Поиск сотрудника..."
												: "Поиск контрагента..."
										}
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										autoFocus
									/>
								</div>
							</div>

							<div className="flex-1 overflow-y-auto">
								{contactTab === "employees" ? (
									filteredEmployees.length === 0 ? (
										<div className="text-center py-8 text-sm text-gray-600">
											Сотрудники не найдены
										</div>
									) : (
										filteredEmployees.map((c) => (
											<button
												key={c.id}
												className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
												onClick={() => openContact(c)}
											>
												<div
													className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
													style={{ background: avatarColor(c.userId || 0) }}
												>
													{getInitials({ fullName: c.name })}
												</div>
												<div className="flex-1">
													<p className="text-sm font-medium text-gray-900">
														{c.name}
													</p>
													<p className="text-xs text-gray-600">{c.email}</p>
												</div>
											</button>
										))
									)
								) : filteredCounterparties.length === 0 ? (
									<div className="py-8 text-center text-sm text-slate-500">
										Контрагенты не найдены
									</div>
								) : (
									filteredCounterparties.map((c) => (
										<button
											key={c.id}
											className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cyan-50/70"
											onClick={() => openContact(c)}
										>
											<div
												className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white"
												style={{
													background: avatarColor(
														c.id.charCodeAt(0) + c.id.length,
													),
												}}
											>
												{getInitials({ fullName: c.name })}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 truncate">
													{c.name}
												</p>
												<div className="flex items-center gap-1 mt-0.5">
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${typeBadge[c.type]}`}
													>
														{typeIcon[c.type]} {c.sub}
													</span>
													{c.phone && (
														<span className="text-[10px] text-gray-600">
															{c.phone}
														</span>
													)}
												</div>
											</div>
										</button>
									))
								)}
							</div>
						</>
					) : (
						// ── CONVERSATIONS LIST ─────────────────────────────────────
						<>
							<div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-cyan-950 px-4 py-4 text-white">
								<div>
									<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
										Коммуникации
									</p>
									<span className="mt-1 block text-lg font-bold">Чаты</span>
								</div>
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowNewChat(true)}
										className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/18"
									>
										<Plus className="w-3.5 h-3.5" /> Новый чат
									</button>
									<button
										onClick={() => setOpen(false)}
										className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
							<div className="border-b border-slate-100 bg-white/80 p-3">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-600" />
									<Input
										className="pl-8 h-8 text-sm"
										placeholder="Поиск чата..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex-1 overflow-y-auto bg-slate-50/60">
								{conversationsLoading ? (
									<div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
										<div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
										<p className="text-sm font-medium">Загружаю диалоги…</p>
									</div>
								) : conversationsError ? (
									<div className="flex h-full flex-col items-center justify-center px-8 text-center text-slate-500">
										<MessageCircle className="mb-3 h-10 w-10 text-amber-500" />
										<p className="text-sm font-semibold text-slate-900">Чаты временно недоступны</p>
										<p className="mt-1 text-xs">Сервер сообщений не ответил. Остальной интерфейс продолжает работать.</p>
									</div>
								) : conversations.length === 0 ? (
									<div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-slate-500">
										<div className="grid h-16 w-16 place-items-center rounded-[28px] border border-cyan-100 bg-cyan-50 text-cyan-700">
											<MessageCircle className="h-7 w-7" />
										</div>
										<p className="text-sm font-semibold text-slate-900">Диалогов пока нет</p>
										<p className="max-w-xs text-xs text-slate-500">
											Начните чат с сотрудником или откройте карточку контрагента.
										</p>
										<button
											onClick={() => setShowNewChat(true)}
											className="mt-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-950"
										>
											Начать новый чат
										</button>
									</div>
								) : (
									conversations
										.filter(
											(c: any) =>
												!search ||
												getUserName(c.partner)
													.toLowerCase()
													.includes(search.toLowerCase()),
										)
										.map((c: any) => (
											<button
												key={c.partnerId}
												onClick={() => {
													setActiveConv(c.partnerId);
													setSearch("");
												}}
												className="flex w-full items-center gap-3 border-b border-white/80 bg-white/54 px-4 py-3 text-left transition-colors last:border-0 hover:bg-cyan-50/80"
											>
												<div className="relative flex-shrink-0">
													<div
														className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white"
														style={{ background: avatarColor(c.partnerId) }}
													>
														{getInitials(c.partner)}
													</div>
													{c.unreadCount > 0 && (
														<span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-600 text-white text-[9px] flex items-center justify-center rounded-full font-bold px-0.5">
															{c.unreadCount}
														</span>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between">
														<p
															className={`truncate text-sm ${c.unreadCount ? "font-semibold text-slate-950" : "font-medium text-slate-700"}`}
														>
															{getUserName(c.partner)}
														</p>
														<span className="ml-2 flex-shrink-0 text-[10px] text-slate-400">
															{timeAgo(c.lastMessage?.createdAt)}
														</span>
													</div>
													<p className="mt-0.5 truncate text-xs text-slate-500">
														{c.lastMessage?.fromUserId === myId ? "Вы: " : ""}
														{c.lastMessage?.content}
													</p>
												</div>
											</button>
										))
								)}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
