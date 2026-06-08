import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, TrendingDown, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { api } from "@/lib/api";

function fmtSom(n: number) {
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} сом`;
}

type OwnerRow = {
	name: string;
	propsCount: number;
	income: number;
	expense: number;
	fee: number;
};

export default function RentalOwners() {
	const { data: statements = [] } = useQuery<any[]>({
		queryKey: ["rental-owner-statements"],
		queryFn: () => api.get("/rental/owner-statements").then((r) => r.data),
	});

	const statementsArray = Array.isArray(statements) ? statements : [];

	// Group statements by owner
	const byOwner: Record<
		string,
		{
			name: string;
			props: Set<number>;
			income: number;
			expense: number;
			fee: number;
		}
	> = {};
	statementsArray.forEach((s: any) => {
		const key = s.ownerName || `Владелец #${s.id}`;
		if (!byOwner[key])
			byOwner[key] = {
				name: key,
				props: new Set(),
				income: 0,
				expense: 0,
				fee: 0,
			};
		byOwner[key].income += parseFloat(s.grossRent || "0");
		byOwner[key].expense += parseFloat(s.expenses || "0");
		byOwner[key].fee += parseFloat(s.managementFee || "0");
		if (s.propertyId) byOwner[key].props.add(s.propertyId);
	});

	// If no owner statements yet, compute from payments per property
	const showOwners: OwnerRow[] = Object.values(byOwner).map((o) => ({
		name: o.name,
		propsCount: o.props.size,
		income: o.income,
		expense: o.expense,
		fee: o.fee,
	}));

	const ownerColumns = useMemo<ColumnDef<OwnerRow, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Владелец",
				size: 200,
				minSize: 140,
				maxSize: 320,
				accessorKey: "name",
				meta: { exportLabel: "Владелец", grow: true, pinned: "left" },
				cell: ({ row }) => (
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
							{row.original.name.charAt(0).toUpperCase()}
						</div>
						<span className="font-medium truncate" title={row.original.name}>
							{row.original.name}
						</span>
					</div>
				),
			},
			{
				id: "props",
				header: "Объектов",
				size: 90,
				accessorKey: "propsCount",
				meta: { exportLabel: "Объектов", align: "center" },
			},
			{
				id: "income",
				header: "Валовой доход",
				size: 120,
				accessorKey: "income",
				meta: { exportLabel: "Валовой доход", align: "right", financeAmount: true },
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
				id: "fee",
				header: "Комиссия",
				size: 120,
				accessorKey: "fee",
				meta: { exportLabel: "Комиссия", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="text-amber-600 font-medium tabular-nums">
						{fmtSom(row.original.fee)}
					</span>
				),
			},
			{
				id: "net",
				header: "Чистый",
				size: 120,
				accessorFn: (r) => r.income - r.expense - r.fee,
				meta: { exportLabel: "Чистый", align: "right", financeAmount: true, pinned: "right" },
				cell: ({ row }) => {
					const net = row.original.income - row.original.expense - row.original.fee;
					return (
						<div className="flex items-center justify-end gap-1 tabular-nums">
							{net >= 0 ? (
								<TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
							) : (
								<TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
							)}
							<span
								className={`font-semibold ${net >= 0 ? "text-blue-600" : "text-rose-700"}`}
							>
								{fmtSom(net)}
							</span>
						</div>
					);
				},
			},
		],
		[],
	);

	const totalIncome = showOwners.reduce((s, o) => s + (o.income || 0), 0);
	const totalExpense = showOwners.reduce((s, o) => s + (o.expense || 0), 0);
	const totalFee = showOwners.reduce((s, o) => s + (o.fee || 0), 0);
	const totalNet = totalIncome - totalExpense - totalFee;

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Отчёты владельцев</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Доходы и расходы по каждому владельцу
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Валовой доход</p>
					<p className="text-xl font-bold text-emerald-600">{fmtSom(totalIncome)}</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Расходы</p>
					<p className="text-xl font-bold text-rose-600">
						{fmtSom(totalExpense)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Комиссия УК</p>
					<p className="text-xl font-bold text-amber-600">
						{fmtSom(totalFee)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Чистый доход</p>
					<p
						className={`text-xl font-bold ${totalNet >= 0 ? "text-blue-600" : "text-rose-700"}`}
					>
						{fmtSom(totalNet)}
					</p>
				</div>
			</div>

			{showOwners.length === 0 ? (
				<div className="bg-white border rounded-lg p-12 text-center">
					<FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
					<p className="text-sm text-gray-500">
						Нет данных отчётов владельцев.
					</p>
					<p className="text-xs text-gray-600 mt-1">
						Отчёты создаются автоматически при добавлении платежей
					</p>
				</div>
			) : (
				<DataTable
					tableId="rental-owners-report"
					columns={ownerColumns}
					data={showOwners}
					enableSearch
					searchPlaceholder="Поиск владельца…"
					initialSorting={[{ id: "name", desc: false }]}
				/>
			)}
		</div>
	);
}
