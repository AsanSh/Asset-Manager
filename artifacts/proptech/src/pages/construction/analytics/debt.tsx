import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/am/DateRangePicker";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { defaultPeriod, isInPeriod, type PeriodValue } from "@/lib/period-utils";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

function daysOverdue(dueDate: string) {
	return Math.ceil(
		(Date.now()- new Date(dueDate).getTime()) / 86400000,
	);
}

export default function ConstructionDebt() {
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));
	const { data: accruals = [], isLoading } = useQuery({
		queryKey: ["construction-debt"],
		queryFn: () => api.get("/construction/analytics/debt").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const filteredAccruals = accruals.filter((a: any) => isInPeriod(a.dueDate, period));
	const overdue = filteredAccruals.filter((a: any) => new Date(a.dueDate) < new Date());
	const upcoming = filteredAccruals.filter(
		(a: any) => new Date(a.dueDate) >= new Date(),
	);
	const totalDebt = filteredAccruals.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalOverdue = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalUpcoming = upcoming.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);

	// Aging buckets
	const aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };
	overdue.forEach((a: any) => {
		const d = daysOverdue(a.dueDate);
		const amt = parseFloat(a.remainingAmount || "0");
		if (d <= 30) aging.d30 += amt;
		else if (d <= 60) aging.d60 += amt;
		else if (d <= 90) aging.d90 += amt;
		else aging.d90plus += amt;
	});

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				id: "contract",
				header: "Договор / Покупатель",
				size: 220,
				accessorFn: (row: any) =>
					contracts.find((c: any) => c.id === row.contractId)?.contractNumber ||
					`#${row.contractId}`,
				meta: { exportLabel: "Договор / Покупатель" },
				cell: ({ row }) => {
					const c = contracts.find((x: any) => x.id === row.original.contractId);
					return (
						<div>
							<div className="font-mono text-xs font-medium text-amber-600">
								{c?.contractNumber || `#${row.original.contractId}`}
							</div>
							<div className="text-xs text-gray-500">{c?.buyerName}</div>
						</div>
					);
				},
			},
			{
				accessorKey: "dueDate",
				header: "Срок",
				size: 120,
				meta: { exportLabel: "Срок" },
				cell: ({ row }) => (
					<span className="text-gray-600">{row.original.dueDate}</span>
				),
			},
			{
				id: "overdueDays",
				header: "Просрочка",
				size: 120,
				accessorFn: (row: any) =>
					new Date(row.dueDate) < new Date() ? daysOverdue(row.dueDate) : -1,
				meta: { exportLabel: "Просрочка (дн.)" },
				cell: ({ row }) => {
					const a = row.original;
					const isOvd = new Date(a.dueDate) < new Date();
					if (!isOvd) {
						return (
							<span className="text-xs text-emerald-600">Не просрочен</span>
						);
					}
					return (
						<Badge
							variant="outline"
							className="bg-rose-100 text-rose-700 border-rose-200 text-xs"
						>
							{daysOverdue(a.dueDate)} дн.
						</Badge>
					);
				},
			},
			{
				id: "amount",
				header: "Начислено",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Начислено (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">{fmtFull(row.original.amount)}</span>
				),
			},
			{
				id: "remainingAmount",
				header: "Остаток",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.remainingAmount || "0"),
				meta: { exportLabel: "Остаток (сом)", align: "right" },
				cell: ({ row }) => {
					const isOvd = new Date(row.original.dueDate) < new Date();
					return (
						<span
							className={`font-mono font-bold ${isOvd ? "text-rose-700" : "text-amber-600"}`}
						>
							{fmtFull(row.original.remainingAmount)}
						</span>
					);
				},
			},
		],
		[contracts],
	);

	return (
		<div className="rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-4">
			<div className="mb-5 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
							Дебиторский контроль
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Задолженности</h1>
						<p className="mt-1 text-sm text-slate-500">
							Анализ дебиторской задолженности по договорам
						</p>
					</div>
					<DateRangePicker value={period} onChange={setPeriod} />
				</div>
			</div>

			{/* Stats */}
			<div className="mb-5 grid gap-3 md:grid-cols-3">
				<div className="rounded-lg border border-cyan-100 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Всего к получению</div>
					<div className="text-2xl font-black text-cyan-700">
						{fmtFull(totalDebt)}
					</div>
					<div className="text-xs text-slate-400">
						{filteredAccruals.length} платежей
					</div>
				</div>
				<div className="rounded-lg border border-rose-100 bg-rose-50 p-4 shadow-sm">
					<div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
						<AlertTriangle className="w-3 h-3" />
						Просрочено
					</div>
					<div className="text-2xl font-black text-rose-700">
						{fmtFull(totalOverdue)}
					</div>
					<div className="text-xs text-rose-600">{overdue.length} платежей</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
						<Clock className="w-3 h-3" />
						Предстоит
					</div>
					<div className="text-2xl font-black text-amber-600">
						{fmtFull(totalUpcoming)}
					</div>
					<div className="text-xs text-slate-400">
						{upcoming.length} платежей
					</div>
				</div>
			</div>

			{/* Aging */}
			<div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 text-sm font-bold text-slate-800">
					Aging Report (просрочка по срокам)
				</div>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{
							label: "0–30 дней",
							amount: aging.d30,
							color: "bg-amber-100 border-amber-200 text-amber-700",
						},
						{
							label: "30–60 дней",
							amount: aging.d60,
							color: "bg-amber-100 border-amber-200 text-amber-700",
						},
						{
							label: "60–90 дней",
							amount: aging.d90,
							color: "bg-rose-100 border-rose-200 text-rose-700",
						},
						{
							label: "90+ дней",
							amount: aging.d90plus,
							color: "bg-rose-200 border-rose-300 text-rose-800",
						},
					].map((bucket) => (
						<div
							key={bucket.label}
							className={`rounded-lg border p-3 ${bucket.color}`}
						>
							<div className="text-xs font-medium mb-1">{bucket.label}</div>
							<div className="text-lg font-bold">{fmtFull(bucket.amount)}</div>
						</div>
					))}
				</div>
			</div>

			<DataTable
				tableId="construction-debt"
				columns={columns}
				data={filteredAccruals}
				isLoading={isLoading}
				initialSorting={[{ id: "dueDate", desc: false }]}
				rowClassName={(a: any) =>
					new Date(a.dueDate) < new Date() ? "bg-rose-50/20" : ""
				}
				emptyState="Нет задолженностей"
			/>
		</div>
	);
}
