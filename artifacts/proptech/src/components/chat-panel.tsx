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

	const { data: conversations = [] } = useQuery<any[]>({
		queryKey: ["chat-conversations"],
		queryFn: () => api.get("/messages/conversations").then((r) => r.data),
		refetchInterval: open ? 5000 : 60000,
	});

	const { data: messages = [] } = useQuery<any[]>({
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
		await api.post("/messages", {
			toUserId: activeConv,
			content: message.trim(),
		});
		setMessage("");
		qc.invalidateQueries({ queryKey: ["chat-messages", activeConv] });
		qc.invalidateQueries({ queryKey: ["chat-conversations"] });
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
				className="relative w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
			>
				<MessageCircle className="w-[18px] h-[18px] text-gray-500" />
				{totalUnread > 0 && (
					<span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-600 text-white text-[9px] flex items-center justify-center rounded-full font-bold leading-none px-0.5">
						{totalUnread > 99 ? "99+" : totalUnread}
					</span>
				)}
			</button>

			{open && (
				<div
					className="absolute right-0 top-11 w-[440px] bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] flex flex-col"
					style={{ height: "520px" }}
				>
					{/* ── CONTACT INFO VIEW (counterparty without account) ── */}
					{activeContact && !showNewChat ? (
						<>
							<div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50 rounded-t-xl">
								<button
									onClick={goBack}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<ChevronLeft className="w-4 h-4 text-gray-500" />
								</button>
								<div
									className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
									style={{
										background: avatarColor(activeContact.id.charCodeAt(0)),
									}}
								>
									{getInitials({ fullName: activeContact.name })}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-gray-900">
										{activeContact.name}
									</p>
									<span
										className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeBadge[activeContact.type]}`}
									>
										{activeContact.sub}
									</span>
								</div>
								<button
									onClick={() => setOpen(false)}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<X className="w-4 h-4 text-gray-400" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto p-5">
								<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
									Контактные данные
								</h3>
								<div className="space-y-3">
									{activeContact.phone && (
										<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
											<div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
										<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
											<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
										<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
											<div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
											<div className="text-center py-8 text-gray-400">
												<User className="w-10 h-10 opacity-20 mx-auto mb-2" />
												<p className="text-sm">Нет контактных данных</p>
											</div>
										)}
								</div>

								{/* Note about portal access */}
								<div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
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
							<div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50 rounded-t-xl">
								<button
									onClick={goBack}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<ChevronLeft className="w-4 h-4 text-gray-500" />
								</button>
								<div
									className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
									style={{
										background: activeConv
											? avatarColor(activeConv)
											: "#4F46E5",
									}}
								>
									{getInitials(activeUser)}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-gray-900">
										{getUserName(activeUser)}
									</p>
									<p className="text-[10px] text-gray-400">
										{activeUser?.email}
									</p>
								</div>
								<button
									onClick={() => setOpen(false)}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<X className="w-4 h-4 text-gray-400" />
								</button>
							</div>
							<div className="flex-1 overflow-y-auto p-4 space-y-3">
								{messages.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-gray-400">
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
														<span className="text-[10px] text-gray-400">
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
															className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-700 rounded-bl-sm"}`}
														>
															{m.content}
														</div>
														<span className="text-[10px] text-gray-400 mt-0.5 px-1">
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
							<div className="p-3 border-t flex gap-2">
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
									className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition-colors"
								>
									<Send className="w-4 h-4" />
								</button>
							</div>
						</>
					) : showNewChat ? (
						// ── NEW CHAT ────────────────────────────────────────────────
						<>
							<div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50 rounded-t-xl">
								<button
									onClick={() => setShowNewChat(false)}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<ChevronLeft className="w-4 h-4 text-gray-500" />
								</button>
								<span className="text-sm font-semibold text-gray-900 flex-1">
									Новый чат
								</span>
								<button
									onClick={() => setOpen(false)}
									className="p-1 hover:bg-gray-200 rounded-lg"
								>
									<X className="w-4 h-4 text-gray-400" />
								</button>
							</div>

							{/* Tabs */}
							<div className="flex border-b">
								<button
									onClick={() => setContactTab("employees")}
									className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${contactTab === "employees" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
								>
									<User className="w-3.5 h-3.5" /> Сотрудники (
									{employeeContacts.length})
								</button>
								<button
									onClick={() => setContactTab("counterparties")}
									className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${contactTab === "counterparties" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
								>
									<Users className="w-3.5 h-3.5" /> Контрагенты (
									{counterpartyContacts.length})
								</button>
							</div>

							<div className="p-3 border-b">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
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
										<div className="text-center py-8 text-sm text-gray-400">
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
													<p className="text-xs text-gray-400">{c.email}</p>
												</div>
											</button>
										))
									)
								) : filteredCounterparties.length === 0 ? (
									<div className="text-center py-8 text-sm text-gray-400">
										Контрагенты не найдены
									</div>
								) : (
									filteredCounterparties.map((c) => (
										<button
											key={c.id}
											className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
											onClick={() => openContact(c)}
										>
											<div
												className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
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
														<span className="text-[10px] text-gray-400">
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
							<div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
								<span className="font-semibold text-gray-900 text-sm">
									Чаты
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowNewChat(true)}
										className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg"
									>
										<Plus className="w-3.5 h-3.5" /> Новый чат
									</button>
									<button
										onClick={() => setOpen(false)}
										className="p-1 hover:bg-gray-100 rounded-lg"
									>
										<X className="w-4 h-4 text-gray-400" />
									</button>
								</div>
							</div>
							<div className="p-3 border-b">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
									<Input
										className="pl-8 h-8 text-sm"
										placeholder="Поиск чата..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex-1 overflow-y-auto">
								{conversations.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
										<MessageCircle className="w-10 h-10 opacity-20" />
										<p className="text-sm">Нет диалогов</p>
										<button
											onClick={() => setShowNewChat(true)}
											className="text-xs text-blue-600 hover:underline mt-1"
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
												className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
											>
												<div className="relative flex-shrink-0">
													<div
														className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
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
															className={`text-sm ${c.unreadCount ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
														>
															{getUserName(c.partner)}
														</p>
														<span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
															{timeAgo(c.lastMessage?.createdAt)}
														</span>
													</div>
													<p className="text-xs text-gray-400 truncate mt-0.5">
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
