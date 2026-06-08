import {
	type ColumnDef,
	type ColumnOrderState,
	type ColumnSizingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	type VisibilityState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ChevronsUpDown,
	Download,
	FileSearch,
	Rows2,
	Rows3,
	Rows4,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	fetchRemoteTablePrefs,
	loadLocalTablePrefs,
	mergeTablePrefs,
	saveLocalTablePrefs,
	scheduleRemoteTablePrefsSave,
	type TableViewLayout,
} from "@/lib/table-view-prefs";

export type TableDensity = "compact" | "normal" | "comfortable";

type Persisted = TableViewLayout;

const DENSITY_PADDING: Record<TableDensity, string> = {
	compact: "py-1.5",
	normal: "py-2.5",
	comfortable: "py-4",
};

export type DataTableColumnMeta = {
	exportLabel?: string;
	align?: "right" | "center";
	pinned?: "left" | "right";
	financeAmount?: boolean;
	/** Забирает свободную ширину справа (договор, контрагент) */
	grow?: boolean;
	/** Одна строка + ellipsis (по умолчанию для grow-колонок) */
	truncate?: boolean;
};

function toCsvValue(v: unknown): string {
	const s = v == null ? "" : String(v);
	if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

export type DataTableVariant = "default" | "excel";

export interface DataTableProps<T> {
	/** Уникальный id для сохранения раскладки пользователя */
	tableId: string;
	columns: ColumnDef<T, unknown>[];
	data: T[];
	isLoading?: boolean;
	emptyState?: React.ReactNode;
	onRowClick?: (row: T) => void;
	rowClassName?: (row: T) => string;
	/** Доп. контролы слева в тулбаре (фильтры, период) */
	toolbar?: React.ReactNode;
	/** Контролы справа перед «Столбцы» (компактный период и т.п.) */
	toolbarEnd?: React.ReactNode;
	enableSearch?: boolean;
	searchPlaceholder?: string;
	initialSorting?: SortingState;
	/** Строка итогов под таблицей (например суммы колонок) */
	footer?: React.ReactNode;
	/** default — корпоративная таблица; excel — плотная финансовая (аренда/ОДДС) */
	variant?: DataTableVariant;
	maxHeight?: string;
	/** № строки слева (excel) */
	showRowIndex?: boolean;
	/** Скрыть тулбар (плотный excel внутри отчёта) */
	hideToolbar?: boolean;
	getRowId?: (row: T, index: number) => string;
}

export function DataTable<T>({
	tableId,
	columns,
	data,
	isLoading,
	emptyState,
	onRowClick,
	rowClassName,
	toolbar,
	toolbarEnd,
	enableSearch,
	searchPlaceholder = "Поиск…",
	initialSorting = [],
	footer,
	variant = "default",
	maxHeight,
	showRowIndex = false,
	hideToolbar = false,
	getRowId,
}: DataTableProps<T>) {
	const isExcel = variant === "excel";
	const localSaved = useMemo(() => loadLocalTablePrefs(tableId), [tableId]);
	const saved = localSaved;
	const hadSavedSizing = Boolean(
		saved?.sizing && Object.keys(saved.sizing).length > 0,
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const skipAutoFillRef = useRef(hadSavedSizing);

	const [sorting, setSorting] = useState<SortingState>(
		isExcel ? initialSorting : (saved?.sorting ?? initialSorting),
	);
	const [visibility, setVisibility] = useState<VisibilityState>(
		saved?.visibility ?? {},
	);
	const [order, setOrder] = useState<ColumnOrderState>(saved?.order ?? []);
	const [sizing, setSizing] = useState<ColumnSizingState>(saved?.sizing ?? {});
	const [density, setDensity] = useState<TableDensity>(
		isExcel ? "compact" : (saved?.density ?? "normal"),
	);
	const [globalFilter, setGlobalFilter] = useState("");

	useEffect(() => {
		if (isExcel) return;
		let cancelled = false;
		void fetchRemoteTablePrefs(tableId).then((remote) => {
			if (cancelled) return;
			const merged = mergeTablePrefs(localSaved, remote);
			if (!merged) return;
			if (merged.sorting?.length) setSorting(merged.sorting);
			if (merged.visibility && Object.keys(merged.visibility).length) {
				setVisibility(merged.visibility);
			}
			if (merged.order?.length) setOrder(merged.order);
			if (merged.sizing && Object.keys(merged.sizing).length) {
				skipAutoFillRef.current = true;
				setSizing(merged.sizing);
			}
			if (merged.density) setDensity(merged.density);
		});
		return () => {
			cancelled = true;
		};
	}, [tableId, isExcel, localSaved]);

	useEffect(() => {
		if (isExcel) return;
		const prefs: Partial<Persisted> = { visibility, order, sizing, density, sorting };
		saveLocalTablePrefs(tableId, prefs);
		scheduleRemoteTablePrefsSave(tableId, prefs);
	}, [tableId, visibility, order, sizing, density, sorting, isExcel]);

	const table = useReactTable({
		data,
		columns,
		defaultColumn: {
			minSize: 56,
			maxSize: 960,
			size: 140,
			enableResizing: true,
		},
		getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
		state: {
			sorting,
			columnVisibility: visibility,
			columnOrder: order,
			columnSizing: sizing,
			globalFilter: enableSearch ? globalFilter : undefined,
		},
		onSortingChange: setSorting,
		onColumnVisibilityChange: setVisibility,
		onColumnOrderChange: setOrder,
		onColumnSizingChange: (updater) => {
			skipAutoFillRef.current = true;
			setSizing(updater);
		},
		onGlobalFilterChange: enableSearch ? setGlobalFilter : undefined,
		columnResizeMode: "onChange",
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: enableSearch ? getFilteredRowModel() : undefined,
	});

	const leafColumns = table.getAllLeafColumns();
	const padding = DENSITY_PADDING[density];
	const tableMinWidth = table.getTotalSize();

	const fillGrowColumns = useCallback(() => {
		if (isExcel || skipAutoFillRef.current) return;
		const el = containerRef.current;
		if (!el) return;
		const containerW = el.clientWidth;

		const visible = table.getVisibleLeafColumns();
		const growCols = visible.filter(
			(c) => (c.columnDef.meta as DataTableColumnMeta | undefined)?.grow,
		);
		if (!growCols.length) return;

		const fixedWidth = visible
			.filter((c) => !(c.columnDef.meta as DataTableColumnMeta | undefined)?.grow)
			.reduce((sum, c) => sum + c.getSize(), 0);
		const minGrow = growCols.reduce(
			(sum, c) => sum + (c.columnDef.minSize ?? 56),
			0,
		);
		if (containerW <= fixedWidth + minGrow) return;

		const perGrow = (containerW - fixedWidth) / growCols.length;
		setSizing((prev) => {
			const next = { ...prev };
			for (const col of growCols) {
				const min = col.columnDef.minSize ?? 56;
				const max = col.columnDef.maxSize ?? 960;
				next[col.id] = Math.min(max, Math.max(min, perGrow));
			}
			return next;
		});
	}, [isExcel, table]);

	useEffect(() => {
		if (isExcel) return;
		fillGrowColumns();
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => fillGrowColumns());
		ro.observe(el);
		return () => ro.disconnect();
	}, [fillGrowColumns, isExcel, data.length, leafColumns.length]);

	const moveColumn = (colId: string, dir: -1 | 1) => {
		const current =
			order.length > 0 ? [...order] : leafColumns.map((c) => c.id);
		const idx = current.indexOf(colId);
		if (idx === -1) return;
		const next = idx + dir;
		if (next < 0 || next >= current.length) return;
		[current[idx], current[next]] = [current[next], current[idx]];
		setOrder(current);
	};

	const exportCsv = () => {
		const cols = table
			.getVisibleLeafColumns()
			.filter((c) => c.id !== "__select" && c.id !== "__actions");
		const header = cols.map((c) => {
			const h = c.columnDef.meta as { exportLabel?: string } | undefined;
			return toCsvValue(h?.exportLabel ?? c.id);
		});
		const rows = table.getSortedRowModel().rows.map((r) =>
			cols
				.map((c) => {
					const v = r.getValue(c.id);
					return toCsvValue(v);
				})
				.join(","),
		);
		const csv = [header.join(","), ...rows].join("\n");
		const blob = new Blob([`\uFEFF${csv}`], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${tableId}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const densityBtn = (
		d: TableDensity,
		Icon: typeof Rows2,
		title: string,
	) => (
		<button
			type="button"
			title={title}
			onClick={() => setDensity(d)}
			className={cn(
				"p-1.5 rounded-full transition-colors",
				density === d
					? "bg-slate-950 text-white shadow-sm"
					: "text-slate-500 hover:bg-white/80",
			)}
		>
			<Icon className="w-4 h-4" />
		</button>
	);

	return (
		<div className="space-y-3">
			{!hideToolbar && (
				<div className="am-shell-filter p-2 flex items-center gap-2 flex-wrap rounded-[24px]">
				{toolbar}
				{enableSearch && (
					<div className="relative min-w-[220px] flex-1 sm:flex-none">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
						<Input
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							placeholder={searchPlaceholder}
							className="pl-8 h-10 w-full sm:w-64"
						/>
					</div>
				)}
				<div className="flex-1" />
				{toolbarEnd}
				<div className="flex items-center gap-0.5 rounded-full border border-slate-200/90 bg-white/70 p-0.5 shadow-sm shadow-slate-950/5">
					{densityBtn("compact", Rows4, "Компактно")}
					{densityBtn("normal", Rows3, "Средне")}
					{densityBtn("comfortable", Rows2, "Просторно")}
				</div>
				<Button
					variant="outline"
					size="sm"
					className="h-10 gap-1.5 text-sm"
					onClick={exportCsv}
				>
					<Download className="w-4 h-4" /> CSV
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="h-10 gap-1.5 text-sm"
						>
							<SlidersHorizontal className="w-4 h-4" /> Столбцы
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-60">
						<DropdownMenuLabel>Столбцы</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{table
							.getAllLeafColumns()
							.filter((c) => c.id !== "__select" && c.id !== "__actions")
							.map((col) => {
								const label =
									(col.columnDef.meta as { exportLabel?: string } | undefined)
										?.exportLabel ?? col.id;
								return (
									<div
										key={col.id}
										className="flex items-center gap-2 px-2 py-1.5 text-sm"
									>
										<input
											type="checkbox"
											className="rounded"
											checked={col.getIsVisible()}
											onChange={(e) => col.toggleVisibility(e.target.checked)}
										/>
										<span className="flex-1 truncate">{label}</span>
										<button
											type="button"
											title="Левее"
											className="text-gray-600 hover:text-gray-700 disabled:opacity-30"
											onClick={() => moveColumn(col.id, -1)}
										>
											<ArrowLeft className="w-3.5 h-3.5" />
										</button>
										<button
											type="button"
											title="Правее"
											className="text-gray-600 hover:text-gray-700 disabled:opacity-30"
											onClick={() => moveColumn(col.id, 1)}
										>
											<ArrowRight className="w-3.5 h-3.5" />
										</button>
									</div>
								);
							})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			)}

			<div
				ref={containerRef}
				className={cn(
					"overflow-auto",
					isExcel
						? "rounded-[24px] border border-slate-200/90 bg-white/86 shadow-xl shadow-slate-950/8 backdrop-blur-xl"
						: "am-card rounded-[24px] border border-white/70 bg-white/80 shadow-xl shadow-slate-950/8 backdrop-blur-xl",
				)}
				style={maxHeight ? { maxHeight } : undefined}
			>
				<table
					className={cn(
						"w-full table-fixed",
						isExcel
							? "text-xs border-separate border-spacing-0"
							: "text-sm",
					)}
					style={{ minWidth: tableMinWidth }}
				>
					<thead>
						{table.getHeaderGroups().map((hg) => (
							<tr
								key={hg.id}
								className={
									isExcel
										? "border-b border-slate-800/40 bg-slate-950 text-white"
										: "border-b border-slate-200/70 bg-slate-900 text-white"
								}
							>
								{showRowIndex && (
									<th
										className={cn(
											"border border-gray-300 text-center text-gray-500 font-semibold py-1.5 px-2 select-none sticky top-0 left-0 z-30 text-[11px] w-10",
											isExcel && "border-slate-800 bg-slate-950 text-white/70 shadow-none",
										)}
										style={{ width: 40 }}
									>
										#
									</th>
								)}
								{hg.headers.map((header) => {
									const canSort = header.column.getCanSort();
									const sorted = header.column.getIsSorted();
									const colMeta = header.column.columnDef.meta as
										| DataTableColumnMeta
										| undefined;
									const align = colMeta?.align;
									const isResizing = header.column.getIsResizing();
									return (
										<th
											key={header.id}
											style={{ width: header.getSize() }}
											className={cn(
												"relative select-none group/col",
												isExcel
													? "border border-slate-800/70 bg-slate-950 py-2 px-2 font-bold text-white/72 whitespace-nowrap text-[10px] uppercase tracking-[0.12em] sticky top-0 z-20"
													: "px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/78 whitespace-nowrap sticky top-0 z-20",
												align === "right"
													? "text-right"
													: align === "center"
														? "text-center"
														: "text-left",
											)}
										>
											{header.isPlaceholder ? null : (
												<button
													type="button"
													disabled={!canSort}
													onClick={header.column.getToggleSortingHandler()}
													className={cn(
														"inline-flex items-center gap-1 uppercase tracking-wide",
														canSort && "cursor-pointer hover:text-gray-600",
														align === "right" && "flex-row-reverse",
													)}
												>
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{canSort &&
														(sorted === "asc" ? (
															<ArrowUp className="w-3 h-3" />
														) : sorted === "desc" ? (
															<ArrowDown className="w-3 h-3" />
														) : (
															<ChevronsUpDown className="w-3 h-3 opacity-40" />
														))}
												</button>
											)}
											{header.column.getCanResize() && (
												<div
													role="separator"
													aria-orientation="vertical"
													aria-label="Изменить ширину столбца"
													onMouseDown={header.getResizeHandler()}
													onTouchStart={header.getResizeHandler()}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														"absolute right-0 top-0 z-20 h-full w-3 -mr-1.5 cursor-col-resize touch-none flex justify-center",
														isResizing
															? "bg-am-brand/30"
															: "hover:bg-am-brand/15",
													)}
												>
													<span
														className={cn(
															"w-0.5 h-full max-h-8 my-auto rounded-full transition-colors",
															isResizing
																? "bg-am-brand"
																: "bg-gray-300 group-hover/col:bg-am-brand",
														)}
													/>
												</div>
											)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={leafColumns.length + (showRowIndex ? 1 : 0)}
									className="text-center py-16 text-slate-500"
								>
									<div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
										Загрузка…
									</div>
								</td>
							</tr>
						) : table.getRowModel().rows.length === 0 ? (
							<tr>
								<td
									colSpan={leafColumns.length + (showRowIndex ? 1 : 0)}
									className="text-center py-16 text-slate-500"
								>
									{emptyState ?? (
										<div className="mx-auto flex max-w-sm flex-col items-center gap-3">
											<div className="grid h-14 w-14 place-items-center rounded-3xl border border-cyan-100 bg-cyan-50 text-cyan-700">
												<FileSearch className="h-6 w-6" />
											</div>
											<div>
												<p className="font-semibold text-slate-800">Данных пока нет</p>
												<p className="mt-1 text-sm text-slate-500">
													Создайте запись или измените фильтр периода.
												</p>
											</div>
										</div>
									)}
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row, rowIndex) => (
								<tr
									key={row.id}
									onClick={
										onRowClick ? () => onRowClick(row.original) : undefined
									}
									className={cn(
										isExcel
											? rowIndex % 2 === 0
												? "bg-white/80"
												: "bg-slate-50/80"
											: "border-b border-slate-100/80 bg-white/70 transition-colors odd:bg-white/55",
										onRowClick && "cursor-pointer hover:bg-cyan-50/70",
										rowClassName?.(row.original),
									)}
								>
									{showRowIndex && (
										<td className="border border-gray-300 px-2 py-1 text-center text-gray-600 text-[11px] sticky left-0 bg-inherit w-10">
											{rowIndex + 1}
										</td>
									)}
									{row.getVisibleCells().map((cell) => {
										const meta = cell.column.columnDef.meta as
											| DataTableColumnMeta
											| undefined;
										const align = meta?.align;
										const content = flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										);
										const truncate =
											meta?.truncate ??
											(meta?.grow === true && !isExcel);
										const title = truncate
											? String(cell.getValue() ?? "")
											: undefined;
										return (
											<td
												key={cell.id}
												style={{ width: cell.column.getSize() }}
												title={title}
												className={cn(
													isExcel
														? "border border-slate-100 px-2 py-2 text-slate-800 overflow-hidden"
														: ["px-3 text-slate-700", padding, "overflow-hidden"],
													align === "right"
														? "text-right"
														: align === "center"
															? "text-center"
															: "text-left",
													truncate && "truncate",
													isExcel &&
														meta?.financeAmount &&
														"tabular-nums font-mono text-[11px] text-emerald-700",
												)}
											>
												{content}
											</td>
										);
									})}
								</tr>
							))
						)}
					</tbody>
					{footer && <tfoot>{footer}</tfoot>}
				</table>
			</div>
		</div>
	);
}
