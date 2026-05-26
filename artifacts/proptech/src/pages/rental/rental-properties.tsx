import { useListRentalProperties } from "@/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, ChevronUp, ChevronsUpDown, Home, Pencil, Plus, Trash2, UserCircle, Wallet } from "lucide-react";
import { useSortable } from "@/lib/use-sortable";
import { useColResize } from "@/lib/use-col-resize";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format-currency";

const statusColors: Record<string, string> = {
	free: "bg-emerald-100 text-emerald-800",
	rented: "bg-blue-100 text-blue-800",
	overdue: "bg-rose-100 text-rose-800",
	archived: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
	free: "Свободен",
	rented: "Сдан",
	overdue: "Просрочен",
	archived: "Архив",
};

type RentalPropertyRow = {
	id: number;
	projectName: string;
	unitNumber: string;
	type: string;
	area?: number | null;
	block?: string | null;
	floor?: number | null;
	rentalStatus: string;
	currentTenantName?: string | null;
	currentRentAmount?: number | null;
	currency?: string | null;
	comment?: string | null;
};

type FormState = {
	projectName: string;
	unitNumber: string;
	type: string;
	area: string;
	block: string;
	floor: string;
	comment: string;
};

const EMPTY_FORM: FormState = {
	projectName: "",
	unitNumber: "",
	type: "apartment",
	area: "",
	block: "",
	floor: "",
	comment: "",
};

// ── Property Form Fields ──────────────────────────────────────────────────────
function PropertyFormFields({ form, setField }: { form: FormState; setField: (k: keyof FormState, v: string) => void }) {
	return (
		<>
			<div>
				<Label className="text-xs">Проект / здание *</Label>
				<Input className="mt-1" value={form.projectName} onChange={(e) => setField("projectName", e.target.value)} placeholder="Например, ЖК Центральный" />
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Label className="text-xs">Номер / кабинет *</Label>
					<Input className="mt-1" value={form.unitNumber} onChange={(e) => setField("unitNumber", e.target.value)} placeholder="101" />
				</div>
				<div>
					<Label className="text-xs">Тип</Label>
					<Select value={form.type} onValueChange={(v) => setField("type", v)}>
						<SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="apartment">Квартира</SelectItem>
							<SelectItem value="office">Офис</SelectItem>
							<SelectItem value="parking">Парковка</SelectItem>
							<SelectItem value="storage">Кладовая</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<div>
					<Label className="text-xs">Площадь, м²</Label>
					<Input className="mt-1" type="number" value={form.area} onChange={(e) => setField("area", e.target.value)} />
				</div>
				<div>
					<Label className="text-xs">Блок</Label>
					<Input className="mt-1" value={form.block} onChange={(e) => setField("block", e.target.value)} />
				</div>
				<div>
					<Label className="text-xs">Этаж</Label>
					<Input className="mt-1" type="number" value={form.floor} onChange={(e) => setField("floor", e.target.value)} />
				</div>
			</div>
			<div>
				<Label className="text-xs">Комментарий</Label>
				<Textarea className="mt-1 resize-none" rows={2} value={form.comment} onChange={(e) => setField("comment", e.target.value)} />
			</div>
		</>
	);
}

