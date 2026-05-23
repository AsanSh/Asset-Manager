import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Bell,
	CheckCheck,
	CheckCircle,
	CreditCard,
	FileText,
	Info,
	X,
} from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";

function timeAgo(ts: string) {
	const diff = Date.now() - new Date(ts).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "только что";
	if (mins < 60) return `${mins} мин. назад`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} ч. назад`;
	const days = Math.floor(hrs / 24);
	return `${days} дн. назад`;
}

const typeConfig: Record<
	string,
	{ icon: ReactElement; color: string; bg: string }
> = {
	info: {
		icon: <Info className="w-4 h-4" />,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	success: {
		icon: <CheckCircle className="w-4 h-4" />,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	warning: {
		icon: <AlertTriangle className="w-4 h-4" />,
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
	error: {
		icon: <AlertTriangle className="w-4 h-4" />,
		color: "text-rose-600",
		bg: "bg-rose-50",
	},
	payment: {
		icon: <CreditCard className="w-4 h-4" />,
		color: "text-indigo-600",
		bg: "bg-indigo-50",
	},
	contract: {
		icon: <FileText className="w-4 h-4" />,
		color: "text-teal-600",
		bg: "bg-teal-50",
	},
	overdue: {
		icon: <AlertTriangle className="w-4 h-4" />,
		color: "text-rose-600",
		bg: "bg-rose-50",
	},
};

export default function NotificationsPanel() {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<"all" | "unread">("all");
	const panelRef = useRef<HTMLDivElement>(null);
	const qc = useQueryClient();
	const [, navigate] = useLocation();

	const { data: notifications = [] } = useQuery<any[]>({
		queryKey: ["notifications"],
		queryFn: () => api.get("/notifications").then((r) => r.data),
		refetchInterval: open ? 10000 : 60000,
	});

	const unread = notifications.filter((n) => !n.isRead);

	useEffect(() => {
		function onClick(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node))
				setOpen(false);
		}
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, []);

	async function markRead(id: number) {
		await api.patch(`/notifications/${id}/read`, {});
		qc.invalidateQueries({ queryKey: ["notifications"] });
	}

	async function markAllRead() {
		await api.post("/notifications/read-all", {});
		qc.invalidateQueries({ queryKey: ["notifications"] });
	}

	async function deleteNotif(id: number) {
		await api.delete(`/notifications/${id}`);
		qc.invalidateQueries({ queryKey: ["notifications"] });
	}

	function handleClick(n: any) {
		if (!n.isRead) markRead(n.id);
		if (n.link) {
			navigate(n.link);
			setOpen(false);
		}
	}

	const displayed = tab === "unread" ? unread : notifications;
	const cfg = (type: string) => typeConfig[type] || typeConfig.info;

	return (
		<div ref={panelRef} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="relative w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
			>
				<Bell className="w-[18px] h-[18px] text-gray-500" />
				{unread.length > 0 && (
					<span className="absolute top-1 right-1 min-w-[16px] h-4 bg-rose-600 text-white text-[9px] flex items-center justify-center rounded-full font-bold leading-none px-0.5">
						{unread.length > 99 ? "99+" : unread.length}
					</span>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-11 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-[1000] flex flex-col max-h-[520px]">
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-3 border-b">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-gray-900 text-sm">
								Уведомления
							</span>
							{unread.length > 0 && (
								<span className="bg-rose-100 text-rose-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
									{unread.length}
								</span>
							)}
						</div>
						<div className="flex items-center gap-1">
							{unread.length > 0 && (
								<button
									onClick={markAllRead}
									className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded-lg"
								>
									<CheckCheck className="w-3.5 h-3.5" /> Прочитать все
								</button>
							)}
							<button
								onClick={() => setOpen(false)}
								className="p-1 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-400" />
							</button>
						</div>
					</div>

					{/* Tabs */}
					<div className="flex border-b">
						{[
							["all", "Все"],
							["unread", "Непрочитанные"],
						].map(([key, label]) => (
							<button
								key={key}
								onClick={() => setTab(key as any)}
								className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === key ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
							>
								{label}
								{key === "unread" && unread.length > 0 && (
									<span className="ml-1 bg-rose-100 text-rose-600 text-[10px] px-1.5 rounded-full">
										{unread.length}
									</span>
								)}
							</button>
						))}
					</div>

					{/* List */}
					<div className="overflow-y-auto flex-1">
						{displayed.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-gray-400">
								<Bell className="w-8 h-8 mb-2 opacity-30" />
								<p className="text-sm">
									{tab === "unread" ? "Нет непрочитанных" : "Нет уведомлений"}
								</p>
							</div>
						) : (
							displayed.map((n: any) => {
								const c = cfg(n.type);
								return (
									<div
										key={n.id}
										onClick={() => handleClick(n)}
										className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.isRead ? "bg-blue-50/30" : ""}`}
									>
										<div
											className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${c.bg} ${c.color}`}
										>
											{c.icon}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-1">
												<p
													className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
												>
													{n.title}
												</p>
												<button
													onClick={(e) => {
														e.stopPropagation();
														deleteNotif(n.id);
													}}
													className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 ml-1"
												>
													<X className="w-3 h-3 text-gray-400" />
												</button>
											</div>
											{n.body && (
												<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
													{n.body}
												</p>
											)}
											<div className="flex items-center gap-2 mt-1">
												<span className="text-[10px] text-gray-400">
													{timeAgo(n.createdAt)}
												</span>
												{!n.isRead && (
													<span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
												)}
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
