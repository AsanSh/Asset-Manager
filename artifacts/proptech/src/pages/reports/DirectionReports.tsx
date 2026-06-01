import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	Building2,
	HardHat,
	Home,
	RefreshCw,
	ShoppingCart,
	Truck,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

type DirectionKey = "rental" | "sales" | "contractors" | "suppliers";

type DirectionReportSummary = {
	totalContract: number;
	totalCharged: number;
	totalPaid: number;
	totalExpense: number;
	totalOutstanding: number;
	netCashflow: number;
	entityCount: number;
	avgPaymentRate: number;
};

type DirectionByMonthRow = {
	period: string;
	charged: number;
	paid: number;
	expense: number;
};

type DirectionReportRow = {
	id: number;
	name: string;
	subtitle?: string;
	status?: string;
	role: DirectionKey;
	roleLabel: string;
	contractAmount: number;
	charged: number;
	paid: number;
	expense: number;
	outstanding: number;
	paymentRate: number;
	currency: string;
};

type DirectionSegment = {
	direction: DirectionKey;
	label: string;
	paid: number;
	outstanding: number;
	entityCount: number;
	paidShare: number;
	outstandingShare: number;
};

type CounterpartyDashboard = {
	summary: DirectionReportSummary;
	byMonth: DirectionByMonthRow[];
	byDirection: DirectionSegment[];
	rows: DirectionReportRow[];
};

const ROLE_FILTER_OPTIONS: { value: string; label: string; icon: React.ElementType }[] = [
	{ value: "all", label: "Все роли", icon: Users },
	{ value: "rental", label: "Арендаторы", icon: Home },
	{ value: "sales", label: "Покупатели", icon: ShoppingCart },
	{ value: "contractors", label: "Подрядчики", icon: HardHat },
	{ value: "suppliers", label: "Поставщики", icon: Truck },
];

const DIRECTION_COLORS: Record<DirectionKey, string> = {
	rental: "#3b82f6",
	sales: "#10b981",
	contractors: "#f59e0b",
	suppliers: "#8b5cf6",
};

const MONTH_NAMES: Record<string, string> = {
	"01": "Янв",
	"02": "Фев",
	"03": "Мар",
	"04": "Апр",
	"05": "Май",
	"06": "Июн",
	"07": "Июл",
	"08": "Авг",
	"09": "Сен",
	"10": "Окт",
	"11": "Ноя",
	"12": "Дек",
};

function formatPeriod(period: string) {
	const [year, month] = period.split("-");
	return `${MONTH_NAMES[month] ?? month} ${year?.slice(2) ?? ""}`;
}

function roleBadge(role: DirectionKey, label: string) {
	const colors: Record<DirectionKey, string> = {
		rental: "bg-blue-100 text-blue-800 border-blue-200",
		sales: "bg-emerald-100 text-emerald-800 border-emerald-200",
		contractors: "bg-amber-100 text-amber-800 border-amber-200",
		suppliers: "bg-violet-100 text-violet-800 border-violet-200",
	};
	return <Badge className={colors[role]}>{label}</Badge>;
}

function moneyCell(value: number, tone?: "emerald" | "rose" | "blue") {
	return (
		<span
			className={cn(
				"font-mono text-sm tabular-nums",
				tone === "emerald" && "text-emerald-700",
				tone === "rose" && "text-rose-700",
				tone === "blue" && "text-blue-700",
				!tone && "text-gray-900",
			)}
		>
			{formatCurrency(value)}
		</span>
	);
}

