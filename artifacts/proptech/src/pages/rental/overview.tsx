import { ChevronDown, ChevronUp, Columns, ChevronsUpDown, Download, Pencil, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useListLeaseContracts, useListProperties } from "@/api-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type SortDir = "asc" | "desc";

interface ColDef {
	key: string;
	label: string;
	defaultVisible: boolean;
	align?: "right" | "center";
	width?: number;
}

const COLUMNS: ColDef[] = [
	{ key: "unitNumber",     label: "Объект",          defaultVisible: true,  width: 100 },
	{ key: "location",       label: "Локация",          defaultVisible: true,  width: 160 },
	{ key: "area",           label: "Площадь м²",       defaultVisible: true,  width: 90,  align: "right" },
	{ key: "tenantName",     label: "Арендатор",        defaultVisible: true,  width: 160 },
	{ key: "contractNumber", label: "№ договора",       defaultVisible: true,  width: 120 },
	{ key: "rentAmount",     label: "Ежемес. взнос",    defaultVisible: true,  width: 130, align: "right" },
	{ key: "currency",       label: "Вал.",             defaultVisible: false, width: 50,  align: "center" },
	{ key: "depositAmount",  label: "Депозит",          defaultVisible: true,  width: 120, align: "right" },
	{ key: "signDate",       label: "Подписан",         defaultVisible: true,  width: 100 },
	{ key: "startDate",      label: "Начало",           defaultVisible: true,  width: 100 },
	{ key: "endDate",        label: "Окончание",        defaultVisible: true,  width: 100 },
	{ key: "contractStatus", label: "Статус дог.",      defaultVisible: true,  width: 100, align: "center" },
	{ key: "propertyStatus", label: "Статус объекта",   defaultVisible: false, width: 110, align: "center" },
	{ key: "marketValue",    label: "Рын. стоимость",   defaultVisible: true,  width: 140, align: "right" },
	{ key: "roi",            label: "ROI % мес.",       defaultVisible: true,  width: 90,  align: "right" },
];

const STATUS_LABELS: Record<string, string> = {
	active:      "Активен",
	terminated:  "Расторгнут",
	expired:     "Истёк",
	rented:      "Сдаётся",
	vacant:      "Свободен",
	maintenance: "Обслуж.",
};

const STATUS_COLORS: Record<string, string> = {
	active:      "text-emerald-700 bg-emerald-50",
	terminated:  "text-gray-500 bg-gray-100",
	expired:     "text-amber-700 bg-amber-50",
	rented:      "text-emerald-700 bg-emerald-50",
	vacant:      "text-blue-700 bg-blue-50",
	maintenance: "text-amber-700 bg-amber-50",
};

function fmtDate(s: string | null | undefined) {
	if (!s) return "";
	const d = new Date(s);
	return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function fmtNum(v: number) {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v);
}

// Inline editable cell for market value
function MarketValueCell({ propertyId, value, onSaved }: { propertyId: number; value: number | null; onSaved: () => void }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value != null ? String(value) : "");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		setSaving(true);
		try {
			await api.patch(`/rental/properties/${propertyId}`, {
				marketValue: draft === "" ? null : parseFloat(draft),
			});
			onSaved();
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	if (editing) {
		return (
			<div className="flex items-center gap-1">
				<input
					autoFocus
					type="number"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
					className="w-24 text-xs border border-blue-400 rounded px-1 py-0.5 outline-none tabular-nums text-right"
				/>
				<button onClick={save} disabled={saving} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
				<button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
			</div>
		);
	}

	return (
		<span
			className="group/mv inline-flex items-center gap-1 cursor-pointer"
			onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }}
		>
			{value != null ? (
				<span className="tabular-nums text-gray-700">{fmtNum(value)}</span>
			) : (
				<span className="text-gray-300 italic text-[11px]">Нажмите</span>
			)}
			<Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/mv:opacity-100 transition-opacity" />
		</span>
	);
}

