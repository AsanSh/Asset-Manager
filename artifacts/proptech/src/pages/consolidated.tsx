import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const MODULE_LABELS: Record<string, string> = {
	arenda: "Аренда",
	kontrol: "Контроль строительства",
	zakup: "Закуп",
	crm: "CRM / Продажи",
};

const OP_LABELS: Record<string, string> = {
	income: "Доход",
	expense: "Расход",
	payment: "Оплата",
	contract: "Договор",
	accrual: "Начисление",
	area_change: "Изменение площади",
};

const MODULE_COLORS: Record<string, string> = {
	arenda: "bg-blue-100 text-blue-800",
	kontrol: "bg-amber-100 text-amber-800",
	zakup: "bg-purple-100 text-purple-800",
	crm: "bg-emerald-100 text-emerald-800",
};

const OP_COLORS: Record<string, string> = {
	income: "text-emerald-700",
	expense: "text-rose-700",
	payment: "text-emerald-700",
	contract: "text-blue-700",
	accrual: "text-gray-700",
	area_change: "text-amber-700",
};

interface LogRow {
	id: number;
	module: string;
	operationType: string;
	amount?: string | null;
	currency?: string;
	counterpartyName?: string;
	description?: string;
	sourceTable?: string;
	operationDate?: string;
	createdAt: string;
}

function fmtAmt(amount?: string | null, currency?: string) {
	if (!amount) return "—";
	const n = parseFloat(amount);
	if (isNaN(n)) return "—";
	const sign = n > 0 ? "+" : "";
	return `${sign}${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} ${currency || "KGS"}`;
}

interface CpRow {
	id: number;
	fullName: string;
	categories?: string[] | null;
}