const ROW_COLUMNS: ColumnDef<DirectionReportRow>[] = [
	{
		id: "roleLabel",
		accessorKey: "roleLabel",
		header: "Роль",
		cell: ({ row }) => roleBadge(row.original.role, row.original.roleLabel),
	},
	{
		id: "name",
		accessorKey: "name",
		header: "Контрагент",
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="font-medium text-gray-900 truncate">{row.original.name}</p>
				{row.original.subtitle && (
					<p className="text-xs text-gray-400 truncate">{row.original.subtitle}</p>
				)}
			</div>
		),
	},
	{
		id: "contractAmount",
		accessorKey: "contractAmount",
		header: () => <span className="block text-right">Договор</span>,
		cell: ({ row }) => (
			<div className="text-right">{moneyCell(row.original.contractAmount)}</div>
		),
	},
	{
		id: "paid",
		accessorKey: "paid",
		header: () => <span className="block text-right">Оплачено</span>,
		cell: ({ row }) => (
			<div className="text-right">{moneyCell(row.original.paid, "emerald")}</div>
		),
	},
	{
		id: "outstanding",
		accessorKey: "outstanding",
		header: () => <span className="block text-right">Остаток</span>,
		cell: ({ row }) => (
			<div className="text-right">
				{moneyCell(
					row.original.outstanding,
					row.original.outstanding > 0 ? "rose" : undefined,
				)}
			</div>
		),
	},
	{
		id: "paymentRate",
		accessorKey: "paymentRate",
		header: () => <span className="block text-right">Оплата %</span>,
		cell: ({ row }) => {
			const rate = row.original.paymentRate;
			return (
				<div className="text-right">
					<span
						className={cn(
							"text-sm font-mono tabular-nums",
							rate >= 80 && "text-emerald-700",
							rate >= 40 && rate < 80 && "text-amber-700",
							rate < 40 && "text-rose-700",
						)}
					>
						{rate}%
					</span>
				</div>
			);
		},
	},
];

function KpiCard({
	label,
	value,
	sub,
	tone,
}: {
	label: string;
	value: string;
	sub?: string;
	tone?: string;
}) {
	return (
		<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
			<p className="text-xs text-gray-500 truncate">{label}</p>
			<p className={cn("text-xl font-bold mt-1 font-mono tabular-nums truncate", tone)}>
				{value}
			</p>
			{sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
		</div>
	);
}

function ChartTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
			<p className="font-medium text-gray-700 mb-1">{label}</p>
			{payload.map((p: any) => (
				<p key={p.name} style={{ color: p.color }}>
					{p.name}: {formatCurrency(p.value)}
				</p>
			))}
		</div>
	);
}

