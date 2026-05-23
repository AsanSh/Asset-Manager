import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	FileText,
	Pencil,
	PiggyBank,
	Plus,
	Receipt,
	RefreshCw,
	RotateCcw,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface LogEntry {
	id: number;
	type: string;
	description: string;
	entityType: string | null;
	entityId: number | null;
	userId: number | null;
	createdAt: string;
	module: string | null;
	actionType: string | null;
	snapshot: string | null;
	restoredAt: string | null;
}

const ACTION_CONFIG: Record<
	string,
	{
		label: string;
		icon: React.ElementType;
		color: string;
		bg: string;
		border: string;
	}
> = {
	create: {
		label: "Создание",
		icon: Plus,
		color: "text-emerald-700",
		bg: "bg-emerald-50",
		border: "border-emerald-200",
	},
	update: {
		label: "Изменение",
		icon: Pencil,
		color: "text-blue-700",
		bg: "bg-blue-50",
		border: "border-blue-200",
	},
	delete: {
		label: "Удаление",
		icon: Trash2,
		color: "text-rose-700",
		bg: "bg-rose-50",
		border: "border-rose-200",
	},
	restore: {
		label: "Восстановление",
		icon: RotateCcw,
		color: "text-indigo-700",
		bg: "bg-indigo-50",
		border: "border-indigo-200",
	},
	other: {
		label: "Действие",
		icon: CheckCircle2,
		color: "text-gray-600",
		bg: "bg-gray-50",
		border: "border-gray-200",
	},
};

const ENTITY_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType }
> = {
	payment: { label: "Платёж", icon: CreditCard },
	accrual: { label: "Начисление", icon: Receipt },
	deposit: { label: "Депозит", icon: PiggyBank },
	expense: { label: "Расход", icon: DollarSign },
	contract: { label: "Договор", icon: FileText },
	tenant: { label: "Арендатор", icon: Users },
	property: { label: "Объект", icon: FileText },
};

const MONTH_RU = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];

