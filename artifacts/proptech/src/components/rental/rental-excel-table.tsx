import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useColResize } from "@/lib/use-col-resize";
import { cn } from "@/lib/utils";

export type RentalExcelColumn<T> = {
	key: string;
	label: string;
	width?: number;
	align?: "left" | "right" | "center";
	sortable?: boolean;
	resizable?: boolean;
	render: (row: T, index: number) => ReactNode;
};

type FooterCell = {
	colSpan?: number;
	content: ReactNode;
	align?: "left" | "right" | "center";
	className?: string;
};

const HEADER_BG = "#E8EAED";
const thSticky =
	"border border-gray-300 py-1.5 px-2 font-semibold text-gray-700 whitespace-nowrap text-[11px] sticky top-0 z-20 shadow-[0_1px_0_0_#d1d5db] relative";
const thIndexSticky =
	"border border-gray-300 text-center text-gray-500 font-semibold py-1.5 px-2 select-none sticky top-0 left-0 z-30 text-[11px] w-10 shadow-[0_1px_0_0_#d1d5db]";

export function RentalExcelTable<T>({
	columns,
	rows,
	sortKey,
	sortDir,
	onSort,
	isLoading,
	emptyMessage,
	footer,
	rowKey,
	maxHeight = "calc(100vh - 300px)",
}: {
	columns: RentalExcelColumn<T>[];
	rows: T[];
	sortKey: string;
	sortDir: "asc" | "desc";
	onSort: (key: string) => void;
	isLoading?: boolean;
	emptyMessage?: string;
	footer?: FooterCell[];
	rowKey?: (row: T, index: number) => string | number;
	maxHeight?: string;
}) {
	const initialWidths = useMemo(() => {
		const w: Record<string, number> = {};
		for (const col of columns) {
			w[col.key] = col.width ?? 110;
		}
		return w;
	}, [columns]);

	const { widths, startResize } = useColResize(initialWidths);

	const minWidth =
		Object.values(widths).reduce((sum, w) => sum + w, 40) + "px";

	return (
		<div
			className="overflow-auto border border-gray-300 rounded-sm bg-white"
			style={{ maxHeight }}
		>
			<table
				className="text-xs border-separate border-spacing-0 w-full table-fixed"
				style={{ minWidth }}
			>
				<thead>
					<tr>
						<th
							className={thIndexSticky}
							style={{ backgroundColor: HEADER_BG, width: 40 }}
						>
							#
						</th>
						{columns.map((col) => {
							const active = sortKey === col.key;
							const sortable = col.sortable !== false;
							const resizable = col.resizable !== false;
							const w = widths[col.key] ?? col.width ?? 110;
							return (
								<th
									key={col.key}
									onClick={sortable ? () => onSort(col.key) : undefined}
									className={cn(
										thSticky,
										col.align === "right" && "text-right",
										col.align === "center" && "text-center",
										col.align !== "right" && col.align !== "center" && "text-left",
										sortable && "cursor-pointer select-none hover:bg-[#d8dde3] transition-colors",
									)}
									style={{
										width: w,
										minWidth: w,
										maxWidth: w,
										backgroundColor: HEADER_BG,
									}}
								>
									<span className="inline-flex items-center gap-1 pr-1">
										{col.label}
										{sortable &&
											(active ? (
												sortDir === "asc" ? (
													<ChevronUp className="w-3 h-3 text-blue-600" />
												) : (
													<ChevronDown className="w-3 h-3 text-blue-600" />
												)
											) : (
												<ChevronsUpDown className="w-3 h-3 text-gray-300" />
											))}
									</span>
									{resizable && (
										<div
											className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-30"
											onMouseDown={startResize(col.key)}
											onClick={(e) => e.stopPropagation()}
										/>
									)}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{isLoading ? (
						Array.from({ length: 6 }).map((_, i) => (
							<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}>
								<td className="border border-gray-300 px-2 py-1.5 sticky left-0 bg-inherit w-10">
									<Skeleton className="h-3 w-4" />
								</td>
								{columns.map((col) => {
									const w = widths[col.key] ?? col.width ?? 110;
									return (
										<td
											key={col.key}
											className="border border-gray-300 px-2 py-1.5 overflow-hidden"
											style={{ width: w, minWidth: w, maxWidth: w }}
										>
											<Skeleton className="h-3 w-full" />
										</td>
									);
								})}
							</tr>
						))
					) : rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length + 1}
								className="border border-gray-300 px-4 py-10 text-center text-sm text-gray-400"
							>
								{emptyMessage || "Нет данных"}
							</td>
						</tr>
					) : (
						rows.map((row, index) => (
							<tr
								key={rowKey ? rowKey(row, index) : index}
								className={index % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}
							>
								<td className="border border-gray-300 px-2 py-1 text-center text-gray-400 text-[11px] sticky left-0 bg-inherit w-10">
									{index + 1}
								</td>
								{columns.map((col) => {
									const w = widths[col.key] ?? col.width ?? 110;
									return (
										<td
											key={col.key}
											className={cn(
												"border border-gray-300 px-2 py-1 text-gray-800 overflow-hidden",
												col.align === "right" && "text-right tabular-nums",
												col.align === "center" && "text-center",
											)}
											style={{ width: w, minWidth: w, maxWidth: w }}
										>
											{col.render(row, index)}
										</td>
									);
								})}
							</tr>
						))
					)}
				</tbody>
				{!isLoading && rows.length > 0 && footer && footer.length > 0 && (
					<tfoot>
						<tr className="bg-[#E8EAED] font-semibold">
							<td className="border border-gray-300 px-2 py-1.5 text-[11px] text-gray-600 sticky left-0 bg-[#E8EAED] w-10">
								Σ
							</td>
							{footer.map((cell, i) => (
								<td
									key={i}
									colSpan={cell.colSpan ?? 1}
									className={cn(
										"border border-gray-300 px-2 py-1.5 text-[11px] text-gray-700",
										cell.align === "right" && "text-right tabular-nums",
										cell.align === "center" && "text-center",
										cell.className,
									)}
								>
									{cell.content}
								</td>
							))}
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}
