import * as XLSX from "xlsx";
import {
	AlertTriangle, Building2, Check, ChevronDown, ChevronUp, ChevronsUpDown,
	Columns, Download, FileSpreadsheet, Loader2, Pencil, Percent,
	TrendingUp, Upload, Users, X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListLeaseContracts, useListProperties } from "@/api-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc";

interface ColDef {
	key: string; label: string; defaultVisible: boolean;
	align?: "right" | "center"; width?: number;
}

interface ImportRow {
	rowNum: number;
	tenantName: string; phone: string;
	projectName: string; floor: number | null; unitNumber: string; area: number | null;
	currency: string; rentAmount: number; depositAmount: number;
	signDate: string; startDate: string; endDate: string;
	status: "active" | "draft";
}

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS: ColDef[] = [
	{ key: "unitNumber",     label: "Объект",           defaultVisible: true,  width: 100 },
	{ key: "location",       label: "Локация / Адрес",  defaultVisible: true,  width: 170 },
	{ key: "area",           label: "Площадь м²",       defaultVisible: true,  width: 90,  align: "right"  },
	{ key: "tenantName",     label: "Арендатор",        defaultVisible: true,  width: 170 },
	{ key: "contractNumber", label: "№ договора",       defaultVisible: true,  width: 130 },
	{ key: "rentAmount",     label: "Ежемес. взнос",    defaultVisible: true,  width: 140, align: "right"  },
	{ key: "currency",       label: "Вал.",             defaultVisible: false, width: 50,  align: "center" },
	{ key: "depositAmount",  label: "Депозит",          defaultVisible: false, width: 130, align: "right"  },
	{ key: "signDate",       label: "Дата подписания",  defaultVisible: true,  width: 120 },
	{ key: "startDate",      label: "Дата начала",      defaultVisible: true,  width: 110 },
	{ key: "endDate",        label: "Дата завершения",  defaultVisible: true,  width: 120 },
	{ key: "daysLeft",       label: "Дней осталось",    defaultVisible: true,  width: 110, align: "right"  },
	{ key: "contractStatus", label: "Статус дог.",      defaultVisible: true,  width: 105, align: "center" },
	{ key: "propertyStatus", label: "Статус объекта",   defaultVisible: false, width: 115, align: "center" },
	{ key: "marketValue",    label: "Рын. стоимость",   defaultVisible: true,  width: 150, align: "right"  },
	{ key: "roi",            label: "ROI % мес.",       defaultVisible: true,  width: 100, align: "right"  },
];

const STATUS_LABELS: Record<string, string> = {
	active: "Активен", draft: "Черновик", terminated: "Расторгнут",
	expired: "Истёк", rented: "Сдаётся", vacant: "Свободен", maintenance: "Обслуж.",
};
const STATUS_COLORS: Record<string, string> = {
	active: "text-emerald-700 bg-emerald-50", draft: "text-gray-500 bg-gray-100",
	terminated: "text-gray-500 bg-gray-100", expired: "text-amber-700 bg-amber-50",
	rented: "text-emerald-700 bg-emerald-50", vacant: "text-blue-700 bg-blue-50",
	maintenance: "text-amber-700 bg-amber-50",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s: string | null | undefined) {
	if (!s) return "";
	const d = new Date(s);
	return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function fmtNum(v: number) {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v);
}
function excelDateToISO(serial: number | string | null): string {
	if (!serial || isNaN(Number(serial))) return "";
	const n = Number(serial);
	if (n < 1000) return ""; // not a date
	return new Date(Math.round((n - 25569) * 86400) * 1000).toISOString().slice(0, 10);
}

