import { AlertTriangle, Clock, TrendingDown, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { RentalDebtMatrix } from "@/components/rental/rental-debt-matrix";
import { RentalExcelTable, type RentalExcelColumn } from "@/components/rental/rental-excel-table";
import { RentalViewModeToggle } from "@/components/rental/rental-view-mode-toggle";
import { useRentalViewMode } from "@/hooks/use-rental-view-mode";
import {
	AGING_BUCKETS,
	fmtCurrency,
	fmtDate,
	fmtNum,
	periodLabel,
	sortDebtRows,
	useRentalOverdueSearch,
} from "@/lib/rental-overdue";
import { useSortable } from "@/lib/use-sortable";

function debtBadge(days: number) {
	if (days > 60) return <Badge className="bg-rose-100 text-rose-800">60+ дн.</Badge>;
	if (days > 30) return <Badge className="bg-amber-100 text-amber-800">30+ дн.</Badge>;
	if (days > 14) return <Badge className="bg-amber-100 text-amber-800">14+ дн.</Badge>;
	return <Badge className="bg-blue-100 text-blue-800">до 14 дн.</Badge>;
}

export default function RentalDebt() {
	const [viewMode, setViewMode] = useRentalViewMode("debt");
	const {
		isLoading,
		overdueItems,
		contractRows,
		agingTotals,
		totalDebt,
		debtorCount,
		criticalCount,
		mildCount,
		search,
		setSearch,
	} = useRentalOverdueSearch();

	const [matrixSortKey, setMatrixSortKey] = useState("total");
	const [matrixSortDir, setMatrixSortDir] = useState<"asc" | "desc">("desc");

	const sortedMatrix = useMemo(
		() => sortDebtRows(contractRows, matrixSortKey, matrixSortDir),
		[contractRows, matrixSortKey, matrixSortDir],
	);

	const matrixToggleSort = (key: string) => {
		if (matrixSortKey === key) setMatrixSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setMatrixSortKey(key);
			setMatrixSortDir(key === "tenantName" || key === "propertyLabel" ? "asc" : "desc");
		}
	};

	const flatItems = useMemo(
		() =>
			overdueItems.map((i) => ({
				...i,
				tenantName: i.tenant?.fullName || i.tenant?.name || "",
				amountNum: parseFloat(i.amount || "0") || 0,
				balanceNum: parseFloat(i.balance || "0") || 0,
			})),
		[overdueItems],
	);

	const { sorted: sortedItems, sortKey, sortDir, toggle } = useSortable(flatItems, "days");

	const classicColumns: RentalExcelColumn<(typeof flatItems)[number]>[] = [
		{
			key: "tenantName",
			label: "Арендатор",
			width: 160,
			render: (r) => (
				<div>
					<p className="font-medium truncate">{r.tenant?.fullName || r.tenant?.name || "—"}</p>
					<p className="text-[10px] text-gray-400 truncate">{r.contract?.propertyAddress || `Дог. #${r.leaseContractId}`}</p>
				</div>
			),
		},
		{ key: "period", label: "Период", width: 90, render: (r) => periodLabel(r.period) },
		{ key: "amountNum", label: "Начислено", width: 100, align: "right", render: (r) => fmtCurrency(r.amount, r.currency) },
		{ key: "balanceNum", label: "Остаток", width: 100, align: "right", render: (r) => <span className="font-semibold text-rose-700">{fmtCurrency(r.balance, r.currency)}</span> },
		{ key: "dueDate", label: "Срок", width: 90, render: (r) => fmtDate(r.dueDate) },
		{ key: "days", label: "Просрочка", width: 90, align: "center", render: (r) => debtBadge(r.days) },
	];

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Дебиторская задолженность</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Aging-отчёт: долг по срокам просрочки
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						className="w-48 h-8 text-sm"
						placeholder="Поиск..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<RentalViewModeToggle mode={viewMode} onChange={setViewMode} />
				</div>
			</div>

			<KpiRow cols={6}>
				<KpiCard variant="strip" label="Общий долг" value={fmtCurrency(totalDebt)} icon={TrendingDown} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Должников" value={debtorCount} sub={`${overdueItems.length} начисл.`} icon={Users} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Критич. 60+ дн." value={criticalCount} icon={AlertTriangle} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Недавн. ≤10 дн." value={mildCount} icon={Clock} color="blue" loading={isLoading} />
				{AGING_BUCKETS.slice(0, 2).map((b) => (
					<KpiCard
						key={b.key}
						variant="strip"
						label={b.label}
						value={fmtNum(agingTotals[b.key] || 0)}
						icon={TrendingDown}
						color={b.tone === "rose" ? "red" : b.tone === "amber" ? "yellow" : "blue"}
						loading={isLoading}
					/>
				))}
			</KpiRow>

			{viewMode === "report" ? (
				<>
					<p className="text-xs text-gray-500">
						Строки — арендаторы · столбцы — сроки просрочки (дни) · суммы в KGS
					</p>
					<RentalDebtMatrix
						mode="aging"
						rows={sortedMatrix}
						periodColumns={[]}
						isLoading={isLoading}
						sortKey={matrixSortKey}
						sortDir={matrixSortDir}
						onSort={matrixToggleSort}
						footerTotal={totalDebt}
						emptyMessage="Просроченных долгов нет"
					/>
				</>
			) : (
				<RentalExcelTable
					columns={classicColumns}
					rows={sortedItems}
					sortKey={sortKey}
					sortDir={sortDir}
					onSort={toggle}
					isLoading={isLoading}
					emptyMessage="Просроченных долгов нет"
					footer={[
						{ colSpan: 3, content: `Итого: ${overdueItems.length}` },
						{ content: fmtNum(totalDebt), align: "right", className: "font-bold text-rose-700" },
						{ colSpan: 2, content: "" },
					]}
				/>
			)}
		</div>
	);
}
