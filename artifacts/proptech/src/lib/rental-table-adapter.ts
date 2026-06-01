import type { ColumnDef } from "@tanstack/react-table";
import type { RentalExcelColumn } from "@/components/rental/rental-excel-table";

/** Конвертация legacy RentalExcelColumn → ColumnDef для DataTable / Tablo. */
export function rentalExcelColumnsToDefs<T>(
	columns: RentalExcelColumn<T>[],
): ColumnDef<T, unknown>[] {
	return columns.map((col) => ({
		id: col.key,
		header: col.label,
		size: col.width ?? 110,
		enableSorting: col.sortable !== false,
		enableResizing: col.resizable !== false,
		meta: {
			exportLabel: col.label,
			align: col.align,
			financeAmount: col.align === "right",
		},
		accessorFn: (row) => {
			const v = (row as Record<string, unknown>)[col.key];
			if (col.key === "amount" || col.key === "balance" || col.key === "total") {
				return parseFloat(String(v ?? "0")) || 0;
			}
			return v ?? "";
		},
		cell: ({ row }) => col.render(row.original, row.index),
	}));
}
