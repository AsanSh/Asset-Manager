import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, BarChart, Download, FileText, Package, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type WarehouseItem = {
	id: number;
	name: string;
	category?: string | null;
	unit?: string | null;
	currentStock?: number | string | null;
	minStock?: number | string | null;
	unitPrice?: number | string | null;
	currency?: string | null;
};

type IncomingOperation = {
	id: number;
	date: string;
	itemId?: number | null;
	itemName?: string | null;
	quantity?: number | string | null;
	totalPrice?: number | string | null;
	currency?: string | null;
	supplierName?: string | null;
	documentNumber?: string | null;
};

type OutgoingOperation = {
	id: number;
	date: string;
	itemId?: number | null;
	itemName?: string | null;
	quantity?: number | string | null;
	recipientName?: string | null;
	purpose?: string | null;
};

type MovementRow = {
	id: string;
	date: string;
	item: string;
	type: "incoming" | "outgoing";
	quantity: number;
	amount: number;
	counterparty: string;
	document: string;
};

function num(value: unknown) {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}

function formatDate(date: string) {
	return date ? new Date(date).toLocaleDateString("ru-RU") : "—";
}

function money(amount: number, currency = "KGS") {
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

function downloadCsv(filename: string, rows: MovementRow[]) {
	const header = ["Дата", "Тип", "Товар", "Количество", "Сумма", "Контрагент", "Документ"];
	const body = rows.map((row) => [
		formatDate(row.date),
		row.type === "incoming" ? "Поступление" : "Списание",
		row.item,
		String(row.quantity),
		String(row.amount),
		row.counterparty,
		row.document,
	]);
	const csv = [header, ...body]
		.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
		.join("\n");
	const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export default function WarehouseReports() {
	const { toast } = useToast();
	const [reportType, setReportType] = useState("movements");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

	const { data: items = [], isLoading: itemsLoading } = useQuery<WarehouseItem[]>({
		queryKey: ["warehouse-items"],
		queryFn: () => api.get("/warehouse/items").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: incoming = [], isLoading: incomingLoading } = useQuery<IncomingOperation[]>({
		queryKey: ["warehouse-incoming"],
		queryFn: () => api.get("/warehouse/incoming").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});
	const { data: outgoing = [], isLoading: outgoingLoading } = useQuery<OutgoingOperation[]>({
		queryKey: ["warehouse-outgoing"],
		queryFn: () => api.get("/warehouse/outgoing").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const movementRows = useMemo<MovementRow[]>(() => {
		const ins = incoming.map((op) => ({
			id: `in-${op.id}`,
			date: op.date,
			item: op.itemName || `Товар #${op.itemId ?? "—"}`,
			type: "incoming" as const,
			quantity: num(op.quantity),
			amount: num(op.totalPrice),
			counterparty: op.supplierName || "Поставщик не указан",
			document: op.documentNumber || "—",
		}));
		const outs = outgoing.map((op) => ({
			id: `out-${op.id}`,
			date: op.date,
			item: op.itemName || `Товар #${op.itemId ?? "—"}`,
			type: "outgoing" as const,
			quantity: num(op.quantity),
			amount: 0,
			counterparty: op.recipientName || op.purpose || "Получатель не указан",
			document: "—",
		}));
		return [...ins, ...outs]
			.filter((row) => inPeriod(row.date, period))
			.sort((a, b) => String(b.date).localeCompare(String(a.date)));
	}, [incoming, outgoing, period]);

	const totalIncomingQty = movementRows
		.filter((row) => row.type === "incoming")
		.reduce((sum, row) => sum + row.quantity, 0);
	const totalOutgoingQty = movementRows
		.filter((row) => row.type === "outgoing")
		.reduce((sum, row) => sum + row.quantity, 0);
	const totalIncomingAmount = movementRows.reduce((sum, row) => sum + row.amount, 0);
	const inventoryValue = items.reduce(
		(sum, item) => sum + num(item.currentStock) * num(item.unitPrice),
		0,
	);

	const columns = useMemo<ColumnDef<MovementRow, unknown>[]>(
		() => [
			{
				id: "date",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.date,
				meta: { exportLabel: "Дата", pinned: "left" },
				cell: ({ row }) => formatDate(row.original.date),
			},
			{
				id: "type",
				header: "Тип",
				size: 130,
				accessorFn: (row) => row.type,
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => (
					<Badge
						className={
							row.original.type === "incoming"
								? "bg-emerald-100 text-emerald-700"
								: "bg-rose-100 text-rose-700"
						}
					>
						{row.original.type === "incoming" ? "Поступление" : "Списание"}
					</Badge>
				),
			},
			{
				accessorKey: "item",
				header: "Товар",
				size: 220,
				meta: { exportLabel: "Товар" },
				cell: ({ row }) => <span className="font-semibold">{row.original.item}</span>,
			},
			{
				id: "quantity",
				header: "Количество",
				size: 120,
				accessorFn: (row) => row.quantity,
				meta: { exportLabel: "Количество", align: "right" },
				cell: ({ row }) => <span className="font-mono">{row.original.quantity}</span>,
			},
			{
				id: "amount",
				header: "Сумма",
				size: 130,
				accessorFn: (row) => row.amount,
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-semibold">
						{row.original.amount > 0 ? money(row.original.amount) : "—"}
					</span>
				),
			},
			{
				accessorKey: "counterparty",
				header: "Контрагент / получатель",
				size: 220,
				meta: { exportLabel: "Контрагент / получатель" },
			},
			{
				accessorKey: "document",
				header: "Документ",
				size: 120,
				meta: { exportLabel: "Документ" },
			},
		],
		[],
	);

	const isLoading = itemsLoading || incomingLoading || outgoingLoading;

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
							Складская аналитика
						</div>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
							Отчёты по складу
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-slate-500">
							Единый отчет по движению, остаткам и закупочной стоимости без
							демо-строк.
						</p>
					</div>
					<Button
						variant="outline"
						className="gap-2"
						onClick={() => {
							if (movementRows.length === 0) {
								toast({ title: "Нет данных для экспорта" });
								return;
							}
							downloadCsv("warehouse-report.csv", movementRows);
						}}
					>
						<Download className="h-4 w-4" />
						Экспорт CSV
					</Button>
				</div>
			</section>

			<Card className="rounded-3xl border-slate-200 shadow-sm">
				<CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center">
					<PeriodPicker value={period} onChange={setPeriod} />
					<Select value={reportType} onValueChange={setReportType}>
						<SelectTrigger className="w-full xl:w-64">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="movements">
								<div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Движение товаров</div>
							</SelectItem>
							<SelectItem value="inventory">
								<div className="flex items-center gap-2"><Package className="h-4 w-4" />Остатки на складе</div>
							</SelectItem>
							<SelectItem value="turnover">
								<div className="flex items-center gap-2"><BarChart className="h-4 w-4" />Оборачиваемость</div>
							</SelectItem>
							<SelectItem value="suppliers">
								<div className="flex items-center gap-2"><FileText className="h-4 w-4" />Закупки у поставщиков</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Поступило", value: totalIncomingQty, caption: money(totalIncomingAmount), icon: ArrowDownCircle, tone: "text-emerald-700 bg-emerald-50" },
					{ label: "Списано", value: totalOutgoingQty, caption: "единиц за период", icon: ArrowUpCircle, tone: "text-rose-700 bg-rose-50" },
					{ label: "Движений", value: movementRows.length, caption: "операций", icon: TrendingUp, tone: "text-cyan-700 bg-cyan-50" },
					{ label: "Стоимость остатков", value: money(inventoryValue), caption: `${items.length} позиций`, icon: Package, tone: "text-blue-700 bg-blue-50" },
				].map((metric) => (
					<Card key={metric.label} className="rounded-3xl border-slate-200 shadow-sm">
						<CardContent className="p-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm text-slate-500">{metric.label}</p>
									<div className="mt-2 text-2xl font-black text-slate-950">{metric.value}</div>
									<p className="mt-1 text-xs text-slate-500">{metric.caption}</p>
								</div>
								<div className={`rounded-2xl p-3 ${metric.tone}`}>
									<metric.icon className="h-5 w-5" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<DataTable
				tableId="warehouse-reports"
				columns={columns}
				data={movementRows}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по товару, контрагенту, документу..."
				initialSorting={[{ id: "date", desc: true }]}
				emptyState="За выбранный период движений по складу нет"
			/>
		</div>
	);
}
