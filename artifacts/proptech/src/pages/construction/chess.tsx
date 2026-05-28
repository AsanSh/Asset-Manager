import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	Grid3X3,
	Layers,
	Plus,
	Settings2,
	Upload,
	Users,
	Building2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
	ChessByCounterpartyView,
	ChessByUnitView,
	type OverviewUnit,
} from "@/components/chess-views";
import { ChessUnitsImportDialog } from "@/components/chess-units-import-dialog";
import {
	downloadUnitsTemplate,
	exportUnitsToExcel,
} from "@/lib/chess-units-xlsx";
import {
	Dialog,
	DialogContent,
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
import { useToast } from "@/hooks/use-toast";
import { ChessStatusSettingsDialog } from "@/components/chess-status-settings-dialog";
import { UnitSaleDialog } from "@/components/unit-sale-dialog";
import { api } from "@/lib/api";
import {
	buildStatusBadgeCfg,
	buildStatusGridCfg,
	gridCfgFor,
	saleModeFor,
	type UnitStatusDto,
} from "@/lib/unit-statuses";

function fmtNum(v: string | number | null | undefined) {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		parseFloat(String(v)),
	);
}

const UNIT_TYPES = [
	{ value: "apartment", label: "Квартира" },
	{ value: "studio", label: "Студия" },
	{ value: "office", label: "Офис" },
	{ value: "commercial", label: "Коммерческое" },
	{ value: "parking", label: "Паркинг" },
	{ value: "storage", label: "Кладовая" },
];

interface Unit {
	id: number;
	projectId: number;
	unitNumber: string;
	floor?: number;
	block?: string;
	unitType: string;
	roomCount?: number;
	area?: string;
	pricePerSqm?: string;
	totalPrice?: string;
	currency: string;
	status: string;
	notes?: string;
	// PTO area tracking
	areaModified?: boolean;
	originalArea?: string;
	areaDelta?: string;
	recalculationPrice?: string;
	supplementStatus?: string;
}
interface Project {
	id: number;
	name: string;
	totalFloors?: number;
	totalUnits?: number;
}

