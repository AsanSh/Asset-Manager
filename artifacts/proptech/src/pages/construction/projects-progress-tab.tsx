import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Tablo } from "@/components/am";
import type { DataTableColumnMeta } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
	loadProgressColumnConfig,
	newCustomColumnId,
	saveProgressColumnConfig,
	type ProgressColumnConfig,
	type ProgressCustomColumn,
} from "@/lib/progress-projects-column-config";
import { cn } from "@/lib/utils";

export type ProgressSummaryRow = {
	projectId: number;
	projectName: string;
	isTotal?: boolean;
	totalSaleableArea: number;
	nonSaleableArea: number;
	soldArea: number;
	unsoldArea: number;
	avgSalePricePerSqm: number;
	contracted: number;
	collected: number;
	collectionsRemainder: number;
	futureSales: number;
	totalRevenue: number;
	grossProfit: number;
	marginPerSqm: number;
	overdueDebt: number;
	pdPercent: number;
	approvedCostPerSqm: number;
	actualCostPerSqm: number;
	currentCostPerSqm: number;
	constructionCosts: number;
	landCosts: number;
	documentationCosts: number;
	otherCosts: number;
	requiredAmount: number;
	projectBudget: number;
	totalSpent: number;
	[key: string]: string | number | boolean | undefined;
};

const COLUMN_GROUPS = [
	{ id: "projectData", label: "ДАННЫЕ ПО ПРОЕКТУ" },
	{ id: "collections", label: "СБОРЫ" },
	{ id: "profitability", label: "ПРИБЫЛЬНОСТЬ" },
	{ id: "cost", label: "СЕБЕСТОИМОСТЬ" },
	{ id: "expenses", label: "ЗАТРАТЫ" },
	{ id: "custom", label: "ДОПОЛНИТЕЛЬНО" },
] as const;

type BuiltinColumn = {
	id: string;
	groupId: string;
	defaultLabel: string;
	kind: "text" | "area" | "money" | "moneyPerSqm" | "percent";
	accessor: (row: ProgressSummaryRow) => number | string;
};