function fmtDate(s: string) {
	const d = new Date(s);
	return `${d.getDate()} ${MONTH_RU[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(s: string) {
	const d = new Date(s);
	return d.toLocaleTimeString("ru", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function groupByDate(
	entries: LogEntry[],
): { date: string; items: LogEntry[] }[] {
	const map = new Map<string, LogEntry[]>();
	for (const e of entries) {
		const key = fmtDate(e.createdAt);
		if (!map.has(key)) map.set(key, []);
		map.get(key)?.push(e);
	}
	return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function SnapshotViewer({ snapshot }: { snapshot: string }) {
	let data: any = {};
	try {
		data = JSON.parse(snapshot);
	} catch {
		return <p className="text-xs text-rose-600">Не удалось прочитать данные</p>;
	}
	return (
		<div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 max-h-48 overflow-y-auto">
			<table className="w-full text-xs">
				<tbody>
					{Object.entries(data)
						.filter(([, v]) => v !== null && v !== undefined)
						.map(([k, v]) => (
							<tr key={k} className="border-b border-gray-100 last:border-0">
								<td className="py-1 pr-3 text-gray-500 font-mono w-36">{k}</td>
								<td className="py-1 text-gray-800 font-medium">{String(v)}</td>
							</tr>
						))}
				</tbody>
			</table>
		</div>
	);
}

function LogRow({
	entry,
	onRestored,
}: {
	entry: LogEntry;
	onRestored: () => void;
}) {
	const { toast } = useToast();
	const [expanded, setExpanded] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const actionType = entry.actionType || "other";
	const ac = ACTION_CONFIG[actionType] || ACTION_CONFIG.other;
	const ActionIcon = ac.icon;
	const ec = ENTITY_CONFIG[entry.entityType || ""] || null;
	const EntityIcon = ec?.icon || FileText;
	const canRestore =
		(actionType === "delete" || actionType === "update") &&
		!!entry.snapshot &&
		!entry.restoredAt;

	async function doRestore() {
		setRestoring(true);
		try {
			await api.post(`/activity/${entry.id}/restore`);
			toast({ title: "Запись восстановлена", description: entry.description });
			setConfirmOpen(false);
			onRestored();
		} catch (e: any) {
			toast({
				title: "Ошибка восстановления",
				description: e?.response?.data?.error || "Неизвестная ошибка",
				variant: "destructive",
			});
		} finally {
			setRestoring(false);
		}
	}

	return (
		<>
			<div
				className={cn(
					"border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 transition-colors",
					entry.restoredAt ? "opacity-60" : "",
					actionType === "delete" ? "border-l-4 border-l-red-300" : "",
					actionType === "restore" ? "border-l-4 border-l-indigo-300" : "",
					actionType === "create" ? "border-l-4 border-l-green-300" : "",
				)}
			>
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
							ac.bg,
						)}
					>
						<ActionIcon className={cn("w-3.5 h-3.5", ac.color)} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							{ec && (
								<span className="flex items-center gap-1 text-xs text-gray-500">
									<EntityIcon className="w-3 h-3" /> {ec.label}
									{entry.entityId && (
										<span className="font-mono text-gray-400">
											#{entry.entityId}
										</span>
									)}
								</span>
							)}
							<Badge
								className={cn(
									"text-[10px] px-2 py-0 border",
									ac.color,
									ac.bg,
									ac.border,
								)}
							>
								{ac.label}
							</Badge>
							{entry.restoredAt && (
								<Badge className="text-[10px] px-2 py-0 border text-indigo-600 bg-indigo-50 border-indigo-200">
									Восстановлено
								</Badge>
							)}
						</div>
						<p className="text-sm text-gray-800 mt-0.5 leading-snug">
							{entry.description}
						</p>
						<div className="flex items-center gap-3 mt-1.5">
							<span className="text-xs text-gray-400 flex items-center gap-1">
								<Clock className="w-3 h-3" />
								{fmtTime(entry.createdAt)}
							</span>
							{entry.snapshot && (
								<button
									onClick={() => setExpanded((e) => !e)}
									className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors"
								>
									{expanded ? (
										<ChevronDown className="w-3 h-3" />
									) : (
										<ChevronRight className="w-3 h-3" />
									)}
									Данные записи
								</button>
							)}
						</div>
						{expanded && entry.snapshot && (
							<SnapshotViewer snapshot={entry.snapshot} />
						)}
					</div>
					<div className="flex gap-1.5 flex-shrink-0">
						{canRestore && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => setConfirmOpen(true)}
								className="h-7 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
							>
								<RotateCcw className="w-3 h-3" />
								{actionType === "delete" ? "Восстановить" : "Отменить действие"}
							</Button>
						)}
					</div>
				</div>
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<RotateCcw className="w-4 h-4 text-indigo-600" />
							{actionType === "delete"
								? "Восстановить запись?"
								: "Отменить это действие?"}
						</DialogTitle>
						<DialogDescription className="text-sm text-gray-500 pt-1">
							{entry.description}
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
						<AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
						<p className="text-xs text-amber-700">
							{actionType === "delete"
								? "Запись будет создана заново с новым ID. Связанные данные могут потребовать ручной проверки."
								: "Данные будут возвращены к состоянию до этого изменения."}
						</p>
					</div>
					<div className="flex gap-2 pt-1">
						<Button
							onClick={doRestore}
							disabled={restoring}
							className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1.5"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							{restoring
								? "Выполняем..."
								: actionType === "delete"
									? "Восстановить"
									: "Отменить действие"}
						</Button>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Закрыть
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function DateGroup({
	date,
	items,
	onRestored,
}: {
	date: string;
	items: LogEntry[];
	onRestored: () => void;
}) {
	const [open, setOpen] = useState(true);
	return (
		<div className="mb-4">
			<button
				onClick={() => setOpen((o) => !o)}
				className="flex items-center gap-2 mb-2 w-full group"
			>
				{open ? (
					<ChevronDown className="w-3.5 h-3.5 text-gray-400" />
				) : (
					<ChevronRight className="w-3.5 h-3.5 text-gray-400" />
				)}
				<span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
					{date}
				</span>
				<span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
					{items.length}
				</span>
				<div className="flex-1 h-px bg-gray-100 ml-1" />
			</button>
			{open && (
				<div className="space-y-2 ml-4">
					{items.map((e) => (
						<LogRow key={e.id} entry={e} onRestored={onRestored} />
					))}
				</div>
			)}
		</div>
	);
}

export default function RentalOperationsLog() {
	const qc = useQueryClient();
	const [entityType, setEntityType] = useState("all");
	const [actionType, setActionType] = useState("all");

	const {
		data: entries = [],
		isLoading,
		refetch,
	} = useQuery<LogEntry[]>({
		queryKey: ["rental-activity-log", entityType, actionType],
		queryFn: () => {
			const params = new URLSearchParams({ module: "rental", limit: "500" });
			if (entityType !== "all") params.set("entityType", entityType);
			if (actionType !== "all") params.set("actionType", actionType);
			return api.get(`/activity?${params}`).then((r) => r.data);
		},
	});

	const groups = groupByDate(entries);
	const deleteCount = entries.filter((e) => e.actionType === "delete").length;
	const restoreCount = entries.filter((e) => e.actionType === "restore").length;
	const restorableCount = entries.filter(
		(e) => e.actionType === "delete" && e.snapshot && !e.restoredAt,
	).length;

	function onRestored() {
		qc.invalidateQueries({ queryKey: ["rental-activity-log"] });
	}

	return (
		<div className="p-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-xl font-bold text-gray-900">Лог операций</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						История всех действий в модуле Аренды с возможностью восстановления
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => refetch()}
					className="gap-1.5"
				>
					<RefreshCw className="w-3.5 h-3.5" /> Обновить
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-3 mb-5">
				<div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
						<Clock className="w-4.5 h-4.5 text-gray-500" />
					</div>
					<div>
						<div className="text-2xl font-bold text-gray-900">
							{entries.length}
						</div>
						<div className="text-xs text-gray-500">Всего записей</div>
					</div>
				</div>
				<div className="rounded-xl border border-rose-100 bg-rose-50 p-4 flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
						<Trash2 className="w-4.5 h-4.5 text-rose-600" />
					</div>
					<div>
						<div className="text-2xl font-bold text-rose-700">
							{deleteCount}
						</div>
						<div className="text-xs text-rose-600">
							Удалений ({restorableCount} можно вернуть)
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
						<RotateCcw className="w-4.5 h-4.5 text-indigo-600" />
					</div>
					<div>
						<div className="text-2xl font-bold text-indigo-700">
							{restoreCount}
						</div>
						<div className="text-xs text-indigo-600">Восстановлений</div>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-3 mb-5">
				<Select value={actionType} onValueChange={setActionType}>
					<SelectTrigger className="w-44 h-8 text-sm">
						<SelectValue placeholder="Тип действия" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все действия</SelectItem>
						<SelectItem value="create">Создание</SelectItem>
						<SelectItem value="update">Изменение</SelectItem>
						<SelectItem value="delete">Удаление</SelectItem>
						<SelectItem value="restore">Восстановление</SelectItem>
					</SelectContent>
				</Select>
				<Select value={entityType} onValueChange={setEntityType}>
					<SelectTrigger className="w-44 h-8 text-sm">
						<SelectValue placeholder="Тип записи" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все типы</SelectItem>
						<SelectItem value="payment">Платежи</SelectItem>
						<SelectItem value="accrual">Начисления</SelectItem>
						<SelectItem value="deposit">Депозиты</SelectItem>
						<SelectItem value="expense">Расходы</SelectItem>
						<SelectItem value="contract">Договоры</SelectItem>
						<SelectItem value="tenant">Арендаторы</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Log */}
			{isLoading ? (
				<div className="text-center py-16 text-gray-400 text-sm">
					Загрузка...
				</div>
			) : groups.length === 0 ? (
				<div className="text-center py-16">
					<Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
					<p className="text-sm text-gray-400 font-medium">
						Нет записей в логе
					</p>
					<p className="text-xs text-gray-400 mt-1">
						Операции с данными будут отображаться здесь
					</p>
				</div>
			) : (
				<div>
					{groups.map((g) => (
						<DateGroup
							key={g.date}
							date={g.date}
							items={g.items}
							onRestored={onRestored}
						/>
					))}
				</div>
			)}
		</div>
	);
}
