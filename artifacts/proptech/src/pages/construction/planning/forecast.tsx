import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/am/DateRangePicker";
import { DataTable } from "@/components/data-table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { defaultPeriod, isInPeriod, type PeriodValue } from "@/lib/period-utils";
import { unwrapList } from "@/lib/unwrap-list";

type ForecastRow = {
	contractId: number;
	dueDate: string;
	installmentNumber: number;
	remainingAmount: string;
	status: string;
	counterpartyName: string;
};

type ForecastSort = "date" | "counterparty";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

const MONTHS = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

export default function ConstructionForecast() {
	const [sortBy, setSortBy] = useState<ForecastSort>("date");
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));

	const { data: accrualsRaw } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contractsRaw } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const accruals = unwrapList<any>(accrualsRaw);
	const contracts = unwrapList<any>(contractsRaw);

	const contractById = useMemo(() => {
		const m = new Map<number, any>();
		for (const c of contracts) m.set(c.id, c);
		return m;
	}, [contracts]);

	const pending = useMemo(
		() =>
			accruals
				.filter((a: any) => a.status !== "paid" && isInPeriod(a.dueDate, period))
				.map((a: any): ForecastRow => {
					const contract = contractById.get(a.contractId);
					return {
						contractId: a.contractId,
						dueDate: a.dueDate,
						installmentNumber: a.installmentNumber,
						remainingAmount: a.remainingAmount,
						status: a.status,
						counterpartyName:
							contract?.buyerName?.trim() || "Без контрагента",
					};
				}),
		[accruals, contractById, period],
	);

	const tableSorting = useMemo(
		() =>
			sortBy === "counterparty"
				? [{ id: "counterpartyName", desc: false }]
				: [{ id: "dueDate", desc: false }],
		[sortBy],
	);

	// Group by month
	const byMonth: Record<
		string,
		{ total: number; count: number; items: any[] }
	> = {};
	pending.forEach((a: any) => {
		const key = a.dueDate?.slice(0, 7);
		if (!key) return;
		if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, items: [] };
		byMonth[key].total += parseFloat(a.remainingAmount || "0");
		byMonth[key].count++;
		byMonth[key].items.push(a);
	});

	const monthsSorted = Object.entries(byMonth).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	const maxMonthly = Math.max(...monthsSorted.map(([, v]) => v.total), 1);
	const totalForecast = monthsSorted.reduce((s, [, v]) => s + v.total, 0);

	const columns = useMemo<ColumnDef<ForecastRow, unknown>[]>(
		() => [
			{
				id: "contract",
				header: "Договор",
				size: 140,
				accessorFn: (row) => {
					const c = contractById.get(row.contractId);
					return c?.contractNumber || `#${row.contractId}`;
				},
				meta: { exportLabel: "Договор" },
				cell: ({ row }) => {
					const c = contractById.get(row.original.contractId);
					return (
						<span className="font-mono text-xs font-medium text-amber-600">
							{c?.contractNumber || `#${row.original.contractId}`}
						</span>
					);
				},
			},
			{
				id: "counterpartyName",
				header: "Контрагент",
				size: 220,
				accessorKey: "counterpartyName",
				meta: { exportLabel: "Контрагент", grow: true },
				cell: ({ getValue }) => (
					<span className="text-gray-700 font-medium">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "dueDate",
				header: "Дата платежа",
				size: 140,
				meta: { exportLabel: "Дата платежа" },
				cell: ({ row }) => {
					const isOvd = new Date(row.original.dueDate) < new Date();
					return (
						<span
							className={isOvd ? "text-rose-600 font-medium" : "text-gray-600"}
						>
							{row.original.dueDate}
						</span>
					);
				},
			},
			{
				accessorKey: "installmentNumber",
				header: "№ платежа",
				size: 100,
				meta: { exportLabel: "№ платежа" },
				cell: ({ row }) => (
					<span className="text-gray-600">#{row.original.installmentNumber}</span>
				),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 140,
				accessorFn: (row: any) => parseFloat(row.remainingAmount || "0"),
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-bold text-blue-600">
						{fmtFull(row.original.remainingAmount)}
					</span>
				),
			},
		],
		[contractById],
	);

	return (
		<div className="rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4">
			<div className="mb-5 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
							Платежный календарь
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
							Будущие поступления
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							Прогноз cashflow на основе действующих договоров и графиков
						</p>
					</div>
					<DateRangePicker value={period} onChange={setPeriod} />
				</div>
			</div>

			<div className="mb-5 grid gap-3 md:grid-cols-3">
				<div className="rounded-lg border border-cyan-100 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Всего к получению</div>
					<div className="text-2xl font-black text-cyan-700">
						{fmtFull(totalForecast)}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Периодов</div>
					<div className="text-2xl font-black text-slate-950">
						{monthsSorted.length}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Платежей</div>
					<div className="text-2xl font-black text-slate-950">
						{pending.length}
					</div>
				</div>
			</div>

			<div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 text-sm font-bold text-slate-800">
					График поступлений
				</div>
				{monthsSorted.length === 0 ? (
					<div className="text-center py-8 text-gray-600 text-sm">
						<Calendar className="w-10 h-10 mx-auto mb-2 text-gray-200" />
						Нет данных. Создайте договоры и сформируйте графики платежей.
					</div>
				) : (
					<div className="space-y-3">
						{monthsSorted.map(([key, v]) => {
							const [y, m] = key.split("-");
							const isPast =
								new Date(key) <
								new Date(new Date().getFullYear(), new Date().getMonth());
							const pct = Math.round((v.total / maxMonthly) * 100);
							return (
								<div key={key}>
									<div className="flex items-center justify-between text-sm mb-1">
										<div className="flex items-center gap-2">
											<span
												className={`font-medium ${isPast ? "text-gray-600" : "text-gray-700"}`}
											>
												{MONTHS[parseInt(m, 10) - 1]} {y}
											</span>
											{isPast && (
												<span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
													прошлый
												</span>
											)}
										</div>
										<div className="text-right">
											<span className="font-mono font-bold text-blue-600">
												{fmtFull(v.total)}
											</span>
											<span className="text-xs text-gray-600 ml-2">
												{v.count} пл.
											</span>
										</div>
									</div>
									<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
										<div
											className={`h-full rounded-full transition-all ${isPast ? "bg-gray-300" : "bg-blue-400"}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<DataTable
				key={sortBy}
				tableId="construction-forecast"
				columns={columns}
				data={pending}
				enableSearch
				searchPlaceholder="Поиск по контрагенту, договору…"
				initialSorting={tableSorting}
				toolbar={
					<Select
						value={sortBy}
						onValueChange={(v) => setSortBy(v as ForecastSort)}
					>
						<SelectTrigger className="h-8 w-[200px] text-sm border-gray-200">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="date">Сортировка: по дате</SelectItem>
							<SelectItem value="counterparty">
								Сортировка: по контрагенту
							</SelectItem>
						</SelectContent>
					</Select>
				}
				rowClassName={(a) =>
					new Date(a.dueDate) < new Date() ? "bg-rose-50/30" : ""
				}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Calendar className="w-10 h-10 text-gray-200" />
						<span>Нет данных. Создайте договоры и сформируйте графики.</span>
					</div>
				}
			/>
		</div>
	);
}