const BUILTIN_COLUMNS: BuiltinColumn[] = [
	{
		id: "projectName",
		groupId: "projectData",
		defaultLabel: "Проект",
		kind: "text",
		accessor: (r) => r.projectName,
	},
	{
		id: "totalSaleableArea",
		groupId: "projectData",
		defaultLabel: "Общая продажная площадь",
		kind: "area",
		accessor: (r) => r.totalSaleableArea,
	},
	{
		id: "nonSaleableArea",
		groupId: "projectData",
		defaultLabel: "Не продаваемая площадь",
		kind: "area",
		accessor: (r) => r.nonSaleableArea,
	},
	{
		id: "soldArea",
		groupId: "projectData",
		defaultLabel: "Проданная площадь",
		kind: "area",
		accessor: (r) => r.soldArea,
	},
	{
		id: "unsoldArea",
		groupId: "projectData",
		defaultLabel: "Остаток непроданной площади",
		kind: "area",
		accessor: (r) => r.unsoldArea,
	},
	{
		id: "avgSalePricePerSqm",
		groupId: "projectData",
		defaultLabel: "Средняя стоимость продажи 1м²",
		kind: "moneyPerSqm",
		accessor: (r) => r.avgSalePricePerSqm,
	},
	{
		id: "contracted",
		groupId: "collections",
		defaultLabel: "Законтрактовано",
		kind: "money",
		accessor: (r) => r.contracted,
	},
	{
		id: "collected",
		groupId: "collections",
		defaultLabel: "Собрано",
		kind: "money",
		accessor: (r) => r.collected,
	},
	{
		id: "collectionsRemainder",
		groupId: "collections",
		defaultLabel: "Остаток",
		kind: "money",
		accessor: (r) => r.collectionsRemainder,
	},
	{
		id: "futureSales",
		groupId: "collections",
		defaultLabel: "Будущие продажи",
		kind: "money",
		accessor: (r) => r.futureSales,
	},
	{
		id: "totalRevenue",
		groupId: "collections",
		defaultLabel: "Итого выручка",
		kind: "money",
		accessor: (r) => r.totalRevenue,
	},
	{
		id: "grossProfit",
		groupId: "profitability",
		defaultLabel: "Валовая прибыль",
		kind: "money",
		accessor: (r) => r.grossProfit,
	},
	{
		id: "marginPerSqm",
		groupId: "profitability",
		defaultLabel: "Маржа за 1м²",
		kind: "moneyPerSqm",
		accessor: (r) => r.marginPerSqm,
	},
	{
		id: "overdueDebt",
		groupId: "profitability",
		defaultLabel: "Просроченная задолженность",
		kind: "money",
		accessor: (r) => r.overdueDebt,
	},
	{
		id: "pdPercent",
		groupId: "profitability",
		defaultLabel: "PD%",
		kind: "percent",
		accessor: (r) => r.pdPercent,
	},
	{
		id: "approvedCostPerSqm",
		groupId: "cost",
		defaultLabel: "Утвержденная",
		kind: "moneyPerSqm",
		accessor: (r) => r.approvedCostPerSqm,
	},
	{
		id: "actualCostPerSqm",
		groupId: "cost",
		defaultLabel: "Фактическая",
		kind: "moneyPerSqm",
		accessor: (r) => r.actualCostPerSqm,
	},
	{
		id: "currentCostPerSqm",
		groupId: "cost",
		defaultLabel: "Текущая",
		kind: "moneyPerSqm",
		accessor: (r) => r.currentCostPerSqm,
	},
	{
		id: "constructionCosts",
		groupId: "expenses",
		defaultLabel: "Строительство",
		kind: "money",
		accessor: (r) => r.constructionCosts,
	},
	{
		id: "landCosts",
		groupId: "expenses",
		defaultLabel: "Земля",
		kind: "money",
		accessor: (r) => r.landCosts,
	},
	{
		id: "documentationCosts",
		groupId: "expenses",
		defaultLabel: "Документация",
		kind: "money",
		accessor: (r) => r.documentationCosts,
	},
	{
		id: "otherCosts",
		groupId: "expenses",
		defaultLabel: "Другие расходы",
		kind: "money",
		accessor: (r) => r.otherCosts,
	},
	{
		id: "requiredAmount",
		groupId: "expenses",
		defaultLabel: "Необходимая сумма",
		kind: "money",
		accessor: (r) => r.requiredAmount,
	},
	{
		id: "projectBudget",
		groupId: "expenses",
		defaultLabel: "Бюджет проекта",
		kind: "money",
		accessor: (r) => r.projectBudget,
	},
];

const fmtArea = (v: number) =>
	v > 0
		? v.toLocaleString("ru-KG", { maximumFractionDigits: 2 })
		: "—";

const fmtMoney = (v: number) =>
	Math.abs(v) > 0
		? v.toLocaleString("ru-KG", { maximumFractionDigits: 0 })
		: "—";

const fmtPercent = (v: number) =>
	v > 0
		? `${v.toLocaleString("ru-KG", { maximumFractionDigits: 1 })}%`
		: "—";

function formatCell(kind: BuiltinColumn["kind"], value: number | string): string {
	if (kind === "text") return String(value || "—");
	const n = typeof value === "number" ? value : parseFloat(String(value));
	if (Number.isNaN(n)) return "—";
	if (kind === "area") return fmtArea(n);
	if (kind === "money") return fmtMoney(n);
	if (kind === "moneyPerSqm") return n > 0 ? `${fmtMoney(n)} сом/м²` : "—";
	if (kind === "percent") return fmtPercent(n);
	return String(value);
}

function sumRows(rows: ProgressSummaryRow[], pick: (r: ProgressSummaryRow) => number): number {
	return rows.reduce((s, r) => s + (pick(r) || 0), 0);
}

