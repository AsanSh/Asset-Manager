/**
 * RentalExcelTable — совместимый API для финансовых страниц аренды.
 * Рендер через DataTable variant="excel" (единая сортировка, resize, CSV).
 */
import type { ReactNode } from "react";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { rentalExcelColumnsToDefs } from "@/lib/rental-table-adapter";

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

export function RentalExcelTable<T>({
	columns,
	rows,
	sortKey,
	sortDir,
	onSort: _onSort,
	isLoading,
	emptyMessage,
	footer,
	rowKey,
	maxHeight = "calc(100vh - 300px)",
	tableId = "rental-excel",
}: {
	columns: RentalExcelColumn<T>[];
	rows: T[];
	/** @deprecated Сортировка в DataTable; оставлено для совместимости вызовов */
	sortKey?: string;
	sortDir?: "asc" | "desc";
	onSort?: (key: string) => void;
	isLoading?: boolean;
	emptyMessage?: string;
	footer?: FooterCell[];
	rowKey?: (row: T, index: number) => string | number;
	maxHeight?: string;
	tableId?: string;
}) {
	const columnDefs = useMemo(
		() => rentalExcelColumnsToDefs(columns),
		[columns],
	);

	const initialSorting =
		sortKey && sortDir
			? [{ id: sortKey, desc: sortDir === "desc" }]
			: [];

	const tfoot =
		!isLoading && rows.length > 0 && footer && footer.length > 0 ? (
			<tr className="bg-[#E8EAED] font-semibold">
				<td className="border border-gray-300 px-2 py-1.5 text-[11px] text-gray-600 sticky left-0 bg-[#E8EAED] w-10">
					Σ
				</td>
				{footer.map((cell, i) => (
					<td
						key={i}
						colSpan={cell.colSpan ?? 1}
						className={[
							"border border-gray-300 px-2 py-1.5 text-[11px] text-gray-700",
							cell.align === "right" && "text-right tabular-nums",
							cell.align === "center" && "text-center",
							cell.className,
						]
							.filter(Boolean)
							.join(" ")}
					>
						{cell.content}
					</td>
				))}
			</tr>
		) : undefined;

	return (
		<DataTable
			tableId={tableId}
			variant="excel"
			maxHeight={maxHeight}
			showRowIndex
			hideToolbar
			columns={columnDefs}
			data={rows}
			isLoading={isLoading}
			emptyState={emptyMessage || "Нет данных"}
			initialSorting={initialSorting}
			getRowId={
				rowKey
					? (row, index) => String(rowKey(row, index))
					: undefined
			}
			footer={tfoot}
		/>
	);
}
