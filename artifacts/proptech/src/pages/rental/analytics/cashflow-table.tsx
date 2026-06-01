import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

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

function fmtSom(n: number) {
	if (!n) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} сом`;
}

export type CashflowMonthRow = {
	mon: string;
	year: string;
	income: number;
	expense: number;
};

export function CashflowMonthTable({
	rows,
}: {
	rows: CashflowMonthRow[];
}) {
	const columns = useMemo<ColumnDef<CashflowMonthRow, unknown>[]>(
		() => [
			{
				id: "month",
				header: "Месяц",
				size: 140,
				accessorFn: (r) => `${r.mon}-${r.year}`,
				meta: { exportLabel: "Месяц", pinned: "left" },
				cell: ({ row }) => (
					<span>
						{MONTHS[parseInt(row.original.mon, 10) - 1]} {row.original.year}
					</span>
				),
			},
			{
				id: "income",
				header: "Поступления",
				size: 120,
				accessorKey: "income",
				meta: { exportLabel: "Поступления", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="text-emerald-600 font-medium tabular-nums">
						{fmtSom(row.original.income)}
					</span>
				),
			},
			{
				id: "expense",
				header: "Расходы",
				size: 120,
				accessorKey: "expense",
				meta: { exportLabel: "Расходы", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="text-rose-600 font-medium tabular-nums">
						{fmtSom(row.original.expense)}
					</span>
				),
			},
			{
				id: "net",
				header: "Нетто",
				size: 120,
				accessorFn: (r) => r.income - r.expense,
				meta: { exportLabel: "Нетто", align: "right", financeAmount: true },
				cell: ({ row }) => {
					const n = row.original.income - row.original.expense;
					return (
						<span
							className={`font-semibold tabular-nums ${n > 0 ? "text-blue-600" : n < 0 ? "text-amber-600" : "text-am-text-muted"}`}
						>
							{row.original.income > 0 || row.original.expense > 0
								? fmtSom(n)
								: "—"}
						</span>
					);
				},
			},
		],
		[],
	);

	return (
		<DataTable
			tableId="rental-cashflow-months"
			columns={columns}
			data={rows}
			hideToolbar
			initialSorting={[{ id: "month", desc: false }]}
		/>
	);
}