function buildTotalsRow(rows: ProgressSummaryRow[]): ProgressSummaryRow {
	const soldArea = sumRows(rows, (r) => r.soldArea);
	const soldRevenue = rows.reduce(
		(s, r) => s + (r.soldArea > 0 ? r.avgSalePricePerSqm * r.soldArea : 0),
		0,
	);
	const totalConstruction = sumRows(rows, (r) => r.totalSaleableArea + r.nonSaleableArea);
	const totalSpent = sumRows(rows, (r) => r.totalSpent);
	return {
		projectId: 0,
		projectName: "ИТОГО",
		isTotal: true,
		totalSaleableArea: sumRows(rows, (r) => r.totalSaleableArea),
		nonSaleableArea: sumRows(rows, (r) => r.nonSaleableArea),
		soldArea,
		unsoldArea: sumRows(rows, (r) => r.unsoldArea),
		avgSalePricePerSqm: soldArea > 0 ? soldRevenue / soldArea : 0,
		contracted: sumRows(rows, (r) => r.contracted),
		collected: sumRows(rows, (r) => r.collected),
		collectionsRemainder: sumRows(rows, (r) => r.collectionsRemainder),
		futureSales: sumRows(rows, (r) => r.futureSales),
		totalRevenue: sumRows(rows, (r) => r.totalRevenue),
		grossProfit: sumRows(rows, (r) => r.grossProfit),
		marginPerSqm: soldArea > 0 ? sumRows(rows, (r) => r.grossProfit) / soldArea : 0,
		overdueDebt: sumRows(rows, (r) => r.overdueDebt),
		pdPercent:
			sumRows(rows, (r) => r.contracted) > 0
				? (sumRows(rows, (r) => r.overdueDebt) / sumRows(rows, (r) => r.contracted)) * 100
				: 0,
		approvedCostPerSqm: 0,
		actualCostPerSqm: totalConstruction > 0 ? totalSpent / totalConstruction : 0,
		currentCostPerSqm: totalConstruction > 0 ? totalSpent / totalConstruction : 0,
		constructionCosts: sumRows(rows, (r) => r.constructionCosts),
		landCosts: sumRows(rows, (r) => r.landCosts),
		documentationCosts: sumRows(rows, (r) => r.documentationCosts),
		otherCosts: sumRows(rows, (r) => r.otherCosts),
		requiredAmount: sumRows(rows, (r) => r.requiredAmount),
		projectBudget: sumRows(rows, (r) => r.projectBudget),
		totalSpent,
	};
}