export default function ConsolidatedModule() {
	const [moduleFilter, setModuleFilter] = useState("all");
	const [counterpartyFilter, setCounterpartyFilter] = useState<string>("all");
	const [counterpartySearch, setCounterpartySearch] = useState("");
	const [opTypeFilter, setOpTypeFilter] = useState("all");

	const { data: logs = [], isLoading } = useQuery<LogRow[]>({
		queryKey: ["consolidated-logs", moduleFilter],
		queryFn: () =>
			api.get("/construction/consolidated", {
				params: {
					...(moduleFilter !== "all" ? { module: moduleFilter } : {}),
					limit: "500",
				},
			}).then((r) => r.data),
		refetchInterval: 30000,
	});

	const { data: counterparties = [] } = useQuery<CpRow[]>({
		queryKey: ["counterparties", "all"],
		queryFn: () => api.get("/counterparties").then((r) => r.data),
	});

	const cpMap = useMemo(
		() => Object.fromEntries(counterparties.map((c) => [c.id, c.fullName])),
		[counterparties],
	);

	const filtered = useMemo(() => {
		return logs.filter((r) => {
			if (opTypeFilter !== "all" && r.operationType !== opTypeFilter) return false;
			if (counterpartyFilter !== "all") {
				const targetName = cpMap[Number(counterpartyFilter)];
				if (!targetName) return false;
				if (r.counterpartyName !== targetName && String((r as any).counterpartyId) !== counterpartyFilter) return false;
			}
			if (counterpartySearch && !r.counterpartyName?.toLowerCase().includes(counterpartySearch.toLowerCase())) return false;
			return true;
		});
	}, [logs, opTypeFilter, counterpartySearch, counterpartyFilter, cpMap]);

	const totals = useMemo(() => {
		const income = filtered
			.filter((r) => ["income", "payment"].includes(r.operationType))
			.reduce((s, r) => s + (parseFloat(r.amount || "0") || 0), 0);
		const expense = filtered
			.filter((r) => r.operationType === "expense")
			.reduce((s, r) => s + (parseFloat(r.amount || "0") || 0), 0);
		return { income, expense, net: income - expense };
	}, [filtered]);

	const columns = useMemo<ColumnDef<LogRow, unknown>[]>(
		() => [
			{
				id: "date",
				header: "Дата",
				size: 100,
				accessorFn: (row) => row.operationDate || row.createdAt,
				meta: { exportLabel: "Дата", pinned: "left" },
				cell: ({ row }) => {
					const d = row.original.operationDate || row.original.createdAt;
					return d ? new Date(d).toLocaleDateString("ru-KG") : "—";
				},
			},
			{
				id: "module",
				header: "Модуль",
				size: 130,
				accessorKey: "module",
				meta: { exportLabel: "Модуль" },
				cell: ({ row }) => (
					<span
						className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${MODULE_COLORS[row.original.module] || "bg-gray-100 text-gray-600"}`}
					>
						{MODULE_LABELS[row.original.module] || row.original.module}
					</span>
				),
			},
			{
				id: "operationType",
				header: "Тип",
				size: 110,
				accessorKey: "operationType",
				meta: { exportLabel: "Тип" },
				cell: ({ row }) =>
					OP_LABELS[row.original.operationType] || row.original.operationType,
			},
			{
				id: "counterparty",
				header: "Контрагент",
				size: 160,
				minSize: 120,
				maxSize: 320,
				accessorFn: (row) => row.counterpartyName || "",
				meta: { exportLabel: "Контрагент", grow: true },
				cell: ({ row }) => row.original.counterpartyName || "—",
			},
			{
				id: "description",
				header: "Описание",
				size: 200,
				minSize: 120,
				maxSize: 400,
				accessorFn: (row) => row.description || "",
				meta: { exportLabel: "Описание", grow: true },
				cell: ({ row }) => (
					<span className="truncate block" title={row.original.description || undefined}>
						{row.original.description || "—"}
					</span>
				),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 120,
				accessorFn: (row) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма", align: "right", financeAmount: true, pinned: "right" },
				cell: ({ row }) => (
					<span
						className={`tabular-nums font-medium ${OP_COLORS[row.original.operationType] || "text-gray-700"}`}
					>
						{fmtAmt(row.original.amount, row.original.currency)}
					</span>
				),
			},
		],
		[],
	);

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Сводное</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Все операции из всех модулей · только просмотр
					</p>
				</div>
				<div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5">
					🔒 Режим только для чтения
				</div>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-3 gap-4">
				{[
					{ label: "Поступления", value: totals.income, color: "text-emerald-700" },
					{ label: "Расходы", value: totals.expense, color: "text-rose-700" },
					{ label: "Чистый итог", value: totals.net, color: totals.net >= 0 ? "text-emerald-700" : "text-rose-700" },
				].map((kpi) => (
					<div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
						<p className="text-xs text-gray-500">{kpi.label}</p>
						<p className={`text-xl font-bold mt-1 ${kpi.color}`}>
							{new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(kpi.value)} сом
						</p>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="flex gap-3 flex-wrap items-center">
				<Select value={moduleFilter} onValueChange={setModuleFilter}>
					<SelectTrigger className="w-44 h-8 text-sm">
						<SelectValue placeholder="Модуль" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все модули</SelectItem>
						{Object.entries(MODULE_LABELS).map(([k, v]) => (
							<SelectItem key={k} value={k}>{v}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={opTypeFilter} onValueChange={setOpTypeFilter}>
					<SelectTrigger className="w-40 h-8 text-sm">
						<SelectValue placeholder="Тип операции" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все типы</SelectItem>
						{Object.entries(OP_LABELS).map(([k, v]) => (
							<SelectItem key={k} value={k}>{v}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={counterpartyFilter} onValueChange={setCounterpartyFilter}>
					<SelectTrigger className="w-52 h-8 text-sm">
						<SelectValue placeholder="Контрагент" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все контрагенты</SelectItem>
						{counterparties.map((c) => (
							<SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input
					placeholder="Поиск по названию..."
					value={counterpartySearch}
					onChange={(e) => setCounterpartySearch(e.target.value)}
					className="w-44 h-8 text-sm"
				/>
				{(moduleFilter !== "all" || opTypeFilter !== "all" || counterpartySearch || counterpartyFilter !== "all") && (
					<button
						className="text-xs text-gray-400 hover:text-gray-700"
						onClick={() => { setModuleFilter("all"); setOpTypeFilter("all"); setCounterpartySearch(""); setCounterpartyFilter("all"); }}
					>
						✕ сбросить
					</button>
				)}
				<span className="ml-auto text-xs text-gray-400">{filtered.length} записей</span>
			</div>

			<DataTable
				tableId="consolidated-operations"
				columns={columns}
				data={filtered}
				isLoading={isLoading}
				maxHeight="calc(100vh - 380px)"
				initialSorting={[{ id: "date", desc: true }]}
				emptyState={
					<p className="py-12 text-center text-am-text-muted">
						Нет операций по выбранным фильтрам
					</p>
				}
			/>
		</div>
	);
}
