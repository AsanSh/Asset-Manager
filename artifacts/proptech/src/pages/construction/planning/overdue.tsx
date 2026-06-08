import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/am/DateRangePicker";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { defaultPeriod, isInPeriod, type PeriodValue } from "@/lib/period-utils";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionOverdue() {
	const qc = useQueryClient();
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));

	const { data: accruals = [], isLoading } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const patchMut = useMutation({
		mutationFn: ({ id, data }: { id: number; data: any }) =>
			api.patch(`/construction/accruals/${id}`, data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			toast.success("Статус обновлён");
		},
	});

	const overdue = accruals.filter(
		(a: any) =>
			a.status !== "paid" &&
			new Date(a.dueDate) < new Date() &&
			isInPeriod(a.dueDate, period),
	);
	const totalOverdue = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalPaid = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.paidAmount || "0"),
		0,
	);

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				id: "contract",
				header: "Договор",
				size: 140,
				accessorFn: (row: any) =>
					contracts.find((c: any) => c.id === row.contractId)?.contractNumber ||
					`#${row.contractId}`,
				meta: { exportLabel: "Договор" },
				cell: ({ getValue }) => (
					<span className="font-mono text-xs font-medium text-amber-600">
						{getValue() as string}
					</span>
				),
			},
			{
				id: "buyer",
				header: "Покупатель",
				size: 200,
				accessorFn: (row: any) =>
					contracts.find((c: any) => c.id === row.contractId)?.buyerName || "—",
				meta: { exportLabel: "Покупатель" },
				cell: ({ getValue }) => (
					<span className="font-medium">{getValue() as string}</span>
				),
			},
			{
				accessorKey: "dueDate",
				header: "Срок платежа",
				size: 130,
				meta: { exportLabel: "Срок платежа" },
				cell: ({ row }) => (
					<span className="text-gray-600">{row.original.dueDate}</span>
				),
			},
			{
				id: "days",
				header: "Просрочка",
				size: 110,
				accessorFn: (row: any) =>
					Math.ceil((Date.now() - new Date(row.dueDate).getTime()) / 86400000),
				meta: { exportLabel: "Просрочка (дн.)" },
				cell: ({ getValue }) => {
					const days = getValue() as number;
					const color =
						days <= 60
							? "bg-amber-100 text-amber-700 border-amber-200"
							: "bg-rose-100 text-rose-700 border-rose-200";
					return (
						<Badge variant="outline" className={`${color} text-xs`}>
							{days} дн.
						</Badge>
					);
				},
			},
			{
				id: "remainingAmount",
				header: "Долг",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.remainingAmount || "0"),
				meta: { exportLabel: "Долг (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-bold text-rose-600">
						{fmtFull(row.original.remainingAmount)}
					</span>
				),
			},
			{
				id: "paidAmount",
				header: "Оплачено",
				size: 120,
				accessorFn: (row: any) => parseFloat(row.paidAmount || "0"),
				meta: { exportLabel: "Оплачено (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-emerald-600">
						{fmtFull(row.original.paidAmount)}
					</span>
				),
			},
			{
				id: "__actions",
				header: "",
				size: 100,
				enableSorting: false,
				cell: ({ row }) => {
					const a = row.original;
					return (
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-xs"
							onClick={() =>
								patchMut.mutate({
									id: a.id,
									data: {
										status: "paid",
										paidAmount: a.amount,
										remainingAmount: "0",
										paidAt: new Date().toISOString().slice(0, 10),
									},
								})
							}
						>
							Закрыть
						</Button>
					);
				},
			},
		],
		[contracts, patchMut],
	);

	return (
		<div className="rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-rose-50/40 p-4">
			<div className="mb-5 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">
							Контроль платежей
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Просрочки</h1>
						<p className="mt-1 text-sm text-slate-500">
							Реестр просроченных платежей по договорам
						</p>
					</div>
					<DateRangePicker value={period} onChange={setPeriod} />
				</div>
			</div>

			<div className="mb-5 grid gap-3 md:grid-cols-3">
				<div className="rounded-lg border border-rose-100 bg-rose-50 p-4 shadow-sm">
					<div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-600">
						<AlertTriangle className="w-3 h-3" />
						Сумма просрочки
					</div>
					<div className="text-2xl font-black text-rose-600">
						{fmtFull(totalOverdue)}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Частично оплачено</div>
					<div className="text-2xl font-black text-amber-600">
						{fmtFull(totalPaid)}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
						Просроченных платежей
					</div>
					<div className="text-2xl font-black text-rose-600">
						{overdue.length} шт.
					</div>
				</div>
			</div>

			<DataTable
				tableId="construction-overdue"
				columns={columns}
				data={overdue}
				isLoading={isLoading}
				initialSorting={[{ id: "dueDate", desc: false }]}
				rowClassName={() => "hover:bg-rose-50/30"}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<CheckCircle2 className="w-10 h-10 text-emerald-300" />
						<span>Нет просрочек — все платежи в порядке!</span>
					</div>
				}
			/>
		</div>
	);
}