function ColumnSettingsDialog({
	open,
	onOpenChange,
	config,
	onSave,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	config: ProgressColumnConfig;
	onSave: (c: ProgressColumnConfig) => void;
}) {
	const [draft, setDraft] = useState(config);
	const [newLabel, setNewLabel] = useState("");
	const [newGroup, setNewGroup] = useState<string>("custom");

	const resetDraft = useCallback(() => setDraft(config), [config]);

	const updateLabel = (columnId: string, label: string) => {
		setDraft((prev) => ({
			...prev,
			labelOverrides: { ...prev.labelOverrides, [columnId]: label },
		}));
	};

	const addCustom = () => {
		const label = newLabel.trim();
		if (!label) return;
		const col: ProgressCustomColumn = {
			id: newCustomColumnId(),
			label,
			groupId: newGroup,
		};
		setDraft((prev) => ({
			...prev,
			customColumns: [...prev.customColumns, col],
		}));
		setNewLabel("");
	};

	const removeCustom = (id: string) => {
		setDraft((prev) => {
			const { [id]: _removed, ...restValues } = prev.customValues;
			return {
				...prev,
				customColumns: prev.customColumns.filter((c) => c.id !== id),
				customValues: restValues,
			};
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (v) resetDraft();
				onOpenChange(v);
			}}
		>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Настройка столбцов</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Переименуйте заголовки, добавьте свои числовые столбцы (значения
					сохраняются локально). Порядок и видимость — в меню «Столбцы» таблицы.
				</p>
				<div className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Встроенные столбцы
					</p>
					{BUILTIN_COLUMNS.map((col) => (
						<div key={col.id} className="grid gap-1">
							<Label className="text-xs text-muted-foreground">{col.defaultLabel}</Label>
							<Input
								value={draft.labelOverrides[col.id] ?? col.defaultLabel}
								onChange={(e) => updateLabel(col.id, e.target.value)}
							/>
						</div>
					))}
				</div>
				<div className="space-y-3 pt-4 border-t">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Свои столбцы
					</p>
					{draft.customColumns.map((col) => (
						<div key={col.id} className="flex gap-2 items-end">
							<div className="flex-1 grid gap-1">
								<Label className="text-xs">Название</Label>
								<Input
									value={col.label}
									onChange={(e) =>
										setDraft((prev) => ({
											...prev,
											customColumns: prev.customColumns.map((c) =>
												c.id === col.id ? { ...c, label: e.target.value } : c,
											),
										}))
									}
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-rose-600 shrink-0"
								onClick={() => removeCustom(col.id)}
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					))}
					<div className="flex flex-wrap gap-2 items-end">
						<div className="flex-1 min-w-[140px] grid gap-1">
							<Label className="text-xs">Новый столбец</Label>
							<Input
								placeholder="Название"
								value={newLabel}
								onChange={(e) => setNewLabel(e.target.value)}
							/>
						</div>
						<Select value={newGroup} onValueChange={setNewGroup}>
							<SelectTrigger className="w-[160px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{COLUMN_GROUPS.map((g) => (
									<SelectItem key={g.id} value={g.id}>
										{g.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button type="button" variant="outline" onClick={addCustom} className="gap-1">
							<Plus className="w-4 h-4" /> Добавить
						</Button>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Отмена
					</Button>
					<Button
						onClick={() => {
							onSave(draft);
							onOpenChange(false);
						}}
					>
						Сохранить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ProjectsProgressTab() {
	const [columnConfig, setColumnConfig] = useState(loadProgressColumnConfig);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["construction-projects-progress"],
		queryFn: () =>
			api
				.get<ProgressSummaryRow[]>("/construction/projects/progress-summary")
				.then((r) => r.data),
	});

	const projectRows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
	const totalsRow = useMemo(() => buildTotalsRow(projectRows), [projectRows]);
	const tableData = useMemo(
		() => [totalsRow, ...projectRows],
		[totalsRow, projectRows],
	);

	const labelFor = useCallback(
		(columnId: string, defaultLabel: string) =>
			columnConfig.labelOverrides[columnId]?.trim() || defaultLabel,
		[columnConfig.labelOverrides],
	);

	const setCustomValue = useCallback(
		(columnId: string, projectId: number, raw: string) => {
			const num = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
			const value = Number.isFinite(num) ? num : 0;
			setColumnConfig((prev) => {
				const next: ProgressColumnConfig = {
					...prev,
					customValues: {
						...prev.customValues,
						[columnId]: {
							...(prev.customValues[columnId] ?? {}),
							[String(projectId)]: value,
						},
					},
				};
				saveProgressColumnConfig(next);
				return next;
			});
		},
		[],
	);

	const columns = useMemo((): ColumnDef<ProgressSummaryRow, unknown>[] => {
		const customByGroup = new Map<string, ProgressCustomColumn[]>();
		for (const c of columnConfig.customColumns) {
			const list = customByGroup.get(c.groupId) ?? [];
			list.push(c);
			customByGroup.set(c.groupId, list);
		}

		const makeLeaf = (
			col: BuiltinColumn | ProgressCustomColumn,
			kind: BuiltinColumn["kind"],
			isCustom: boolean,
		): ColumnDef<ProgressSummaryRow, unknown> => {
			const id = col.id;
			const defaultLabel = isCustom
				? (col as ProgressCustomColumn).label
				: (col as BuiltinColumn).defaultLabel;
			const meta: DataTableColumnMeta = {
				align: kind === "text" ? undefined : "right",
				financeAmount: kind === "money" || kind === "moneyPerSqm",
				exportLabel: labelFor(id, defaultLabel),
				...(id === "projectName" ? { pinned: "left" as const } : {}),
			};
			return {
				id,
				accessorFn: (row) => {
					if (isCustom) {
						if (row.isTotal) return "";
						const vals = columnConfig.customValues[id];
						return vals?.[String(row.projectId)] ?? "";
					}
					if (kind === "text") return (col as BuiltinColumn).accessor(row);
					return (col as BuiltinColumn).accessor(row) as number;
				},
				header: labelFor(id, defaultLabel),
				size: id === "projectName" ? 180 : 120,
				meta,
				cell: ({ row, getValue }) => {
					const val = getValue();
					if (isCustom && !row.original.isTotal) {
						const num = parseFloat(String(val));
						const display = Number.isFinite(num) && num !== 0 ? fmtMoney(num) : "—";
						return (
							<Input
								className="h-7 font-mono tabular-nums text-right border-transparent bg-transparent hover:border-slate-200 focus:border-cyan-400"
								defaultValue={Number.isFinite(num) && num !== 0 ? String(num) : ""}
								placeholder="—"
								onBlur={(e) =>
									setCustomValue(id, row.original.projectId, e.target.value)
								}
								onKeyDown={(e) => {
									if (e.key === "Enter") (e.target as HTMLInputElement).blur();
								}}
								title={display}
							/>
						);
					}
					const text = formatCell(kind, val as number | string);
					const isMoney = kind !== "text" && kind !== "area";
					return (
						<span
							className={cn(
								"block w-full",
								kind === "text" ? "font-semibold" : "font-mono tabular-nums text-right",
								isMoney && Number(val) > 0 && "text-emerald-700",
								isMoney && Number(val) < 0 && "text-rose-700",
							)}
						>
							{text}
						</span>
					);
				},
			};
		};

		return COLUMN_GROUPS.map((group) => {
			const builtins = BUILTIN_COLUMNS.filter((c) => c.groupId === group.id);
			const customs = customByGroup.get(group.id) ?? [];
			const leaves: ColumnDef<ProgressSummaryRow, unknown>[] = [
				...builtins.map((c) => makeLeaf(c, c.kind, false)),
				...customs.map((c) => makeLeaf(c, "money", true)),
			];
			if (leaves.length === 0) return null;
			return {
				id: group.id,
				header: group.label,
				columns: leaves,
			};
		}).filter(Boolean) as ColumnDef<ProgressSummaryRow, unknown>[];
	}, [columnConfig, labelFor, setCustomValue]);

	const persistConfig = (next: ProgressColumnConfig) => {
		setColumnConfig(next);
		saveProgressColumnConfig(next);
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-10 w-full max-w-xl" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
				Не удалось загрузить сводку прогресса. Проверьте API и обновите страницу.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm text-muted-foreground">
					{projectRows.length} проектов · площади и продажи из шахматки, сборы из
					договоров, затраты из расходов
				</p>
				<Button
					variant="outline"
					size="sm"
					className="gap-2"
					onClick={() => setSettingsOpen(true)}
				>
					<Settings2 className="w-4 h-4" /> Столбцы
				</Button>
			</div>
			<Tablo
				tableId="progress-projects"
				title="Прогресс по проектам"
				columns={columns}
				data={tableData}
				variant="excel"
				showRowIndex
				enableSearch
				searchPlaceholder="Поиск проекта…"
				getRowId={(row) => (row.isTotal ? "total" : String(row.projectId))}
				rowClassName={(row) =>
					row.isTotal ? "bg-slate-100 font-bold border-t-2 border-slate-300" : ""
				}
				initialSorting={[]}
			/>
			<ColumnSettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				config={columnConfig}
				onSave={persistConfig}
			/>
		</div>
	);
}
