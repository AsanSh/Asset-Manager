import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="overflow-auto max-h-[calc(100vh-380px)]">
					<table className="w-full text-xs border-collapse">
						<thead className="sticky top-0 z-10">
							<tr className="bg-gray-50 border-b border-gray-100">
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Дата</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Модуль</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Тип</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Контрагент</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Описание</th>
								<th className="text-right px-3 py-2.5 font-semibold text-gray-500">Сумма</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								Array.from({ length: 6 }).map((_, i) => (
									<tr key={i} className="border-b border-gray-50">
										{Array.from({ length: 6 }).map((_, j) => (
											<td key={j} className="px-3 py-2">
												<Skeleton className="h-3 w-full" />
											</td>
										))}
									</tr>
								))
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={6} className="text-center py-16 text-gray-400">
										Нет операций по выбранным фильтрам
									</td>
								</tr>
							) : (
								filtered.map((row, idx) => (
									<tr
										key={row.id}
										className={`border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
									>
										<td className="px-3 py-2 text-gray-500 whitespace-nowrap">
											{row.operationDate
												? new Date(row.operationDate).toLocaleDateString("ru-KG")
												: new Date(row.createdAt).toLocaleDateString("ru-KG")}
										</td>
										<td className="px-3 py-2">
											<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${MODULE_COLORS[row.module] || "bg-gray-100 text-gray-600"}`}>
												{MODULE_LABELS[row.module] || row.module}
											</span>
										</td>
										<td className="px-3 py-2 text-gray-600">
											{OP_LABELS[row.operationType] || row.operationType}
										</td>
										<td className="px-3 py-2 text-gray-700">
											{row.counterpartyName || "—"}
										</td>
										<td className="px-3 py-2 text-gray-500 max-w-xs truncate">
											{row.description || "—"}
										</td>
										<td className={`px-3 py-2 text-right font-medium ${OP_COLORS[row.operationType] || "text-gray-700"}`}>
											{fmtAmt(row.amount, row.currency)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
