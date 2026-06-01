import { AlertTriangle, Clock, TrendingDown, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { RentalDebtMatrix } from "@/components/rental/rental-debt-matrix";
import {
	AGING_BUCKETS,
	fmtCurrency,
	fmtNum,
	sortDebtRows,
	useRentalOverdueSearch,
} from "@/lib/rental-overdue";

export default function RentalDebt() {
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

			<p className="text-xs text-gray-500">
				Строки — арендаторы · столбцы — сроки просрочки (дни) · суммы в сом
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
		</div>
	);
}