export default function RentalOverview() {
	const qc = useQueryClient();
	const { data: leases, isLoading: leasesLoading } = useListLeaseContracts();
	const { data: properties, isLoading: propsLoading } = useListProperties();

	const [sortKey, setSortKey] = useState("unitNumber");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [visibleCols, setVisibleCols] = useState<Set<string>>(
		new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
	);

	const leasesArr = Array.isArray(leases) ? leases : [];
	const propsArr  = Array.isArray(properties) ? properties : [];

	const propMap = useMemo(
		() => Object.fromEntries(propsArr.map((p) => [p.id, p])),
		[propsArr],
	);

	const rows = useMemo(() => {
		return leasesArr.map((lease) => {
			const prop = (propMap[lease.propertyId] ?? {}) as any;
			const rent = parseFloat(String(lease.rentAmount || "0"));
			const mv = prop.marketValue != null ? parseFloat(String(prop.marketValue)) : null;
			const roi = mv != null && mv > 0 ? (rent / mv) * 100 : null;

			const parts = [prop.projectName, prop.block ? `корп. ${prop.block}` : null, prop.floor ? `эт. ${prop.floor}` : null]
				.filter(Boolean);

			return {
				id:             lease.id,
				propertyId:     lease.propertyId,
				unitNumber:     lease.propertyUnitNumber || `#${lease.propertyId}`,
				location:       parts.join(", ") || "—",
				area:           prop.area != null ? parseFloat(String(prop.area)) : null as number | null,
				tenantName:     lease.tenantName || `Арендатор #${(lease as any).tenantId}`,
				contractNumber: lease.contractNumber,
				rentAmount:     rent,
				currency:       lease.currency || "KGS",
				depositAmount:  parseFloat(String(lease.depositAmount || "0")),
				signDate:       lease.signDate,
				startDate:      lease.startDate,
				endDate:        lease.endDate,
				contractStatus: lease.status,
				propertyStatus: prop.rentalStatus ?? "",
				marketValue:    mv,
				roi,
			};
		});
	}, [leasesArr, propMap]);

	const sorted = useMemo(() => {
		return [...rows].sort((a, b) => {
			const av = (a as any)[sortKey];
			const bv = (b as any)[sortKey];
			if (av == null || av === "") return 1;
			if (bv == null || bv === "") return -1;
			const cmp = typeof av === "number"
				? av - bv
				: String(av).localeCompare(String(bv), "ru");
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [rows, sortKey, sortDir]);

	const handleSort = (key: string) => {
		setSortKey(key);
		setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
	};

	const toggleCol = (key: string) => {
		setVisibleCols((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const visibleDefs = COLUMNS.filter((c) => visibleCols.has(c.key));
	const isLoading = leasesLoading || propsLoading;

	const activeRows = rows.filter((r) => r.contractStatus === "active");
	const totalRent    = rows.reduce((s, r) => s + r.rentAmount, 0);
	const totalDeposit = rows.reduce((s, r) => s + r.depositAmount, 0);
	const totalArea    = rows.reduce((s, r) => s + (r.area ?? 0), 0);
	const totalMV      = rows.reduce((s, r) => s + (r.marketValue ?? 0), 0);
	const avgRoi       = rows.filter((r) => r.roi != null).length > 0
		? rows.filter((r) => r.roi != null).reduce((s, r) => s + r.roi!, 0) / rows.filter((r) => r.roi != null).length
		: null;

	const exportCsv = () => {
		const header = ["#", ...visibleDefs.map((c) => c.label)].join(";");
		const lines = sorted.map((row, i) => {
			const cells = visibleDefs.map((col) => {
				const v = (row as any)[col.key];
				if (col.key === "signDate" || col.key === "startDate" || col.key === "endDate") return fmtDate(v);
				if (col.key === "contractStatus" || col.key === "propertyStatus") return STATUS_LABELS[v] ?? v ?? "";
				if (col.key === "roi") return v != null ? v.toFixed(2) + "%" : "";
				if (v == null || v === "") return "";
				return String(v);
			});
			return [i + 1, ...cells].join(";");
		});
		const csv = [header, ...lines].join("\n");
		const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "rental-overview.csv";
		a.click();
	};

	return (
		<div className="flex flex-col gap-4 h-full">
			{/* Toolbar */}
			<div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Свод аренды</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						{rows.length} записей · {activeRows.length} активных · взносы&nbsp;
						<span className="font-medium text-gray-800">{fmtNum(totalRent)} с</span>
						{avgRoi != null && (
							<> · ср. ROI&nbsp;<span className="font-medium text-emerald-700">{avgRoi.toFixed(2)}%/мес</span></>
						)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<button className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
								<Columns className="w-3.5 h-3.5" />
								Столбцы
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-52 p-2" align="end">
							<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">Столбцы</p>
							{COLUMNS.map((col) => (
								<label key={col.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
									<input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-blue-600" />
									<span className="text-xs text-gray-700">{col.label}</span>
								</label>
							))}
						</PopoverContent>
					</Popover>

					<button onClick={exportCsv} className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
						<Download className="w-3.5 h-3.5" />
						CSV
					</button>
				</div>
			</div>

			{/* Excel table */}
			<div className="overflow-auto border border-gray-300 rounded-sm" style={{ maxHeight: "calc(100vh - 200px)" }}>
				<table className="text-xs border-collapse" style={{ minWidth: visibleDefs.reduce((s, c) => s + (c.width ?? 100), 50) + "px" }}>
					<thead className="sticky top-0 z-20">
						{/* Column letters */}
						<tr>
							<th className="border border-gray-300 bg-gray-100 text-center text-gray-400 font-normal select-none" style={{ width: 40, minWidth: 40 }} />
							{visibleDefs.map((col, i) => (
								<th key={col.key} className="border border-gray-300 bg-gray-100 text-center text-gray-400 font-normal py-0.5 select-none" style={{ minWidth: col.width ?? 100 }}>
									{String.fromCharCode(65 + i)}
								</th>
							))}
						</tr>
						{/* Header labels */}
						<tr>
							<th className="border border-gray-300 bg-[#E8EAED] text-center text-gray-500 font-semibold py-1.5 px-2 select-none sticky left-0 z-10 text-[11px]">#</th>
							{visibleDefs.map((col) => (
								<th
									key={col.key}
									onClick={() => handleSort(col.key)}
									className="border border-gray-300 bg-[#E8EAED] text-left py-1.5 px-2 font-semibold text-gray-700 cursor-pointer select-none hover:bg-[#d8dde3] transition-colors whitespace-nowrap text-[11px]"
								>
									<span className="inline-flex items-center gap-1">
										{col.label}
										{sortKey === col.key
											? sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
											: <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
									</span>
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{isLoading ? (
							Array.from({ length: 8 }).map((_, i) => (
								<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}>
									<td className="border border-gray-200 text-center text-gray-300 py-1.5 px-2 sticky left-0 z-10" style={{ background: "inherit" }}>{i + 1}</td>
									{visibleDefs.map((col) => (
										<td key={col.key} className="border border-gray-200 py-1.5 px-2">
											<div className="h-3 bg-gray-200 rounded animate-pulse" />
										</td>
									))}
								</tr>
							))
						) : sorted.length === 0 ? (
							<tr><td colSpan={visibleDefs.length + 1} className="border border-gray-200 text-center text-gray-400 py-16">Нет данных</td></tr>
						) : (
							sorted.map((row, i) => {
								const bg = i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]";
								const isEndingSoon = row.endDate && (() => {
									const diff = (new Date(row.endDate!).getTime() - Date.now()) / 86400000;
									return diff >= 0 && diff <= 30;
								})();
								const isExpired = row.endDate && new Date(row.endDate) < new Date();
								return (
									<tr key={row.id} className={cn(bg, "hover:bg-[#EEF2FF] transition-colors")}>
										<td className="border border-gray-200 text-center text-gray-400 py-1 px-2 sticky left-0 z-10 select-none" style={{ background: "inherit" }}>{i + 1}</td>
										{visibleDefs.map((col) => {
											const v = (row as any)[col.key];
											const alignClass = col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left";

											if (col.key === "marketValue") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>
														<MarketValueCell
															propertyId={row.propertyId}
															value={row.marketValue}
															onSaved={() => qc.invalidateQueries({ queryKey: ["listProperties"] })}
														/>
													</td>
												);
											}

											if (col.key === "roi") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>
														{v != null ? (
															<span className={cn("font-medium", v >= 1 ? "text-emerald-600" : "text-gray-600")}>
																{v.toFixed(2)}%
															</span>
														) : (
															<span className="text-gray-300">—</span>
														)}
													</td>
												);
											}

											if (col.key === "contractStatus" || col.key === "propertyStatus") {
												const label = STATUS_LABELS[v] ?? v ?? "";
												const color = STATUS_COLORS[v] ?? "text-gray-500 bg-gray-100";
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>
														{label ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", color)}>{label}</span> : ""}
													</td>
												);
											}

											if (col.key === "rentAmount") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2 font-medium text-gray-800", alignClass)}>
														{v > 0 ? fmtNum(v) : ""}
													</td>
												);
											}

											if (col.key === "depositAmount") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-600", alignClass)}>
														{v > 0 ? fmtNum(v) : ""}
													</td>
												);
											}

											if (col.key === "area") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-600", alignClass)}>
														{v != null ? String(v) : ""}
													</td>
												);
											}

											if (col.key === "endDate") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2 tabular-nums", alignClass, isExpired ? "text-rose-600 font-medium" : isEndingSoon ? "text-amber-600 font-medium" : "text-gray-600")}>
														{fmtDate(v)}
													</td>
												);
											}

											if (col.key === "signDate" || col.key === "startDate") {
												return (
													<td key={col.key} className={cn("border border-gray-200 py-1 px-2 tabular-nums text-gray-600", alignClass)}>
														{fmtDate(v)}
													</td>
												);
											}

											return (
												<td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-700", alignClass)}>
													{v ?? ""}
												</td>
											);
										})}
									</tr>
								);
							})
						)}
					</tbody>

					{sorted.length > 0 && (
						<tfoot className="sticky bottom-0 z-20">
							<tr className="bg-[#E8EAED] font-semibold">
								<td className="border border-gray-300 text-center text-gray-500 py-1.5 px-2 text-[11px] sticky left-0 z-10 bg-[#E8EAED]">Σ</td>
								{visibleDefs.map((col) => {
									const alignClass = col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left";
									if (col.key === "rentAmount") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800", alignClass)}>{fmtNum(totalRent)}</td>;
									if (col.key === "depositAmount") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800", alignClass)}>{fmtNum(totalDeposit)}</td>;
									if (col.key === "area") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800", alignClass)}>{fmtNum(totalArea)}</td>;
									if (col.key === "marketValue") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800", alignClass)}>{totalMV > 0 ? fmtNum(totalMV) : ""}</td>;
									if (col.key === "roi") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-emerald-700", alignClass)}>{avgRoi != null ? `${avgRoi.toFixed(2)}%` : ""}</td>;
									if (col.key === "unitNumber") return <td key={col.key} className="border border-gray-300 py-1.5 px-2 text-gray-500 text-[11px]">Итого: {sorted.length}</td>;
									return <td key={col.key} className="border border-gray-300 py-1.5 px-2" />;
								})}
							</tr>
						</tfoot>
					)}
				</table>
			</div>

			<p className="text-[11px] text-gray-400">
				* Рыночная стоимость вводится вручную прямо в ячейке · ROI = Ежемес. взнос ÷ Рын. стоимость × 100%
			</p>
		</div>
	);
}