function UnitDialog({
	unit,
	projectId,
	onClose,
	onSaved,
	onRequestSale,
	statuses,
	statusGridMap,
}: {
	unit: Unit | null | "new";
	projectId: number;
	onClose: () => void;
	onSaved: () => void;
	onRequestSale?: (status: "reserved" | "sold", unit: Unit) => void;
	statuses: UnitStatusDto[];
	statusGridMap: ReturnType<typeof buildStatusGridCfg>;
}) {
	const { toast } = useToast();
	const isEdit = unit && unit !== "new";
	const init = isEdit ? (unit as Unit) : null;
	const [form, setForm] = useState({
		unitNumber: init?.unitNumber || "",
		floor: String(init?.floor || ""),
		block: init?.block || "",
		unitType: init?.unitType || "apartment",
		roomCount: String(init?.roomCount || ""),
		area: init?.area || "",
		pricePerSqm: init?.pricePerSqm || "",
		currency: init?.currency || "KGS",
		status: init?.status || "available",
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const totalPrice =
		parseFloat(form.area || "0") * parseFloat(form.pricePerSqm || "0");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.unitNumber) {
			toast({ title: "Укажите номер квартиры", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const body = { ...form, projectId };
			if (isEdit) {
				await api.patch(`/construction/units/${init?.id}`, body);
			} else {
				await api.post("/construction/units", body);
			}
			toast({ title: isEdit ? "Обновлено" : "Квартира добавлена" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!unit} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? `Квартира ${init?.unitNumber}` : "Добавить квартиру"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Номер *</Label>
							<Input
								className="mt-1"
								value={form.unitNumber}
								onChange={(e) => set("unitNumber", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Этаж</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.floor}
								onChange={(e) => set("floor", e.target.value)}
							/>
						</div>
						<div>
							<Label>Секция / блок</Label>
							<Input
								className="mt-1"
								value={form.block}
								onChange={(e) => set("block", e.target.value)}
								placeholder="А"
							/>
						</div>
						<div>
							<Label>Тип</Label>
							<Select
								value={form.unitType}
								onValueChange={(v) => set("unitType", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{UNIT_TYPES.map((u) => (
										<SelectItem key={u.value} value={u.value}>
											{u.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Комнат</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.roomCount}
								onChange={(e) => set("roomCount", e.target.value)}
							/>
						</div>
						<div>
							<Label>Площадь (м²)</Label>
							<Input
								className="mt-1"
								type="number"
								step="0.01"
								value={form.area}
								onChange={(e) => set("area", e.target.value)}
							/>
						</div>
						<div>
							<Label>Цена за м²</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.pricePerSqm}
								onChange={(e) => set("pricePerSqm", e.target.value)}
							/>
						</div>
						<div>
							<Label>Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => {
									const sale = saleModeFor(statuses, v);
									if (isEdit && init && sale && onRequestSale) {
										onRequestSale(sale, init);
										return;
									}
									set("status", v);
								}}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{statuses.map((s) => (
										<SelectItem key={s.code} value={s.code}>
											{statusGridMap[s.code]?.label || s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{isEdit && statuses.some((s) => s.saleMode !== "none") && (
								<p className="text-xs text-muted-foreground mt-1">
									Статусы с бронью или продажей открывают оформление покупателя и
									графика платежей
								</p>
							)}
						</div>
					</div>
					{totalPrice > 0 && (
						<div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
							<p className="text-xs text-amber-600">Стоимость квартиры</p>
							<p className="text-lg font-bold text-amber-700">
								{fmtNum(totalPrice)} {form.currency}
							</p>
						</div>
					)}
					<div>
						<Label>Заметки</Label>
						<Input
							className="mt-1"
							value={form.notes}
							onChange={(e) => set("notes", e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function BulkGenerateDialog({
	projectId,
	onClose,
	onSaved,
}: {
	projectId: number;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		floors: "",
		unitsPerFloor: "",
		block: "",
		area: "",
		pricePerSqm: "",
		currency: "KGS",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const total =
		parseInt(form.floors || "0", 10) * parseInt(form.unitsPerFloor || "0", 10);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.floors || !form.unitsPerFloor) {
			toast({ title: "Укажите этажи и квартиры", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await api.post("/construction/units/bulk", { ...form, projectId });
			toast({ title: `Сгенерировано ${total} квартир` });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Быстрое заполнение шахматки</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Этажей *</Label>
							<Input
								className="mt-1"
								type="number"
								min="1"
								value={form.floors}
								onChange={(e) => set("floors", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Квартир на этаже *</Label>
							<Input
								className="mt-1"
								type="number"
								min="1"
								value={form.unitsPerFloor}
								onChange={(e) => set("unitsPerFloor", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Секция</Label>
							<Input
								className="mt-1"
								value={form.block}
								onChange={(e) => set("block", e.target.value)}
								placeholder="А"
							/>
						</div>
						<div>
							<Label>Площадь (м²)</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.area}
								onChange={(e) => set("area", e.target.value)}
							/>
						</div>
						<div>
							<Label>Цена за м²</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.pricePerSqm}
								onChange={(e) => set("pricePerSqm", e.target.value)}
							/>
						</div>
						<div>
							<Label>Валюта</Label>
							<Select
								value={form.currency}
								onValueChange={(v) => set("currency", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["KGS", "USD", "EUR"].map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{total > 0 && (
						<p className="text-sm text-amber-600 font-medium text-center">
							Будет создано {total} квартир
						</p>
					)}
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "Создание..." : "Сгенерировать"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type ViewMode = "grid" | "by-unit" | "by-counterparty";

/** Инлайн-редактор площади для ПТО */
/** Отображение площади в режиме ПТО (без редактирования — открывается диалогом) */
function PtoAreaDisplay({ unit }: { unit: Unit }) {
	const modified = !!(unit as any).areaModified;
	const orig = (unit as any).originalArea;
	return (
		<div className="flex flex-col items-center mt-0.5 leading-tight">
			<span className={`text-[9px] font-semibold ${modified ? "text-amber-800" : "text-gray-700"}`}>
				{unit.area ? `${unit.area}м²` : "—"}
			</span>
			{modified && orig && (
				<span className="text-[7px] text-amber-600 line-through">{orig}м²</span>
			)}
		</div>
	);
}

/** Диалог редактирования площади ПТО */
function PtoEditAreaDialog({
	unit,
	open,
	onClose,
	onSaved,
}: {
	unit: Unit | null;
	open: boolean;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [area, setArea] = useState("");
	const [reason, setReason] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (unit) {
			setArea(unit.area || "");
			setReason("");
		}
	}, [unit?.id, open]);

	if (!unit) return null;

	const oldArea = parseFloat(unit.area || "0");
	const newArea = parseFloat(area || "0");
	const delta = newArea - oldArea;
	const pps = parseFloat(unit.pricePerSqm || "0");
	const newTotal = pps > 0 ? newArea * pps : 0;

	const save = async () => {
		if (!area || newArea <= 0) {
			toast({ title: "Укажите корректную площадь", variant: "destructive" });
			return;
		}
		if (newArea === oldArea) {
			toast({ title: "Площадь не изменилась" });
			onClose();
			return;
		}
		setLoading(true);
		try {
			await api.patch(`/construction/units/${unit.id}/area`, {
				area,
				reason: reason.trim() || undefined,
			});
			toast({
				title: "Площадь обновлена",
				description: `${oldArea} → ${newArea} м² (Δ${delta > 0 ? "+" : ""}${delta.toFixed(2)})`,
			});
			onSaved();
			onClose();
		} catch (e: any) {
			toast({
				title: "Ошибка обновления",
				description: e?.response?.data?.error || "—",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Изменение площади · кв. {unit.unitNumber}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
						<div>
							<p className="text-xs text-gray-500">Этаж</p>
							<p className="font-medium">{unit.floor || "—"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Блок</p>
							<p className="font-medium">{unit.block || "—"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Текущая площадь</p>
							<p className="font-bold text-base">{oldArea} м²</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Цена за м²</p>
							<p className="font-medium">
								{pps > 0 ? `${pps.toLocaleString("ru-KG")} ${unit.currency || "KGS"}` : "—"}
							</p>
						</div>
					</div>

					<div>
						<Label className="text-sm">Новая площадь (м²) *</Label>
						<Input
							className="mt-1 text-base h-11"
							type="number"
							step="0.01"
							value={area}
							onChange={(e) => setArea(e.target.value)}
							placeholder="например, 65.5"
							autoFocus
						/>
					</div>

					{delta !== 0 && newArea > 0 && (
						<div className={`rounded-lg p-3 text-sm ${delta > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
							<p className="flex justify-between">
								<span className="text-gray-600">Изменение:</span>
								<span className={`font-bold ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
									{delta > 0 ? "+" : ""}{delta.toFixed(2)} м²
								</span>
							</p>
							{pps > 0 && (
								<>
									<p className="flex justify-between mt-1">
										<span className="text-gray-600">Новая стоимость:</span>
										<span className="font-bold">
											{newTotal.toLocaleString("ru-KG")} {unit.currency || "KGS"}
										</span>
									</p>
									<p className="flex justify-between mt-1">
										<span className="text-gray-600">
											{delta > 0 ? "Клиент доплачивает:" : "Возврат клиенту:"}
										</span>
										<span className={`font-bold ${delta > 0 ? "text-amber-700" : "text-blue-700"}`}>
											{Math.abs(delta * pps).toLocaleString("ru-KG")} {unit.currency || "KGS"}
										</span>
									</p>
								</>
							)}
						</div>
					)}

					<div>
						<Label className="text-sm">Причина изменения (необязательно)</Label>
						<textarea
							className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-20 resize-none"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Например: уточнение по обмерам БТИ, перепланировка..."
						/>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-orange-600"
							onClick={save}
							disabled={loading || !area || newArea === oldArea}
						>
							{loading ? "Сохранение..." : "Сохранить изменение"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionChess() {
	const qc = useQueryClient();
	const { user } = useAuth();
	const userRole = (user as any)?.role;
	const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "company_admin";
	const forcedRoleByUser = userRole === "pto" || userRole === "engineer";
	// Админы могут вручную переключать режим ПТО/CRM
	const [adminModeOverride, setAdminModeOverride] = useState<"crm" | "pto">("crm");
	const [ptoEditUnit, setPtoEditUnit] = useState<Unit | null>(null);
	const isPTO = forcedRoleByUser || (isAdmin && adminModeOverride === "pto");
	const [projectId, setProjectId] = useState<number | null>(null);
	const [selectedUnit, setSelectedUnit] = useState<Unit | null | "new">(null);
	const [saleFlow, setSaleFlow] = useState<{
		unit: Unit;
		status: "reserved" | "sold";
	} | null>(null);
	const [showBulk, setShowBulk] = useState(false);
	const [showImport, setShowImport] = useState(false);
	const [blockFilter, setBlockFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [seeding, setSeeding] = useState(false);
	const [showStatusSettings, setShowStatusSettings] = useState(false);
	const { toast } = useToast();

	const { data: unitStatuses = [] } = useQuery<UnitStatusDto[]>({
		queryKey: ["construction-unit-statuses"],
		queryFn: () =>
			api.get("/construction/unit-statuses").then((r) => r.data),
	});

	const statusGridMap = buildStatusGridCfg(unitStatuses);
	const statusBadgeMap = buildStatusBadgeCfg(unitStatuses);

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: async () => {
			const res = await api.get<Project[]>("/construction/projects/all");
			if (res.data.length && !projectId) setProjectId(res.data[0].id);
			return res.data;
		},
	});

	const { data: units = [], isLoading } = useQuery<Unit[]>({
		queryKey: ["construction-units", projectId],
		queryFn: () =>
			api
				.get("/construction/units", {
					params: { projectId: String(projectId) },
				})
				.then((r) => r.data),
		enabled: !!projectId,
	});

	const { data: overview = [] } = useQuery<OverviewUnit[]>({
		queryKey: ["construction-units-overview", projectId],
		queryFn: () =>
			api
				.get("/construction/units/overview", {
					params: { projectId: String(projectId) },
				})
				.then((r) => r.data),
		enabled: !!projectId,
	});

	const blocks = [
		"all",
		...Array.from(new Set(units.map((u) => u.block || "Без секции"))),
	];

	const filterUnit = (u: { block?: string | null; status: string }) => {
		if (blockFilter !== "all" && (u.block || "Без секции") !== blockFilter)
			return false;
		if (statusFilter !== "all" && u.status !== statusFilter) return false;
		return true;
	};

	const filteredUnits = units.filter(filterUnit);
	const filteredOverview = overview.filter(filterUnit);

	// Group by floor descending
	const floors = Array.from(
		new Set(filteredUnits.map((u) => u.floor || 0)),
	).sort((a, b) => b - a);

	const selectedProject = projects.find((p) => p.id === projectId);

	const handleExport = () => {
		if (!selectedProject || overview.length === 0) {
			toast({ title: "Нет данных для экспорта", variant: "destructive" });
			return;
		}
		exportUnitsToExcel(
			overview.map((u) => ({
				unitNumber: u.unitNumber,
				floor: u.floor,
				block: u.block,
				unitType: u.unitType,
				roomCount: u.roomCount,
				area: u.area,
				pricePerSqm: u.pricePerSqm,
				totalPrice: u.totalPrice,
				currency: u.currency,
				status: u.status,
				notes: u.notes,
				buyerName: u.contract?.buyerName,
				contractTotal: u.contract?.totalAmount,
				paidAmount: u.contract?.paidAmount,
				remainingAmount: u.contract?.remainingAmount,
			})),
			selectedProject.name,
		);
		toast({ title: "Файл Excel скачан" });
	};

	const openUnit = (u: OverviewUnit | Unit) => {
		setSelectedUnit(u as Unit);
	};

	const invalidateAll = () => {
		qc.invalidateQueries({ queryKey: ["construction-units", projectId] });
		qc.invalidateQueries({
			queryKey: ["construction-units-overview", projectId],
		});
	};

	const seedFromProject = async (force = false) => {
		if (!projectId) return;
		if (
			force &&
			units.length > 0 &&
			!confirm(
				`Удалить текущие ${units.length} квартир(ы) в шахматке и создать заново по параметрам проекта?`,
			)
		) {
			return;
		}
		setSeeding(true);
		try {
			const { data } = await api.post<{ unitsCreated: number }>(
				`/construction/projects/${projectId}/generate-units${force ? "?force=1" : ""}`,
			);
			toast({
				title: "Шахматка создана",
				description: `Добавлено ${data.unitsCreated} квартир`,
			});
			qc.invalidateQueries({ queryKey: ["construction-units", projectId] });
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось создать квартиры",
				variant: "destructive",
			});
		} finally {
			setSeeding(false);
		}
	};

	const stats = unitStatuses.map((s) => {
		const cfg = gridCfgFor(statusGridMap, s.code);
		return {
			key: s.code,
			count: units.filter((u) => u.status === s.code).length,
			...cfg,
		};
	});
	const orphanStatusCodes = [
		...new Set(units.map((u) => u.status).filter((c) => !statusGridMap[c])),
	];
	for (const code of orphanStatusCodes) {
		stats.push({
			key: code,
			count: units.filter((u) => u.status === code).length,
			label: code,
			bg: "bg-slate-50",
			text: "text-slate-700",
			border: "border-slate-200",
		});
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Шахматка
						{isPTO && (
							<span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium align-middle">
								🔧 Режим ПТО
							</span>
						)}
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						{isPTO
							? "Управление площадями · клик по площади для редактирования"
							: "Визуальная карта квартир · договоры и финансы"}
					</p>
				</div>
				<div className="flex gap-2 flex-wrap items-center">
					{isAdmin && (
						<div className="flex gap-1 bg-gray-100 rounded-lg p-1">
							<button
								onClick={() => setAdminModeOverride("crm")}
								className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${adminModeOverride === "crm" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
							>
								CRM
							</button>
							<button
								onClick={() => setAdminModeOverride("pto")}
								className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${adminModeOverride === "pto" ? "bg-white shadow text-amber-700" : "text-gray-500 hover:text-gray-700"}`}
							>
								ПТО
							</button>
						</div>
					)}
					<Button
						variant="outline"
						onClick={() => setShowStatusSettings(true)}
						className="gap-2 text-xs"
					>
						<Settings2 className="w-3.5 h-3.5" /> Статусы
					</Button>
					{projectId && (
						<>
							<Button
								variant="outline"
								onClick={() =>
									downloadUnitsTemplate(selectedProject?.name)
								}
								className="gap-2 text-xs"
							>
								<Download className="w-3.5 h-3.5" /> Шаблон Excel
							</Button>
							{units.length > 0 && (
								<Button
									variant="outline"
									onClick={handleExport}
									className="gap-2 text-xs"
								>
									<Download className="w-3.5 h-3.5" /> Экспорт
								</Button>
							)}
							<Button
								variant="outline"
								onClick={() => setShowImport(true)}
								className="gap-2 text-xs"
							>
								<Upload className="w-3.5 h-3.5" /> Импорт
							</Button>
						</>
					)}
					{projectId && (
						<Button
							variant="outline"
							onClick={() => setShowBulk(true)}
							className="gap-2 text-xs"
						>
							<Layers className="w-3.5 h-3.5" /> Заполнить шахматку
						</Button>
					)}
					{projectId && (
						<Button
							onClick={() => setSelectedUnit("new")}
							className="bg-amber-500 hover:bg-orange-600 gap-2 text-xs"
						>
							<Plus className="w-3.5 h-3.5" /> Добавить квартиру
						</Button>
					)}
				</div>
			</div>

			{/* Project selector */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<div className="flex items-center gap-3 flex-wrap">
					<Label className="text-sm font-medium whitespace-nowrap">
						Проект:
					</Label>
					<div className="flex gap-2 flex-wrap">
						{projects.map((p) => (
							<button
								key={p.id}
								onClick={() => setProjectId(p.id)}
								className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectId === p.id ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
							>
								{p.name}
							</button>
						))}
					</div>
				</div>
			</div>

			{!projectId ? (
				<div className="text-center py-16 text-gray-400">
					<Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
					<p>Выберите проект</p>
				</div>
			) : (
				<>
					{/* Legend + Stats */}
					<div className="flex flex-wrap gap-3">
						{stats.map((s) => (
							<div
								key={s.key}
								className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${s.bg} ${s.border}`}
							>
								<div
									className={`w-3 h-3 rounded ${s.bg.replace("hover:", "").replace("50", "400").split(" ")[0]}`}
								/>
								<span className={`text-xs font-medium ${s.text}`}>
									{s.label}
								</span>
								<span className={`text-xs font-bold ${s.text}`}>{s.count}</span>
							</div>
						))}
					</div>

					{/* View mode */}
					<div className="flex flex-wrap gap-2 items-center">
						<span className="text-xs text-gray-500 mr-1">Вид:</span>
						{(
							[
								{ id: "grid" as ViewMode, label: "Шахматка", icon: Grid3X3 },
								{ id: "by-unit" as ViewMode, label: "По квартире", icon: Building2 },
								{
									id: "by-counterparty" as ViewMode,
									label: "По контрагенту",
									icon: Users,
								},
							] as const
						).map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setViewMode(id)}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${viewMode === id ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
							>
								<Icon className="w-3.5 h-3.5" />
								{label}
							</button>
						))}
					</div>

					{/* Filters */}
					<div className="flex flex-wrap gap-2">
						{blocks.length > 2 &&
							blocks.map((b) => (
								<button
									key={b}
									type="button"
									onClick={() => setBlockFilter(b)}
									className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${blockFilter === b ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
								>
									{b === "all" ? "Все секции" : `Секция ${b}`}
								</button>
							))}
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}
						>
							Все статусы
						</button>
						{unitStatuses.map((s) => {
							const v = gridCfgFor(statusGridMap, s.code);
							return (
								<button
									key={s.code}
									type="button"
									onClick={() => setStatusFilter(s.code)}
									className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s.code ? `${v.bg} ${v.text} border ${v.border}` : "bg-gray-100 text-gray-700"}`}
								>
									{v.label}
								</button>
							);
						})}
					</div>

					{viewMode === "by-unit" && (
						<ChessByUnitView
							units={filteredOverview}
							onSelectUnit={openUnit}
							statusBadgeMap={statusBadgeMap}
						/>
					)}

					{viewMode === "by-counterparty" && (
						<ChessByCounterpartyView
							units={filteredOverview}
							statusBadgeMap={statusBadgeMap}
							onSelectUnit={openUnit}
						/>
					)}

					{/* Chess grid */}
					{viewMode === "grid" &&
						(isLoading ? (
						<div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
							Загрузка...
						</div>
					) : units.length === 0 ? (
						<div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
							<Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
							<p className="font-medium">Шахматка пуста</p>
							<p className="text-sm mt-1 max-w-md mx-auto">
								Квартиры создаются отдельно от карточки проекта. Если при создании
								проекта указали этажи и число квартир — нажмите кнопку ниже.
							</p>
							<div className="flex flex-wrap justify-center gap-2 mt-4">
								{selectedProject?.totalFloors &&
									selectedProject?.totalUnits && (
										<Button
											onClick={() => seedFromProject()}
											disabled={seeding}
											className="bg-amber-500 hover:bg-orange-600 gap-2"
										>
											<Layers className="w-4 h-4" />
											{seeding
												? "Создание..."
												: `Создать ${selectedProject.totalUnits} квартир (${selectedProject.totalFloors} эт.)`}
										</Button>
									)}
								<Button
									variant="outline"
									onClick={() => setShowBulk(true)}
									className="gap-2"
								>
									<Layers className="w-4 h-4" /> Заполнить вручную
								</Button>
							</div>
						</div>
					) : (
						<>
						{selectedProject?.totalUnits &&
							units.length > 0 &&
							units.length < selectedProject.totalUnits && (
								<div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
									<span>
										В проекте указано {selectedProject.totalUnits} квартир, в
										шахматке — {units.length}. Создание проекта не заполняло
										шахматку автоматически.
									</span>
									<Button
										size="sm"
										variant="outline"
										className="border-amber-300"
										disabled={seeding}
										onClick={() => seedFromProject(true)}
									>
										Пересоздать {selectedProject.totalUnits} квартир
									</Button>
								</div>
							)}
						<div className="bg-white rounded-xl border border-gray-200 overflow-auto">
							<div className="p-4 min-w-max">
								{floors.length === 0 ? (
									<div className="p-4 text-center text-gray-400">
										Нет данных для отображения
									</div>
								) : (
									floors.map((floor) => {
										const floorUnits = filteredUnits
											.filter((u) => (u.floor || 0) === floor)
											.sort((a, b) =>
												a.unitNumber.localeCompare(b.unitNumber, undefined, {
													numeric: true,
												}),
											);
										return (
											<div
												key={floor}
												className="flex items-center gap-2 mb-1.5"
											>
												<div className="w-12 text-right text-[10px] font-bold text-gray-400 pr-1 flex-shrink-0">
													{floor > 0 ? `${floor}эт` : "—"}
												</div>
												<div className="flex gap-1 flex-wrap">
													{floorUnits.map((unit) => {
														const cfg = gridCfgFor(
															statusGridMap,
															unit.status,
														);
														const cellModified = !!(unit as any).areaModified;
														const ptoBg = cellModified ? "bg-amber-100" : cfg.bg;
														const ptoBorder = cellModified ? "border-amber-500" : cfg.border;
														return (
															<div
																key={unit.id}
																title={`${unit.unitNumber} · ${unit.area ? `${unit.area} м²` : ""} · ${cfg.label}`}
																className={`w-14 rounded border-2 text-center transition-all flex flex-col items-center justify-center p-0.5 relative cursor-pointer ${isPTO ? `${ptoBg} ${ptoBorder}` : `${cfg.bg} ${cfg.border}`}`}
																style={{ minHeight: "48px" }}
																onClick={() => {
																	if (isPTO) setPtoEditUnit(unit);
																	else setSelectedUnit(unit);
																}}
															>
																{!isPTO && cellModified && (
																	<div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[7px] font-bold px-0.5 rounded z-10">Δ</div>
																)}
																<span className={`text-[10px] font-bold ${cfg.text}`}>
																	{unit.unitNumber}
																</span>
																{isPTO ? (
																	<PtoAreaDisplay unit={unit as any} />
																) : (
																	<>
																		{unit.area && <span className={`text-[8px] ${cfg.text} opacity-70`}>{unit.area}м²</span>}
																		{unit.roomCount && <span className={`text-[8px] ${cfg.text} opacity-70`}>{unit.roomCount}к</span>}
																	</>
																)}
															</div>
														);
													})}
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
						</>
						))}
				</>
			)}

			{selectedUnit && projectId && (
				<UnitDialog
					unit={selectedUnit}
					projectId={projectId}
					statuses={unitStatuses}
					statusGridMap={statusGridMap}
					onClose={() => setSelectedUnit(null)}
					onSaved={invalidateAll}
					onRequestSale={(status, unit) => {
						setSelectedUnit(null);
						setSaleFlow({ unit, status });
					}}
				/>
			)}
			<ChessStatusSettingsDialog
				open={showStatusSettings}
				onClose={() => setShowStatusSettings(false)}
			/>
			{saleFlow && (
				<UnitSaleDialog
					open
					unit={saleFlow.unit}
					unitStatus={saleFlow.status}
					onClose={() => setSaleFlow(null)}
					onSaved={() => {
						invalidateAll();
						qc.invalidateQueries({
							queryKey: ["construction-contracts-sales"],
						});
						qc.invalidateQueries({ queryKey: ["construction-accruals"] });
					}}
				/>
			)}
			{showBulk && projectId && (
				<BulkGenerateDialog
					projectId={projectId}
					onClose={() => setShowBulk(false)}
					onSaved={invalidateAll}
				/>
			)}
			{showImport && projectId && selectedProject && (
				<ChessUnitsImportDialog
					open={showImport}
					projectId={projectId}
					projectName={selectedProject.name}
					onClose={() => setShowImport(false)}
					onImported={invalidateAll}
				/>
			)}

			<PtoEditAreaDialog
				unit={ptoEditUnit}
				open={!!ptoEditUnit}
				onClose={() => setPtoEditUnit(null)}
				onSaved={invalidateAll}
			/>
		</div>
	);
}
