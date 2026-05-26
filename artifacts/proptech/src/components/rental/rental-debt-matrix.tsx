import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useColResize } from "@/lib/use-col-resize";
import {
	AGING_BUCKETS,
	fmtNum,
	type ContractDebtRow,
} from "@/lib/rental-overdue";
import { cn } from "@/lib/utils";

const HEADER_BG = "#E8EAED";

type MatrixMode = "aging" | "period";

function cellTone(amount: number, maxDays?: number) {
	if (!amount) return "";
	if (maxDays != null && maxDays > 60) return "text-rose-700 font-semibold bg-rose-50/60";
	if (maxDays != null && maxDays > 30) return "text-amber-700 font-medium bg-amber-50/50";
	if (amount > 0) return "text-gray-800 font-medium";
	return "";
}

export function RentalDebtMatrix({
	mode,
	rows,
	periodColumns,
	isLoading,
	sortKey,
	sortDir,
	onSort,
	emptyMessage,
	footerTotal,
	trailingColumn,
	maxHeight = "calc(100vh - 280px)",
}: {
	mode: MatrixMode;
	rows: ContractDebtRow[];
	periodColumns: string[];
	isLoading?: boolean;
	sortKey: string;
	sortDir: "asc" | "desc";
	onSort: (key: string) => void;
	emptyMessage?: string;
	footerTotal: number;
	trailingColumn?: { label: string; width: number; render: (row: ContractDebtRow) => ReactNode };
	maxHeight?: string;
}) {
	const fixedCols = useMemo(
		() => [
			{ key: "tenantName", label: "Арендатор", width: 160, align: "left" as const },
			{ key: "propertyLabel", label: "Объект", width: 150, align: "left" as const },
		],
		[],
	);

	const dynamicCols = useMemo(() => {
		if (mode === "aging") {
			return AGING_BUCKETS.map((b) => ({
				key: b.key,
				label: b.label,
				width: 88,
				align: "right" as const,
			}));
		}
		return periodColumns.map((p) => ({
			key: `p-${p}`,
			label: p.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => {
				const names = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
				return `${names[parseInt(m, 10) - 1] ?? m} ${y.slice(2)}`;
			}),
			width: 82,
			align: "right" as const,
			period: p,
		}));
	}, [mode, periodColumns]);

	const tailCols = useMemo(
		() => [
			{ key: "total", label: "Итого", width: 100, align: "right" as const },
			{ key: "maxDays", label: "Макс.", width: 64, align: "center" as const },
			...(trailingColumn
				? [{ key: "_actions", label: trailingColumn.label, width: trailingColumn.width, align: "center" as const }]
				: []),
		],
		[trailingColumn],
	);

	const allCols = [...fixedCols, ...dynamicCols, ...tailCols];

	const initialWidths = useMemo(() => {
		const w: Record<string, number> = {};
		for (const c of allCols) w[c.key] = c.width;
		return w;
	}, [allCols]);

	const { widths, startResize } = useColResize(initialWidths);
	const minWidth = Object.values(widths).reduce((s, w) => s + w, 40) + "px";

	const bucketTotals = useMemo(() => {
		const t: Record<string, number> = {};
		for (const b of AGING_BUCKETS) t[b.key] = 0;
		for (const row of rows) {
			for (const b of AGING_BUCKETS) t[b.key] += row.buckets[b.key] || 0;
		}
		return t;
	}, [rows]);

	const periodTotals = useMemo(() => {
		const t: Record<string, number> = {};
		for (const p of periodColumns) t[p] = 0;
		for (const row of rows) {
			for (const p of periodColumns) t[p] += row.periods[p] || 0;
		}
		return t;
	}, [rows, periodColumns]);

	const SortIcon = ({ colKey }: { colKey: string }) =>
		sortKey === colKey ? (
			sortDir === "asc" ? (
				<ChevronUp className="w-3 h-3 text-blue-600" />
			) : (
				<ChevronDown className="w-3 h-3 text-blue-600" />
			)
		) : (
			<ChevronsUpDown className="w-3 h-3 text-gray-300" />
		);

	return (
		<div
			className="overflow-auto border border-gray-300 rounded-sm bg-white"
			style={{ maxHeight }}
		>
			<table
				className="text-xs border-separate border-spacing-0 table-fixed"
				style={{ minWidth }}
			>
				<thead>
					<tr>
						<th
							className="border border-gray-300 text-center text-gray-500 font-semibold py-1.5 px-2 select-none sticky top-0 left-0 z-30 text-[11px] w-10 shadow-[0_1px_0_0_#d1d5db]"
							style={{ backgroundColor: HEADER_BG }}
						>
							#
						</th>
						{allCols.map((col) => {
							const w = widths[col.key] ?? col.width;
							const sortable = !col.key.startsWith("_");
							return (
								<th
									key={col.key}
									onClick={sortable ? () => onSort(col.key) : undefined}
									className={cn(
										"border border-gray-300 py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap text-[11px] sticky top-0 z-20 shadow-[0_1px_0_0_#d1d5db] relative",
										col.align === "right" && "text-right",
										col.align === "center" && "text-center",
										sortable && "cursor-pointer hover:bg-[#d8dde3]",
										col.key === "tenantName" && "sticky left-10 z-30",
									)}
									style={{
										backgroundColor: HEADER_BG,
										width: w,
										minWidth: w,
										maxWidth: w,
										left: col.key === "tenantName" ? 40 : undefined,
									}}
								>
									<span className="inline-flex items-center gap-0.5 pr-1">
										{col.label}
										{sortable && <SortIcon colKey={col.key} />}
									</span>
									<div
										className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-30"
										onMouseDown={startResize(col.key)}
										onClick={(e) => e.stopPropagation()}
									/>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{isLoading ? (
						Array.from({ length: 5 }).map((_, i) => (
							<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}>
								<td className="border border-gray-300 px-2 py-1.5 sticky left-0 bg-inherit">
									<Skeleton className="h-3 w-4" />
								</td>
								{allCols.map((col) => (
									<td key={col.key} className="border border-gray-300 px-2 py-1.5">
										<Skeleton className="h-3 w-full" />
									</td>
								))}
							</tr>
						))
					) : rows.length === 0 ? (
						<tr>
							<td
								colSpan={allCols.length + 1}
								className="border border-gray-300 px-4 py-12 text-center text-sm text-gray-400"
							>
								{emptyMessage || "Нет просроченных долгов"}
							</td>
						</tr>
					) : (
						rows.map((row, i) => {
							const bg = i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]";
							const severity =
								row.maxDays > 60 ? "text-rose-700" : row.maxDays > 30 ? "text-amber-700" : "text-gray-600";
							return (
								<tr key={row.key} className={cn(bg, "hover:bg-[#EEF2FF]")}>
									<td
										className="border border-gray-300 text-center text-gray-400 py-1 px-2 sticky left-0 z-10 text-[11px]"
										style={{ background: "inherit" }}
									>
										{i + 1}
									</td>
									<td
										className="border border-gray-300 py-1 px-2 sticky left-10 z-10"
										style={{ background: "inherit", width: widths.tenantName, minWidth: widths.tenantName }}
									>
										<p className="font-medium text-gray-900 truncate">{row.tenantName}</p>
										{row.phone && (
											<p className="text-[10px] text-blue-500 truncate">{row.phone}</p>
										)}
									</td>
									<td className="border border-gray-300 py-1 px-2 text-gray-600 truncate">
										{row.propertyLabel}
									</td>
									{mode === "aging"
										? AGING_BUCKETS.map((b) => {
												const amt = row.buckets[b.key] || 0;
												return (
													<td
														key={b.key}
														className={cn(
															"border border-gray-300 py-1 px-2 text-right tabular-nums",
															cellTone(amt, row.maxDays),
														)}
													>
														{amt > 0 ? fmtNum(amt) : <span className="text-gray-200">—</span>}
													</td>
												);
											})
										: periodColumns.map((p) => {
												const amt = row.periods[p] || 0;
												return (
													<td
														key={p}
														className={cn(
															"border border-gray-300 py-1 px-2 text-right tabular-nums",
															cellTone(amt, row.maxDays),
														)}
													>
														{amt > 0 ? fmtNum(amt) : <span className="text-gray-200">—</span>}
													</td>
												);
											})}
									<td className={cn("border border-gray-300 py-1 px-2 text-right tabular-nums font-bold", severity)}>
										{fmtNum(row.total)}
									</td>
									<td className="border border-gray-300 py-1 px-2 text-center">
										<span
											className={cn(
												"inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
												row.maxDays > 60
													? "bg-rose-100 text-rose-800"
													: row.maxDays > 30
														? "bg-amber-100 text-amber-800"
														: row.maxDays > 14
															? "bg-amber-50 text-amber-700"
															: "bg-blue-50 text-blue-700",
											)}
										>
											{row.maxDays}д
										</span>
									</td>
									{trailingColumn && (
										<td className="border border-gray-300 py-1 px-2 text-center">
											{trailingColumn.render(row)}
										</td>
									)}
								</tr>
							);
						})
					)}
				</tbody>
				{!isLoading && rows.length > 0 && (
					<tfoot className="sticky bottom-0 z-20">
						<tr className="bg-[#E8EAED] font-semibold">
							<td className="border border-gray-300 text-center text-gray-500 py-1.5 px-2 text-[11px] sticky left-0 bg-[#E8EAED]">
								Σ
							</td>
							<td colSpan={2} className="border border-gray-300 py-1.5 px-2 text-[11px] text-gray-600">
								Итого: {rows.length} должников
							</td>
							{mode === "aging"
								? AGING_BUCKETS.map((b) => (
										<td
											key={b.key}
											className="border border-gray-300 py-1.5 px-2 text-right tabular-nums text-[11px] text-gray-800"
										>
											{(bucketTotals[b.key] || 0) > 0 ? fmtNum(bucketTotals[b.key]) : "—"}
										</td>
									))
								: periodColumns.map((p) => (
										<td
											key={p}
											className="border border-gray-300 py-1.5 px-2 text-right tabular-nums text-[11px] text-gray-800"
										>
											{(periodTotals[p] || 0) > 0 ? fmtNum(periodTotals[p]) : "—"}
										</td>
									))}
							<td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums text-[11px] font-bold text-rose-700">
								{fmtNum(footerTotal)}
							</td>
							<td className="border border-gray-300 py-1.5 px-2" />
							{trailingColumn && <td className="border border-gray-300 py-1.5 px-2" />}
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}