// ── Property Owners Panel ─────────────────────────────────────────────────────
function PropertyOwnersPanel({ propertyId }: { propertyId: number }) {
	const qc = useQueryClient();
	const { toast } = useToast();

	const { data: allInvestors = [] } = useQuery<any[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});
	const { data: allInvestments = [], isLoading } = useQuery<any[]>({
		queryKey: ["investments"],
		queryFn: () => api.get("/rental/investments").then((r) => r.data),
	});

	const investments = allInvestments.filter((i) => i.propertyId === propertyId);
	const total = investments.reduce((s: number, i: any) => s + parseFloat(i.sharePercent || "0"), 0);
	const isValid = Math.abs(total - 100) < 0.01;

	const [addInvestorId, setAddInvestorId] = useState("");
	const [addShare, setAddShare] = useState("");
	const [adding, setAdding] = useState(false);

	const usedInvestorIds = new Set(investments.map((i: any) => String(i.investorId)));
	const availableInvestors = allInvestors.filter((inv) => !usedInvestorIds.has(String(inv.id)));

	const invalidate = () => qc.invalidateQueries({ queryKey: ["investments"] });

	const handleAdd = async () => {
		if (!addInvestorId || !addShare) return;
		const share = parseFloat(addShare);
		if (isNaN(share) || share <= 0) return;
		const newTotal = total + share;
		if (newTotal > 100.005) {
			toast({ title: "Превышение 100%", description: `Итого будет ${newTotal.toFixed(1)}% — нельзя превышать 100%`, variant: "destructive" });
			return;
		}
		setAdding(true);
		try {
			await api.post("/rental/investments", { propertyId, investorId: parseInt(addInvestorId), sharePercent: share });
			setAddInvestorId(""); setAddShare("");
			invalidate();
		} catch (e: any) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		} finally { setAdding(false); }
	};

	const handleShareChange = async (id: number, val: string) => {
		const share = parseFloat(val);
		if (isNaN(share)) return;
		const current = investments.find((i: any) => i.id === id);
		const oldShare = current ? parseFloat(current.sharePercent || "0") : 0;
		const newTotal = total - oldShare + share;
		if (newTotal > 100.005) {
			toast({ title: "Превышение 100%", description: `Итого будет ${newTotal.toFixed(1)}% — нельзя превышать 100%`, variant: "destructive" });
			return;
		}
		try {
			await api.patch(`/rental/investments/${id}`, { sharePercent: share });
			invalidate();
		} catch { /* ignore */ }
	};

	const handleDelete = async (id: number) => {
		try {
			await api.delete(`/rental/investments/${id}`);
			invalidate();
		} catch (e: any) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	};

	if (isLoading) return <div className="py-4 text-sm text-gray-400">Загрузка...</div>;

	return (
		<div className="space-y-3 pt-1">
			{/* Running total */}
			<div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${isValid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
				<span>Итого долей</span>
				<span className="tabular-nums font-bold">{total.toFixed(1)}%{isValid ? " ✓" : " — должно быть 100%"}</span>
			</div>

			{/* Existing investments */}
			{investments.length === 0 ? (
				<p className="text-sm text-gray-400 text-center py-2">Владельцы не назначены</p>
			) : (
				<div className="space-y-2">
					{investments.map((inv: any) => {
						const investor = allInvestors.find((x) => x.id === inv.investorId);
						return (
							<div key={inv.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
								<UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
								<span className="flex-1 text-sm text-gray-800 truncate">{investor?.fullName ?? `Владелец #${inv.investorId}`}</span>
								<input
									type="number" min="0" max="100" step="0.1"
									defaultValue={parseFloat(inv.sharePercent).toFixed(1)}
									onBlur={(e) => handleShareChange(inv.id, e.target.value)}
									className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
								/>
								<span className="text-gray-500 text-sm">%</span>
								<button onClick={() => handleDelete(inv.id)} className="text-gray-400 hover:text-rose-500 transition-colors ml-1">
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						);
					})}
				</div>
			)}

			{/* Add new owner */}
			{availableInvestors.length > 0 && (
				<div className="flex gap-2 items-end border-t pt-3">
					<div className="flex-1">
						<Label className="text-xs">Добавить владельца</Label>
						<Select value={addInvestorId} onValueChange={setAddInvestorId}>
							<SelectTrigger className="mt-1 h-8 text-sm">
								<SelectValue placeholder="Выберите..." />
							</SelectTrigger>
							<SelectContent>
								{availableInvestors.map((inv) => (
									<SelectItem key={inv.id} value={String(inv.id)}>{inv.fullName}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="w-24">
						<Label className="text-xs">Доля %</Label>
						<Input className="mt-1 h-8 text-sm text-right" type="number" min="0" max="100" step="0.1"
							value={addShare} onChange={(e) => setAddShare(e.target.value)}
							placeholder="0" />
					</div>
					<Button size="sm" onClick={handleAdd} disabled={adding || !addInvestorId || !addShare} className="h-8">
						<Plus className="w-3.5 h-3.5" />
					</Button>
				</div>
			)}
		</div>
	);
}

const TH = "relative border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap bg-gray-100 sticky top-0 z-20 select-none shadow-[0_1px_0_0_#e5e7eb]";
const TD = "border border-gray-200 px-2 py-1 text-gray-700";

function SortTh({
	label, col, sortKey, sortDir, onToggle, widths, startResize,
}: {
	label: string; col: string; sortKey: string; sortDir: "asc" | "desc";
	onToggle: (k: string) => void; widths: Record<string, number>;
	startResize: (k: string) => (e: React.MouseEvent) => void;
}) {
	const active = sortKey === col;
	return (
		<th className={TH + " cursor-pointer hover:bg-gray-200"} style={{ width: widths[col], minWidth: widths[col] }} onClick={() => onToggle(col)}>
			<span className="inline-flex items-center gap-1">
				{label}
				{active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
			</span>
			<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startResize(col)} onClick={(e) => e.stopPropagation()} />
		</th>
	);
}

function PropTable({ isLoading, sortedProps, propertiesArray, rentedCount, totalArea, sortKey, sortDir, toggle, openCreate, openEdit, onDelete }: {
	isLoading: boolean; sortedProps: any[]; propertiesArray: any[]; rentedCount: number; totalArea: number;
	sortKey: string; sortDir: "asc" | "desc"; toggle: (k: string) => void;
	openCreate: () => void; openEdit: (p: any) => void; onDelete: (p: RentalPropertyRow) => void;
}) {
	const { widths, startResize } = useColResize({ projectName: 180, unitNumber: 90, type: 100, area: 100, currentTenantName: 180, currentRentAmount: 130, rentalStatus: 100, actions: 72 });
	return (
		<div className="overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: "calc(100vh - 300px)" }}>
			<table className="w-full text-xs border-separate border-spacing-0">
				<thead>
					<tr>
						<SortTh label="Проект" col="projectName" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Номер" col="unitNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Тип" col="type" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Площадь, м²" col="area" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Арендатор" col="currentTenantName" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Аренда" col="currentRentAmount" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<SortTh label="Статус" col="rentalStatus" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<th className={TH} style={{ width: widths.actions }} />
					</tr>
				</thead>
				<tbody>
					{isLoading ? (
						Array.from({ length: 4 }).map((_, i) => (
							<tr key={i}>
								{Array.from({ length: 8 }).map((_, j) => (
									<td key={j} className={TD}><Skeleton className="h-3 w-full" /></td>
								))}
							</tr>
						))
					) : !propertiesArray.length ? (
						<tr>
							<td colSpan={8} className="text-center py-10 text-gray-400">
								<p className="text-sm">Объекты не найдены</p>
								<button className="mt-2 text-blue-600 text-sm hover:underline" onClick={openCreate}>Добавить первый объект</button>
							</td>
						</tr>
					) : (
						sortedProps.map((p, idx) => (
							<tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
								<td className={TD + " font-medium text-gray-900"}>{p.projectName}</td>
								<td className={TD}>{p.unitNumber}</td>
								<td className={TD}>{p.type === "apartment" ? "Квартира" : p.type === "office" ? "Офис" : p.type}</td>
								<td className={TD + " tabular-nums text-right"}>{p.area ? `${p.area}` : "—"}</td>
								<td className={TD}>{p.currentTenantName || "—"}</td>
								<td className={TD + " tabular-nums text-right font-medium"}>{p.currentRentAmount ? formatCurrency(p.currentRentAmount, p.currency || "KGS") : "—"}</td>
								<td className={TD}>
									<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[p.rentalStatus] || "bg-gray-100 text-gray-600"}`}>
										{statusLabels[p.rentalStatus] || p.rentalStatus}
									</span>
								</td>
								<td className={TD + " text-center"}>
									<div className="flex items-center justify-center gap-1">
										<button type="button" title="Редактировать" className="text-gray-500 hover:text-gray-900" onClick={() => openEdit(p)}>
											<Pencil className="w-3.5 h-3.5" />
										</button>
										<button type="button" title="Удалить" className="text-gray-400 hover:text-rose-600" onClick={() => onDelete(p)}>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</td>
							</tr>
						))
					)}
				</tbody>
				{!isLoading && propertiesArray.length > 0 && (
					<tfoot>
						<tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
							<td className={TD + " text-gray-700"} colSpan={2}>Итого: {propertiesArray.length} объектов</td>
							<td className={TD + " text-gray-700"}>{rentedCount} сдано</td>
							<td className={TD + " tabular-nums text-right text-gray-700"}>{totalArea > 0 ? `${new Intl.NumberFormat("ru-RU").format(totalArea)} м²` : "—"}</td>
							<td className={TD} colSpan={4} />
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}

export default function RentalProperties() {
	const searchString = useSearch();
	const { toast } = useToast();
	const qc = useQueryClient();
	const { data: properties, isLoading, isError, error, refetch } = useListRentalProperties();
	const propertiesArray = (Array.isArray(properties) ? properties : []) as RentalPropertyRow[];
	const { sorted: sortedProps, sortKey, sortDir, toggle } = useSortable(propertiesArray, "projectName");

	const rentedCount = propertiesArray.filter((p) => p.rentalStatus === "rented").length;
	const freeCount = propertiesArray.filter((p) => p.rentalStatus === "free").length;
	const totalArea = propertiesArray.reduce((s, p) => s + (p.area ?? 0), 0);
	const totalMonthlyRent = propertiesArray.reduce(
		(s, p) => s + (p.currentRentAmount ? Number(p.currentRentAmount) : 0),
		0,
	);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<RentalPropertyRow | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const params = new URLSearchParams(
			searchString.startsWith("?") ? searchString : `?${searchString}`,
		);
		if (params.get("create") === "1" || params.get("new") === "1") {
			openCreate();
		}
	}, [searchString]);

	const openCreate = () => {
		setEditing(null);
		setForm(EMPTY_FORM);
		setDialogOpen(true);
	};

	const openEdit = (p: RentalPropertyRow) => {
		setEditing(p);
		setForm({
			projectName: p.projectName || "",
			unitNumber: p.unitNumber || "",
			type: p.type || "apartment",
			area: p.area != null ? String(p.area) : "",
			block: "",
			floor: "",
			comment: "",
		});
		setDialogOpen(true);
	};

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ["/rental/properties"] });
		qc.invalidateQueries({ queryKey: getListRentalPropertiesQueryKey() });
	};

	const handleSave = async () => {
		if (!form.projectName.trim() || !form.unitNumber.trim()) {
			toast({
				title: "Заполните проект и номер объекта",
				variant: "destructive",
			});
			return;
		}
		setSaving(true);
		try {
			const body = {
				projectName: form.projectName.trim(),
				unitNumber: form.unitNumber.trim(),
				type: form.type,
				area: form.area ? form.area : null,
				block: form.block.trim() || null,
				floor: form.floor ? parseInt(form.floor, 10) : null,
				comment: form.comment.trim() || null,
			};

			if (editing) {
				await api.patch(`/rental/properties/${editing.id}`, body);
				toast({ title: "Объект обновлён" });
			} else {
				await api.post("/rental/properties", body);
				toast({ title: "Объект добавлен" });
			}
			setDialogOpen(false);
			invalidate();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e, "Не удалось сохранить"),
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (p: RentalPropertyRow) => {
		const label = `${p.projectName} ${p.unitNumber}`.trim();
		if (
			!confirm(
				`Удалить объект «${label}»?\n\nДействие необратимо. Объект можно удалить только без активных договоров и задолженности.`,
			)
		) {
			return;
		}
		try {
			await api.delete(`/rental/properties/${p.id}`);
			toast({ title: "Объект удалён" });
			if (editing?.id === p.id) setDialogOpen(false);
			invalidate();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? getApiErrorMessage(e)
					: null;
			toast({
				title: "Не удалось удалить",
				description: msg || "Проверьте договоры и владельцев объекта",
				variant: "destructive",
			});
		}
	};

	const setField = (k: keyof FormState, v: string) =>
		setForm((f) => ({ ...f, [k]: v }));

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Всего объектов" value={propertiesArray.length} sub="в реестре" icon={Building2} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Сдано" value={rentedCount} sub={`${freeCount} свободно`} icon={Home} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Общая площадь" value={totalArea > 0 ? `${new Intl.NumberFormat("ru-RU").format(totalArea)} м²` : "—"} sub="по всем объектам" icon={Building2} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Аренда в месяц" value={formatCurrency(totalMonthlyRent)} sub="по сданным объектам" icon={Wallet} color="yellow" loading={isLoading} />
			</KpiRow>

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Building2 className="w-7 h-7 text-blue-600" />
						Объекты аренды
					</h1>
					<p className="text-muted-foreground text-sm">
						Реестр помещений для сдачи в аренду
					</p>
				</div>
				<Button onClick={openCreate} className="gap-2">
					<Plus className="w-4 h-4" />
					Добавить объект
				</Button>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
			<PropTable
				isLoading={isLoading}
				sortedProps={sortedProps}
				propertiesArray={propertiesArray}
				rentedCount={rentedCount}
				totalArea={totalArea}
				sortKey={sortKey}
				sortDir={sortDir}
				toggle={toggle}
				openCreate={openCreate}
				openEdit={openEdit}
				onDelete={handleDelete}
			/>
			</RentalQueryState>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Редактировать объект" : "Новый объект аренды"}
						</DialogTitle>
					</DialogHeader>

					{editing ? (
						<Tabs defaultValue="details">
							<TabsList className="w-full">
								<TabsTrigger value="details" className="flex-1">Данные</TabsTrigger>
								<TabsTrigger value="owners" className="flex-1">Владельцы</TabsTrigger>
							</TabsList>

							<TabsContent value="details">
								<div className="grid gap-3 py-2">
									<PropertyFormFields form={form} setField={setField} />
								</div>
								<div className="flex justify-between gap-2 pt-2">
									<Button
										type="button"
										variant="outline"
										className="text-rose-600 border-rose-200 hover:bg-rose-50"
										onClick={() => editing && handleDelete(editing)}
									>
										<Trash2 className="w-4 h-4 mr-1" />
										Удалить
									</Button>
									<div className="flex gap-2">
										<Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
										<Button onClick={handleSave} disabled={saving}>
											{saving ? "Сохранение..." : "Сохранить"}
										</Button>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="owners">
								<PropertyOwnersPanel propertyId={editing.id} />
							</TabsContent>
						</Tabs>
					) : (
						<>
							<div className="grid gap-3 py-2">
								<PropertyFormFields form={form} setField={setField} />
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
								<Button onClick={handleSave} disabled={saving}>
									{saving ? "Сохранение..." : "Добавить"}
								</Button>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