export default function DirectionReportsPage() {
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [roleFilter, setRoleFilter] = useState("all");

	const { data, isLoading, refetch, isFetching } = useQuery<CounterpartyDashboard>({
		queryKey: ["reports", "counterparty-dashboard", period.from, period.to, roleFilter],
		queryFn: () =>
			api
				.get<CounterpartyDashboard>("/reports/counterparty-dashboard", {
					params: {
						from: period.from,
						to: period.to,
						...(roleFilter !== "all" ? { direction: roleFilter } : {}),
					},
				})
				.then((r) => r.data),
	});

	const { summary, byMonth, byDirection, rows } = data ?? {
		summary: {
			totalContract: 0,
			totalCharged: 0,
			totalPaid: 0,
			totalExpense: 0,
			totalOutstanding: 0,
			netCashflow: 0,
			entityCount: 0,
			avgPaymentRate: 0,
		},
		byMonth: [],
		byDirection: [],
		rows: [],
	};

	const barData = useMemo(
		() =>
			byMonth.map((m) => ({
				period: formatPeriod(m.period),
				Начислено: m.charged,
				Оплачено: m.paid,
			})),
		[byMonth],
	);

	const paidPie = useMemo(
		() =>
			byDirection
				.filter((d) => d.paid > 0)
				.map((d) => ({
					name: d.label,
					value: d.paid,
					direction: d.direction,
				})),
		[byDirection],
	);

	const debtPie = useMemo(
		() =>
			byDirection
				.filter((d) => d.outstanding > 0)
				.map((d) => ({
					name: d.label,
					value: d.outstanding,
					direction: d.direction,
				})),
		[byDirection],
	);

	const scatterData = useMemo(
		() =>
			rows
				.filter((r) => r.paid > 0 || r.outstanding > 0)
				.slice(0, 40)
				.map((r) => ({
					name: r.name,
					paid: r.paid,
					outstanding: r.outstanding,
					role: r.roleLabel,
					fill: DIRECTION_COLORS[r.role],
				})),
		[rows],
	);

	const footerTotals = useMemo(() => {
		if (!rows.length) return null;
		return rows.reduce(
			(acc, r) => ({
				contractAmount: acc.contractAmount + r.contractAmount,
				paid: acc.paid + r.paid,
				outstanding: acc.outstanding + r.outstanding,
			}),
			{ contractAmount: 0, paid: 0, outstanding: 0 },
		);
	}, [rows]);

	return (
		<div className="p-4 sm:p-6 space-y-4 bg-gray-50/50 min-h-screen">
			{/* Header + filters */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
				<div className="flex items-start justify-between flex-wrap gap-3 mb-4">
					<div>
						<h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
							<Building2 className="w-5 h-5 text-gray-500" />
							Расчёты с контрагентами
						</h1>
						<p className="text-xs text-gray-500 mt-0.5">
							Арендатор · Покупатель · Подрядчик · Поставщик — оплачено и остаток
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<PeriodPicker value={period} onChange={setPeriod} />
						<Select value={roleFilter} onValueChange={setRoleFilter}>
							<SelectTrigger className="w-44 h-9 text-sm">
								<SelectValue placeholder="Роль" />
							</SelectTrigger>
							<SelectContent>
								{ROLE_FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
									<SelectItem key={value} value={value}>
										<span className="flex items-center gap-2">
											<Icon className="w-3.5 h-3.5" />
											{label}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void refetch()}
							disabled={isFetching}
						>
							<RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
						</Button>
					</div>
				</div>

				{/* KPI strip */}
				{isLoading ? (
					<div className="h-20 flex items-center justify-center text-gray-400 text-sm gap-2">
						<RefreshCw className="w-4 h-4 animate-spin" /> Загрузка…
					</div>
				) : (
					<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
						<KpiCard
							label="Контрагентов"
							value={String(summary.entityCount)}
							sub="в выборке"
						/>
						<KpiCard
							label="Оплачено (всего)"
							value={formatCurrency(summary.totalPaid)}
							tone="text-emerald-700"
							sub="по контрагентам"
						/>
						<KpiCard
							label="Начислено за период"
							value={formatCurrency(summary.totalCharged)}
							tone="text-blue-700"
						/>
						<KpiCard
							label="Остаток (долг)"
							value={formatCurrency(summary.totalOutstanding)}
							tone={summary.totalOutstanding > 0 ? "text-rose-700" : "text-gray-900"}
							sub="на текущий момент"
						/>
						<KpiCard
							label="Средняя оплата"
							value={`${summary.avgPaymentRate}%`}
							sub="по контрагентам"
						/>
					</div>
				)}
			</div>

			{/* Charts row */}
			{!isLoading && (
				<div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
					{/* Bar chart */}
					<div className="xl:col-span-5 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
						<h3 className="text-sm font-semibold text-gray-800 mb-3">
							Оплаты за период
						</h3>
						{barData.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-16">Нет данных</p>
						) : (
							<ResponsiveContainer width="100%" height={240}>
								<BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
									<XAxis dataKey="period" tick={{ fontSize: 10 }} />
									<YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
									<Tooltip content={<ChartTooltip />} />
									<Legend wrapperStyle={{ fontSize: 11 }} />
									<Bar dataKey="Начислено" fill="#60a5fa" radius={[2, 2, 0, 0]} />
									<Bar dataKey="Оплачено" fill="#34d399" radius={[2, 2, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>

					{/* Donuts */}
					<div className="xl:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
						<div>
							<h3 className="text-sm font-semibold text-gray-800 mb-2">
								Оплачено по направлениям
							</h3>
							{paidPie.length === 0 ? (
								<p className="text-xs text-gray-400 text-center py-8">—</p>
							) : (
								<ResponsiveContainer width="100%" height={100}>
									<PieChart>
										<Pie
											data={paidPie}
											dataKey="value"
											nameKey="name"
											cx="50%"
											cy="50%"
											innerRadius={28}
											outerRadius={44}
											paddingAngle={2}
										>
											{paidPie.map((entry) => (
												<Cell
													key={entry.direction}
													fill={DIRECTION_COLORS[entry.direction]}
												/>
											))}
										</Pie>
										<Tooltip formatter={(v: number) => formatCurrency(v)} />
									</PieChart>
								</ResponsiveContainer>
							)}
							<div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
								{byDirection.map((d) => (
									<span key={d.direction} className="text-[10px] text-gray-500">
										<span
											className="inline-block w-2 h-2 rounded-full mr-1"
											style={{ background: DIRECTION_COLORS[d.direction] }}
										/>
										{d.label} {d.paidShare}%
									</span>
								))}
							</div>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-gray-800 mb-2">
								Остаток по направлениям
							</h3>
							{debtPie.length === 0 ? (
								<p className="text-xs text-gray-400 text-center py-8">Нет задолженности</p>
							) : (
								<ResponsiveContainer width="100%" height={100}>
									<PieChart>
										<Pie
											data={debtPie}
											dataKey="value"
											nameKey="name"
											cx="50%"
											cy="50%"
											innerRadius={28}
											outerRadius={44}
											paddingAngle={2}
										>
											{debtPie.map((entry) => (
												<Cell
													key={entry.direction}
													fill={DIRECTION_COLORS[entry.direction]}
												/>
											))}
										</Pie>
										<Tooltip formatter={(v: number) => formatCurrency(v)} />
									</PieChart>
								</ResponsiveContainer>
							)}
							<div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
								{byDirection.map((d) => (
									<span key={`debt-${d.direction}`} className="text-[10px] text-gray-500">
										<span
											className="inline-block w-2 h-2 rounded-full mr-1"
											style={{ background: DIRECTION_COLORS[d.direction] }}
										/>
										{d.label} {d.outstandingShare}%
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Scatter */}
					<div className="xl:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
						<h3 className="text-sm font-semibold text-gray-800 mb-1">
							Оплачено vs Остаток
						</h3>
						<p className="text-[10px] text-gray-400 mb-2">по контрагентам</p>
						{scatterData.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-16">Нет данных</p>
						) : (
							<ResponsiveContainer width="100%" height={240}>
								<ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
									<XAxis
										type="number"
										dataKey="paid"
										name="Оплачено"
										tick={{ fontSize: 9 }}
										tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
									/>
									<YAxis
										type="number"
										dataKey="outstanding"
										name="Остаток"
										tick={{ fontSize: 9 }}
										tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
									/>
									<ZAxis range={[40, 40]} />
									<Tooltip
										cursor={{ strokeDasharray: "3 3" }}
										content={({ active, payload }) => {
											if (!active || !payload?.[0]) return null;
											const p = payload[0].payload;
											return (
												<div className="bg-white border rounded-lg shadow px-2 py-1.5 text-xs">
													<p className="font-medium">{p.name}</p>
													<p className="text-gray-500">{p.role}</p>
													<p className="text-emerald-700">Оплачено: {formatCurrency(p.paid)}</p>
													<p className="text-rose-700">Остаток: {formatCurrency(p.outstanding)}</p>
												</div>
											);
										}}
									/>
									<Scatter data={scatterData} fill="#8884d8">
										{scatterData.map((entry, i) => (
											<Cell key={i} fill={entry.fill} />
										))}
									</Scatter>
								</ScatterChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
				<h3 className="text-sm font-semibold text-gray-800 mb-3">
					Детализация по контрагентам
				</h3>
				{isLoading ? (
					<div className="h-32 flex items-center justify-center text-gray-400 text-sm">
						Загрузка…
					</div>
				) : (
					<DataTable
						tableId="counterparty-dashboard"
						data={rows}
						columns={ROW_COLUMNS}
						searchPlaceholder="Поиск контрагента…"
						initialSorting={[{ id: "outstanding", desc: true }]}
						footer={
							footerTotals ? (
								<tr className="bg-gray-50 font-semibold border-t border-gray-200">
									<td colSpan={2} className="px-3 py-2.5 text-sm text-gray-700">
										Итого ({rows.length})
									</td>
									<td className="px-3 py-2.5 text-right font-mono text-sm">
										{formatCurrency(footerTotals.contractAmount)}
									</td>
									<td className="px-3 py-2.5 text-right font-mono text-sm text-emerald-700">
										{formatCurrency(footerTotals.paid)}
									</td>
									<td className="px-3 py-2.5 text-right font-mono text-sm text-rose-700">
										{formatCurrency(footerTotals.outstanding)}
									</td>
									<td />
								</tr>
							) : undefined
						}
					/>
				)}
			</div>
		</div>
	);
}