// ── Inline editable market value ──────────────────────────────────────────────
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
			onSaved(); setEditing(false);
		} finally { setSaving(false); }
	};
	if (editing) return (
		<div className="flex items-center gap-1">
			<input autoFocus type="number" value={draft} onChange={e => setDraft(e.target.value)}
				onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
				className="w-24 text-xs border border-blue-400 rounded px-1 py-0.5 outline-none tabular-nums text-right" />
			<button onClick={save} disabled={saving} className="text-emerald-600"><Check className="w-3 h-3" /></button>
			<button onClick={() => setEditing(false)} className="text-gray-400"><X className="w-3 h-3" /></button>
		</div>
	);
	return (
		<span className="group/mv inline-flex items-center gap-1 cursor-pointer"
			onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }}>
			{value != null
				? <span className="tabular-nums text-gray-700">{fmtNum(value)}</span>
				: <span className="text-gray-300 italic text-[11px]">Нажмите</span>}
			<Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/mv:opacity-100 transition-opacity" />
		</span>
	);
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({ rows, onClose, onDone }: { rows: ImportRow[]; onClose: () => void; onDone: () => void }) {
	const [step, setStep] = useState<"preview" | "progress" | "done">("preview");
	const [progress, setProgress] = useState({ done: 0, total: rows.length, errors: 0, log: [] as string[] });

	const startImport = async () => {
		setStep("progress");
		let done = 0; let errors = 0; const log: string[] = [];

		for (const row of rows) {
			try {
				// 1. Create tenant
				const tenantRes = await api.post("/rental/tenants", {
					fullName: row.tenantName,
					phone: row.phone || null,
					status: "active",
					type: "individual",
				});
				const tenantId = tenantRes.data.id;

				// 2. Create property
				const propRes = await api.post("/rental/properties", {
					projectName: row.projectName,
					unitNumber: row.unitNumber,
					floor: row.floor,
					area: row.area,
					status: "available",
					rentalStatus: row.status === "active" ? "rented" : "vacant",
				});
				const propertyId = propRes.data.id;

				// 3. Create lease contract
				const contractNumber = `IMP-${row.projectName.slice(0, 6).replace(/\s/g, "")}-${row.unitNumber}-${Date.now().toString(36).slice(-4)}`.toUpperCase();
				await api.post("/rental/contracts", {
					propertyId, tenantId, contractNumber,
					signDate: row.signDate || null,
					startDate: row.startDate || new Date().toISOString().slice(0, 10),
					endDate: row.endDate || null,
					rentAmount: row.rentAmount,
					currency: row.currency || "KGS",
					depositAmount: row.depositAmount || 0,
					accrualDay: 1,
					status: row.status,
				});

				done++;
				log.push(`✓ ${row.tenantName} — ${row.projectName} каб.${row.unitNumber}`);
			} catch (e: any) {
				errors++;
				log.push(`✗ ${row.tenantName}: ${e?.response?.data?.error ?? e.message}`);
			}
			setProgress({ done: done + errors, total: rows.length, errors, log: [...log] });
		}
		setStep("done");
	};

	return (
		<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
					<h2 className="font-semibold text-gray-900 flex items-center gap-2">
						<FileSpreadsheet className="w-5 h-5 text-emerald-600" />
						{step === "preview" && `Импорт — предпросмотр (${rows.length} записей)`}
						{step === "progress" && "Импорт..."}
						{step === "done" && "Импорт завершён"}
					</h2>
					{step !== "progress" && (
						<button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
					)}
				</div>

				{/* Body */}
				<div className="flex-1 overflow-auto">
					{step === "preview" && (
						<div className="overflow-auto">
							<table className="w-full text-xs border-collapse">
								<thead className="sticky top-0 bg-gray-50">
									<tr>
										{["#", "Арендатор", "Телефон", "Адрес / Проект", "Эт.", "Каб.", "Площ.", "Валюта", "Взнос", "Депозит", "Нач.", "Оконч.", "Статус"].map(h => (
											<th key={h} className="border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{rows.map((r, i) => (
										<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
											<td className="border border-gray-200 px-2 py-1 text-gray-400">{r.rowNum}</td>
											<td className="border border-gray-200 px-2 py-1 font-medium text-gray-800 whitespace-nowrap">{r.tenantName}</td>
											<td className="border border-gray-200 px-2 py-1 text-gray-500">{r.phone}</td>
											<td className="border border-gray-200 px-2 py-1 text-gray-600 max-w-[160px] truncate">{r.projectName}</td>
											<td className="border border-gray-200 px-2 py-1 text-center">{r.floor}</td>
											<td className="border border-gray-200 px-2 py-1 text-center font-medium">{r.unitNumber}</td>
											<td className="border border-gray-200 px-2 py-1 text-right tabular-nums">{r.area}</td>
											<td className="border border-gray-200 px-2 py-1 text-center">{r.currency}</td>
											<td className="border border-gray-200 px-2 py-1 text-right tabular-nums font-medium">{fmtNum(r.rentAmount)}</td>
											<td className="border border-gray-200 px-2 py-1 text-right tabular-nums">{r.depositAmount > 0 ? fmtNum(r.depositAmount) : ""}</td>
											<td className="border border-gray-200 px-2 py-1 tabular-nums">{fmtDate(r.startDate)}</td>
											<td className="border border-gray-200 px-2 py-1 tabular-nums">{fmtDate(r.endDate)}</td>
											<td className="border border-gray-200 px-2 py-1">
												<span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
													{r.status === "active" ? "Активен" : "Черновик"}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{(step === "progress" || step === "done") && (
						<div className="p-5 space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between text-sm text-gray-600">
									<span>{progress.done} / {progress.total}</span>
									<span className={progress.errors > 0 ? "text-rose-600" : "text-emerald-600"}>
										{step === "done" ? (progress.errors > 0 ? `${progress.errors} ошибок` : "Всё успешно") : "Импортируем..."}
									</span>
								</div>
								<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
									<div className="h-full bg-emerald-500 rounded-full transition-all"
										style={{ width: `${(progress.done / progress.total) * 100}%` }} />
								</div>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-[11px] text-gray-600 space-y-0.5">
								{progress.log.map((l, i) => (
									<div key={i} className={l.startsWith("✓") ? "text-emerald-700" : "text-rose-600"}>{l}</div>
								))}
								{step === "progress" && <div className="flex items-center gap-1 text-blue-500"><Loader2 className="w-3 h-3 animate-spin" /> обработка...</div>}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 flex-shrink-0">
					{step === "preview" && (
						<>
							<button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
							<button onClick={startImport} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
								<Upload className="w-4 h-4" /> Импортировать {rows.length} записей
							</button>
						</>
					)}
					{step === "done" && (
						<button onClick={() => { onDone(); onClose(); }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							Готово
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Edit dialog ───────────────────────────────────────────────────────────────
interface EditRow {
	id: number; propertyId: number; tenantId: number;
	tenantName: string; contractNumber: string;
	projectName: string; unitNumber: string; block: string; floor: number | null; area: number | null;
	rentAmount: number; currency: string; depositAmount: number;
	signDate: string | null; startDate: string | null; endDate: string | null;
	contractStatus: string; marketValue: number | null;
}

function EditRowDialog({ row, onClose, onSaved }: { row: EditRow; onClose: () => void; onSaved: () => void }) {
	const [form, setForm] = useState({
		tenantName:    row.tenantName,
		contractNumber: row.contractNumber,
		projectName:   row.projectName,
		unitNumber:    row.unitNumber,
		block:         row.block ?? "",
		floor:         row.floor != null ? String(row.floor) : "",
		area:          row.area != null ? String(row.area) : "",
		rentAmount:    String(row.rentAmount),
		currency:      row.currency,
		depositAmount: String(row.depositAmount),
		signDate:      row.signDate ?? "",
		startDate:     row.startDate ?? "",
		endDate:       row.endDate ?? "",
		contractStatus: row.contractStatus,
		marketValue:   row.marketValue != null ? String(row.marketValue) : "",
	});
	const [saving, setSaving] = useState(false);
	const [error, setError]   = useState("");

	const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
		setForm(f => ({ ...f, [k]: e.target.value }));

	const save = async () => {
		setSaving(true); setError("");
		try {
			await Promise.all([
				api.patch(`/rental/tenants/${row.tenantId}`, { fullName: form.tenantName }),
				api.patch(`/rental/properties/${row.propertyId}`, {
					projectName: form.projectName,
					unitNumber:  form.unitNumber,
					block:       form.block || null,
					floor:       form.floor !== "" ? parseInt(form.floor, 10) : null,
					area:        form.area  !== "" ? parseFloat(form.area)  : null,
					marketValue: form.marketValue !== "" ? parseFloat(form.marketValue) : null,
				}),
				api.patch(`/rental/contracts/${row.id}`, {
					signDate:      form.signDate      || null,
					startDate:     form.startDate     || null,
					endDate:       form.endDate       || null,
					rentAmount:    parseFloat(form.rentAmount)    || 0,
					currency:      form.currency,
					depositAmount: parseFloat(form.depositAmount) || 0,
					status:        form.contractStatus,
				}),
			]);
			onSaved(); onClose();
		} catch (e: any) {
			setError(e?.response?.data?.error ?? e.message ?? "Ошибка сохранения");
		} finally { setSaving(false); }
	};

	const F = ({ label, name, type = "text", options }: { label: string; name: string; type?: string; options?: { value: string; label: string }[] }) => (
		<div>
			<label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
			{options ? (
				<select value={(form as any)[name]} onChange={set(name)}
					className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
					{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
			) : (
				<input type={type} value={(form as any)[name]} onChange={set(name)}
					className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
			)}
		</div>
	);

	return (
		<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
				<div className="flex items-center justify-between px-5 py-4 border-b">
					<h2 className="font-semibold text-gray-900 text-sm">Редактирование строки</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
				</div>
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
					<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Арендатор</p>
					<F label="ФИО / Название" name="tenantName" />

					<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Объект</p>
					<div className="grid grid-cols-2 gap-3">
						<F label="Проект / Адрес" name="projectName" />
						<F label="Номер (кабинет)" name="unitNumber" />
						<F label="Корпус / Блок" name="block" />
						<F label="Этаж" name="floor" type="number" />
						<F label="Площадь м²" name="area" type="number" />
						<F label="Рын. стоимость" name="marketValue" type="number" />
					</div>

					<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Договор</p>
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2"><F label="Номер договора" name="contractNumber" /></div>
						<F label="Взнос" name="rentAmount" type="number" />
						<F label="Валюта" name="currency" options={[
							{ value: "KGS", label: "KGS — Сом" },
							{ value: "USD", label: "USD — Доллар" },
							{ value: "EUR", label: "EUR — Евро" },
							{ value: "RUB", label: "RUB — Рубль" },
						]} />
						<F label="Депозит" name="depositAmount" type="number" />
						<F label="Статус" name="contractStatus" options={[
							{ value: "active", label: "Активен" },
							{ value: "draft",  label: "Черновик" },
							{ value: "terminated", label: "Расторгнут" },
							{ value: "expired",    label: "Истёк" },
						]} />
						<F label="Дата подписания" name="signDate" type="date" />
						<F label="Дата начала" name="startDate" type="date" />
						<div className="col-span-2"><F label="Дата завершения" name="endDate" type="date" /></div>
					</div>
					{error && <p className="text-xs text-rose-600">{error}</p>}
				</div>
				<div className="flex justify-end gap-2 px-5 py-3 border-t">
					<button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
					<button onClick={save} disabled={saving}
						className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{saving && <Loader2 className="w-4 h-4 animate-spin" />} Сохранить
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────
interface NbkrRate { name: string; rate: string; scale: string; }
interface NbkrResponse { date: string; rates: Record<string, NbkrRate>; }

function unitInKgs(currency: string, rates: Record<string, NbkrRate>): number {
	if (currency === "KGS") return 1;
	const r = rates[currency];
	if (!r) return 1;
	return parseFloat(r.rate) / (parseFloat(r.scale || "1") || 1);
}

export default function RentalSummary() {
	const qc = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);
	const { data: leases, isLoading: leasesLoading } = useListLeaseContracts();
	const { data: properties, isLoading: propsLoading } = useListProperties();
	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const [sortKey, setSortKey]         = useState("unitNumber");
	const [sortDir, setSortDir]         = useState<SortDir>("asc");
	const [visibleCols, setVisibleCols] = useState<Set<string>>(
		new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key)),
	);
	const [importRows, setImportRows]   = useState<ImportRow[] | null>(null);
	const [editRow, setEditRow]         = useState<EditRow | null>(null);

	const leasesArr = Array.isArray(leases)     ? leases     : [];
	const propsArr  = Array.isArray(properties) ? properties : [];

	const propMap = useMemo(() => Object.fromEntries(propsArr.map(p => [p.id, p])), [propsArr]);

	const rows = useMemo(() => leasesArr.map(lease => {
		const prop = (propMap[lease.propertyId] ?? {}) as any;
		const rent = parseFloat(String(lease.rentAmount || "0"));
		const mv   = prop.marketValue != null ? parseFloat(String(prop.marketValue)) : null;
		const roi  = mv != null && mv > 0 ? (rent / mv) * 100 : null;
		const daysLeft = lease.endDate ? Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / 86400000) : null;
		const locParts = [prop.projectName, prop.block ? `корп. ${prop.block}` : null, prop.floor ? `эт. ${prop.floor}` : null].filter(Boolean);
		return {
			id: lease.id, propertyId: lease.propertyId,
			tenantId: (lease as any).tenantId as number,
			unitNumber: lease.propertyUnitNumber || `#${lease.propertyId}`,
			location:   locParts.join(", ") || "—",
			type:       prop.type ?? "",
			area:       prop.area != null ? parseFloat(String(prop.area)) : null as number | null,
			floor:      prop.floor ?? null as number | null,
			block:      prop.block ?? "" as string,
			projectName: prop.projectName ?? "" as string,
			tenantName: lease.tenantName || `Арендатор #${(lease as any).tenantId}`,
			contractNumber: lease.contractNumber,
			rentAmount: rent, currency: lease.currency || "KGS",
			depositAmount: parseFloat(String(lease.depositAmount || "0")),
			signDate: lease.signDate, startDate: lease.startDate, endDate: lease.endDate,
			daysLeft, contractStatus: lease.status,
			propertyStatus: prop.rentalStatus ?? "",
			marketValue: mv, roi,
		};
	}), [leasesArr, propMap]);

	const sorted = useMemo(() => [...rows].sort((a, b) => {
		const av = (a as any)[sortKey]; const bv = (b as any)[sortKey];
		if (av == null || av === "") return 1; if (bv == null || bv === "") return -1;
		const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv), "ru");
		return sortDir === "asc" ? cmp : -cmp;
	}), [rows, sortKey, sortDir]);

	const handleSort = (key: string) => { setSortKey(key); setSortDir(d => (sortKey === key && d === "asc" ? "desc" : "asc")); };
	const toggleCol  = (key: string) => setVisibleCols(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
	const visibleDefs = COLUMNS.filter(c => visibleCols.has(c.key));
	const isLoading   = leasesLoading || propsLoading;

	// KPI aggregates
	const nbkrRates = nbkr?.rates ?? {};
	const activeRows    = rows.filter(r => r.contractStatus === "active");
	const totalArea     = rows.reduce((s, r) => s + (r.area ?? 0), 0);
	const totalMV       = rows.reduce((s, r) => s + (r.marketValue ?? 0), 0);

	// Per-currency totals (rent)
	const rentByCurrency = useMemo(() => {
		const m = new Map<string, number>();
		for (const r of sorted) {
			const cur = r.currency || "KGS";
			m.set(cur, (m.get(cur) ?? 0) + r.rentAmount);
		}
		return m;
	}, [sorted]);

	const depositByCurrency = useMemo(() => {
		const m = new Map<string, number>();
		for (const r of sorted) {
			const cur = r.currency || "KGS";
			m.set(cur, (m.get(cur) ?? 0) + r.depositAmount);
		}
		return m;
	}, [sorted]);

	// Grand total in KGS (converted)
	const totalRentKgs = useMemo(() =>
		Array.from(rentByCurrency.entries()).reduce(
			(s, [cur, amt]) => s + amt * unitInKgs(cur, nbkrRates), 0,
		), [rentByCurrency, nbkrRates]);

	// Legacy single-value for export/toolbar fallback
	const totalRent    = totalRentKgs;
	const totalDeposit = Array.from(depositByCurrency.entries()).reduce(
		(s, [cur, amt]) => s + amt * unitInKgs(cur, nbkrRates), 0,
	);
	const roiRows       = rows.filter(r => r.roi != null);
	const avgRoi        = roiRows.length > 0 ? roiRows.reduce((s, r) => s + r.roi!, 0) / roiRows.length : null;
	const expiringIn30  = rows.filter(r => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30).length;
	const totalProps    = propsArr.length;
	const occupancy     = totalProps > 0 ? Math.round((propsArr.filter((p: any) => p.rentalStatus === "rented").length / totalProps) * 100) : 0;

	// ── Excel import ──────────────────────────────────────────────────────────
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = ev => {
			const data = new Uint8Array(ev.target!.result as ArrayBuffer);
			const wb = XLSX.read(data, { type: "array" });
			const ws = wb.Sheets[wb.SheetNames[0]];
			const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" }) as any[][];

			// Find header row (look for row with "Арендатор")
			let headerIdx = raw.findIndex(r => r.some(c => String(c).includes("Арендатор")));
			if (headerIdx < 0) headerIdx = 1;

			const parsed: ImportRow[] = [];
			for (let i = headerIdx + 1; i < raw.length; i++) {
				const r = raw[i];
				const tenantName = String(r[1] || "").trim();
				if (!tenantName || typeof r[0] !== "number") continue;

				const startDate = excelDateToISO(r[16]);
				if (!startDate) continue; // skip rows without start date

				parsed.push({
					rowNum:        Number(r[0]),
					tenantName,
					phone:         String(r[2] || "").trim(),
					projectName:   String(r[7] || "").trim() || "Без адреса",
					floor:         r[8] ? parseInt(String(r[8]), 10) : null,
					unitNumber:    String(r[9] || "").trim() || String(r[0]),
					area:          r[10] ? parseFloat(String(r[10])) : null,
					currency:      String(r[12] || "KGS").trim() || "KGS",
					rentAmount:    parseFloat(String(r[13] || "0")) || 0,
					depositAmount: parseFloat(String(r[14] || "0")) || 0,
					signDate:      excelDateToISO(r[15]),
					startDate,
					endDate:       excelDateToISO(r[17]),
					status:        String(r[4] || "").includes("Сдан") ? "active" : "draft",
				});
			}
			setImportRows(parsed);
		};
		reader.readAsArrayBuffer(file);
		e.target.value = "";
	};

	// ── Excel export ──────────────────────────────────────────────────────────
	const exportXlsx = () => {
		const header = ["#", ...visibleDefs.map(c => c.label)];
		const data = sorted.map((row, i) => {
			const cells: any[] = [i + 1];
			for (const col of visibleDefs) {
				const v = (row as any)[col.key];
				if (["signDate","startDate","endDate"].includes(col.key)) { cells.push(fmtDate(v)); continue; }
				if (["contractStatus","propertyStatus"].includes(col.key)) { cells.push(STATUS_LABELS[v] ?? v ?? ""); continue; }
				if (col.key === "roi") { cells.push(v != null ? parseFloat(v.toFixed(2)) : ""); continue; }
				if (col.key === "daysLeft") { cells.push(v ?? ""); continue; }
				cells.push(v ?? "");
			}
			return cells;
		});

		const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
		// Style header row (bold via column widths)
		ws["!cols"] = visibleDefs.map(c => ({ wch: Math.max(c.label.length + 2, 12) }));

		// Add totals row
		const totalsRow: any[] = ["Итого"];
		for (const col of visibleDefs) {
			if (col.key === "rentAmount") totalsRow.push(totalRent);
			else if (col.key === "depositAmount") totalsRow.push(totalDeposit);
			else if (col.key === "area") totalsRow.push(totalArea);
			else if (col.key === "marketValue") totalsRow.push(totalMV || "");
			else if (col.key === "roi") totalsRow.push(avgRoi != null ? parseFloat(avgRoi.toFixed(2)) : "");
			else totalsRow.push("");
		}
		XLSX.utils.sheet_add_aoa(ws, [totalsRow], { origin: -1 });

		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Свод аренды");
		XLSX.writeFile(wb, `rental-summary-${new Date().toISOString().slice(0,10)}.xlsx`);
	};

	const exportCsv = () => {
		const header = ["#", ...visibleDefs.map(c => c.label)].join(";");
		const lines = sorted.map((row, i) => {
			const cells = visibleDefs.map(col => {
				const v = (row as any)[col.key];
				if (["signDate","startDate","endDate"].includes(col.key)) return fmtDate(v);
				if (["contractStatus","propertyStatus"].includes(col.key)) return STATUS_LABELS[v] ?? v ?? "";
				if (col.key === "roi") return v != null ? v.toFixed(2) + "%" : "";
				return v == null || v === "" ? "" : String(v);
			});
			return [i + 1, ...cells].join(";");
		});
		const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
		a.download = "rental-summary.csv"; a.click();
	};

	return (
		<div className="flex flex-col gap-5 h-full">
			{/* ── KPI cards ── */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Сводный отчёт</h1>
				<p className="text-sm text-gray-500 mt-0.5">Сводная таблица арендного портфеля</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<div className="flex items-center gap-2 mb-1.5"><Building2 className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Объектов</span></div>
					<p className="text-2xl font-bold text-gray-900">{totalProps}</p>
					<p className="text-xs text-gray-400 mt-0.5">{activeRows.length} арендуется</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<div className="flex items-center gap-2 mb-1.5"><Percent className="w-4 h-4 text-emerald-500" /><span className="text-xs text-gray-500">Заполн.</span></div>
					<p className="text-2xl font-bold text-emerald-700">{occupancy}%</p>
					<div className="mt-1.5 bg-gray-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${occupancy}%` }} /></div>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<div className="flex items-center gap-2 mb-1.5"><TrendingUp className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Взносы/мес</span></div>
					<p className="text-lg font-bold text-gray-900 truncate">{fmtNum(totalRent)} с</p>
					<p className="text-xs text-gray-400 mt-0.5">актив. договоры</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<div className="flex items-center gap-2 mb-1.5"><Users className="w-4 h-4 text-purple-500" /><span className="text-xs text-gray-500">Договоров</span></div>
					<p className="text-2xl font-bold text-gray-900">{rows.length}</p>
					<p className="text-xs text-gray-400 mt-0.5">{activeRows.length} активных</p>
				</div>
				<div className={cn("rounded-xl border p-4", expiringIn30 > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200")}>
					<div className="flex items-center gap-2 mb-1.5"><AlertTriangle className={cn("w-4 h-4", expiringIn30 > 0 ? "text-amber-500" : "text-gray-300")} /><span className="text-xs text-gray-500">Истекают ≤30д</span></div>
					<p className={cn("text-2xl font-bold", expiringIn30 > 0 ? "text-amber-700" : "text-gray-300")}>{expiringIn30}</p>
					<p className="text-xs text-gray-400 mt-0.5">договоров</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<div className="flex items-center gap-2 mb-1.5"><Percent className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Ср. ROI мес</span></div>
					<p className={cn("text-2xl font-bold", avgRoi != null ? "text-emerald-700" : "text-gray-300")}>
						{avgRoi != null ? `${avgRoi.toFixed(2)}%` : "—"}
					</p>
					<p className="text-xs text-gray-400 mt-0.5">{roiRows.length} объектов</p>
				</div>
			</div>

			{/* ── Toolbar ── */}
			<div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
				<p className="text-sm text-gray-500">
					{sorted.length} записей · взносы{" "}
					{Array.from(rentByCurrency.entries()).map(([cur, amt], i) => (
						<span key={cur}>
							{i > 0 && <span className="mx-1 text-gray-400">|</span>}
							<span className="font-medium text-gray-800">{fmtNum(amt)} {cur}</span>
						</span>
					))}
					{totalMV > 0 && <> · портфель <span className="font-medium text-gray-800">{fmtNum(totalMV)} KGS</span></>}
				</p>
				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<button className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
								<Columns className="w-3.5 h-3.5" /> Столбцы
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-52 p-2" align="end">
							<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">Столбцы</p>
							{COLUMNS.map(col => (
								<label key={col.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
									<input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-blue-600" />
									<span className="text-xs text-gray-700">{col.label}</span>
								</label>
							))}
						</PopoverContent>
					</Popover>

					{/* Import */}
					<input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
					<button onClick={() => fileRef.current?.click()}
						className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
						<Upload className="w-3.5 h-3.5" /> Импорт Excel
					</button>

					{/* Export xlsx */}
					<button onClick={exportXlsx}
						className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
						<FileSpreadsheet className="w-3.5 h-3.5" /> Excel
					</button>

					{/* Export csv */}
					<button onClick={exportCsv}
						className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
						<Download className="w-3.5 h-3.5" /> CSV
					</button>
				</div>
			</div>

			{/* ── Excel table ── */}
			<div className="overflow-auto border border-gray-300 rounded-sm flex-1" style={{ maxHeight: "calc(100vh - 380px)" }}>
				<table className="text-xs border-collapse" style={{ minWidth: visibleDefs.reduce((s, c) => s + (c.width ?? 100), 50) + "px" }}>
					<thead className="sticky top-0 z-20">
						<tr>
							<th className="border border-gray-300 bg-[#E8EAED] text-center text-gray-500 font-semibold py-1.5 px-2 select-none sticky left-0 z-10 text-[11px]">#</th>
							{visibleDefs.map(col => (
								<th key={col.key} onClick={() => handleSort(col.key)}
									className="border border-gray-300 bg-[#E8EAED] text-left py-1.5 px-2 font-semibold text-gray-700 cursor-pointer select-none hover:bg-[#d8dde3] transition-colors whitespace-nowrap text-[11px]">
									<span className="inline-flex items-center gap-1">
										{col.label}
										{sortKey === col.key ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							Array.from({ length: 6 }).map((_, i) => (
								<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}>
									<td className="border border-gray-200 text-center text-gray-300 py-1.5 px-2 sticky left-0 z-10" style={{ background: "inherit" }}>{i + 1}</td>
									{visibleDefs.map(col => <td key={col.key} className="border border-gray-200 py-1.5 px-2"><div className="h-3 bg-gray-200 rounded animate-pulse" /></td>)}
								</tr>
							))
						) : sorted.length === 0 ? (
							<tr><td colSpan={visibleDefs.length + 1} className="border border-gray-200 text-center text-gray-400 py-20">
								Нет данных · используйте <b>Импорт Excel</b> для загрузки
							</td></tr>
						) : sorted.map((row, i) => {
							const bg = i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]";
							const isExpired    = row.endDate && new Date(row.endDate) < new Date();
							const isEndingSoon = row.daysLeft != null && row.daysLeft >= 0 && row.daysLeft <= 30;
							return (
								<tr key={row.id} className={cn(bg, "hover:bg-[#EEF2FF] transition-colors group/row")}>
									<td className="border border-gray-200 text-center text-gray-400 py-1 px-2 sticky left-0 z-10 select-none" style={{ background: "inherit" }}>
										<span className="inline-flex items-center gap-1">
											{i + 1}
											<button type="button" onClick={() => setEditRow({
												id: row.id, propertyId: row.propertyId, tenantId: row.tenantId,
												tenantName: row.tenantName, contractNumber: row.contractNumber,
												projectName: row.projectName, unitNumber: row.unitNumber,
												block: row.block, floor: row.floor, area: row.area,
												rentAmount: row.rentAmount, currency: row.currency, depositAmount: row.depositAmount,
												signDate: row.signDate ?? null, startDate: row.startDate ?? null, endDate: row.endDate ?? null,
												contractStatus: row.contractStatus, marketValue: row.marketValue,
											})}
												className="opacity-0 group-hover/row:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 ml-0.5">
												<Pencil className="w-2.5 h-2.5" />
											</button>
										</span>
									</td>
									{visibleDefs.map(col => {
										const v = (row as any)[col.key];
										const alignClass = col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left";

										if (col.key === "marketValue") return (
											<td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>
												<MarketValueCell propertyId={row.propertyId} value={row.marketValue}
													onSaved={() => qc.invalidateQueries({ queryKey: ["listProperties"] })} />
											</td>
										);
										if (col.key === "roi") return (
											<td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>
												{v != null ? <span className={cn("font-semibold", v >= 1 ? "text-emerald-600" : "text-orange-500")}>{v.toFixed(2)}%</span> : <span className="text-gray-300">—</span>}
											</td>
										);
										if (col.key === "daysLeft") return (
											<td key={col.key} className={cn("border border-gray-200 py-1 px-2 tabular-nums", alignClass, v == null ? "text-gray-300" : v < 0 ? "text-rose-600 font-medium" : v <= 30 ? "text-amber-600 font-medium" : "text-gray-600")}>
												{v == null ? "∞" : v < 0 ? `просроч. ${Math.abs(v)}д` : `${v} дн.`}
											</td>
										);
										if (col.key === "contractStatus" || col.key === "propertyStatus") {
											const label = STATUS_LABELS[v] ?? v ?? "";
											const color = STATUS_COLORS[v] ?? "text-gray-500 bg-gray-100";
											return <td key={col.key} className={cn("border border-gray-200 py-1 px-2", alignClass)}>{label ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", color)}>{label}</span> : ""}</td>;
										}
										if (col.key === "rentAmount") return <td key={col.key} className={cn("border border-gray-200 py-1 px-2 font-medium text-gray-800", alignClass)}>{v > 0 ? fmtNum(v) : ""}</td>;
										if (col.key === "depositAmount") return <td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-600", alignClass)}>{v > 0 ? fmtNum(v) : ""}</td>;
										if (col.key === "area") return <td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-600", alignClass)}>{v != null ? String(v) : ""}</td>;
										if (col.key === "endDate") return (
											<td key={col.key} className={cn("border border-gray-200 py-1 px-2 tabular-nums", alignClass, isExpired ? "text-rose-600 font-medium" : isEndingSoon ? "text-amber-600 font-medium" : "text-gray-600")}>
												{fmtDate(v)}
											</td>
										);
										if (col.key === "signDate" || col.key === "startDate") return <td key={col.key} className={cn("border border-gray-200 py-1 px-2 tabular-nums text-gray-600", alignClass)}>{fmtDate(v)}</td>;
										return <td key={col.key} className={cn("border border-gray-200 py-1 px-2 text-gray-700", alignClass)}>{v ?? ""}</td>;
									})}
								</tr>
							);
						})}
					</tbody>
					{sorted.length > 0 && (
						<tfoot className="sticky bottom-0 z-20">
							<tr className="bg-[#E8EAED] font-semibold">
								<td className="border border-gray-300 text-center text-gray-500 py-1.5 px-2 text-[11px] sticky left-0 z-10 bg-[#E8EAED]">Σ</td>
								{visibleDefs.map(col => {
									const ac = col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left";
									if (col.key === "unitNumber") return <td key={col.key} className="border border-gray-300 py-1.5 px-2 text-gray-500 text-[11px]">Итого: {sorted.length}</td>;
									if (col.key === "rentAmount") {
										const totalUsd = totalRentKgs / unitInKgs("USD", nbkrRates);
										return (
											<td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800 tabular-nums whitespace-nowrap", ac)}>
												<span className="font-bold">{fmtNum(totalRentKgs)}</span>
												<span className="text-gray-500 ml-1 text-[11px]">KGS</span>
												<span className="text-gray-400 mx-2">|</span>
												<span className="font-bold">{fmtNum(totalUsd)}</span>
												<span className="text-gray-500 ml-1 text-[11px]">USD</span>
											</td>
										);
									}
									if (col.key === "depositAmount") return (
										<td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-700 tabular-nums", ac)}>
											{Array.from(depositByCurrency.entries()).filter(([, amt]) => amt > 0).map(([cur, amt], i) => (
												<span key={cur}>
													{i > 0 && <span className="text-gray-400 mx-1">|</span>}
													<span>{fmtNum(amt)}</span>
													<span className="text-gray-500 ml-1 text-[11px]">{cur}</span>
												</span>
											))}
										</td>
									);
									if (col.key === "area") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-700", ac)}>{fmtNum(totalArea)}</td>;
									if (col.key === "marketValue") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-gray-800", ac)}>{totalMV > 0 ? fmtNum(totalMV) : ""}</td>;
									if (col.key === "roi") return <td key={col.key} className={cn("border border-gray-300 py-1.5 px-2 text-emerald-700", ac)}>{avgRoi != null ? `${avgRoi.toFixed(2)}%` : ""}</td>;
									return <td key={col.key} className="border border-gray-300 py-1.5 px-2" />;
								})}
							</tr>
						</tfoot>
					)}
				</table>
			</div>

			<p className="text-[11px] text-gray-400 flex-shrink-0">
				* Рыночная стоимость — нажмите на ячейку для ввода · ROI = Взнос ÷ Рын. стоимость × 100% · Красный = просрочен · Жёлтый = &lt;30 дней
			</p>

			{importRows && (
				<ImportModal
					rows={importRows}
					onClose={() => setImportRows(null)}
					onDone={() => {
						qc.invalidateQueries({ queryKey: ["listLeaseContracts"] });
						qc.invalidateQueries({ queryKey: ["listProperties"] });
						qc.invalidateQueries({ queryKey: ["listTenants"] });
					}}
				/>
			)}
			{editRow && (
				<EditRowDialog
					row={editRow}
					onClose={() => setEditRow(null)}
					onSaved={() => {
						qc.invalidateQueries({ queryKey: ["listLeaseContracts"] });
						qc.invalidateQueries({ queryKey: ["listProperties"] });
						qc.invalidateQueries({ queryKey: ["listTenants"] });
					}}
				/>
			)}
		</div>
	);
}
