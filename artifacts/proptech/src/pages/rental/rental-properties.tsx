import { useListRentalProperties } from "@/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Trash2, UserCircle } from "lucide-react";
import { useSortable } from "@/lib/use-sortable";
import { SortHead } from "@/components/sort-head";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

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

function formatCurrency(amount: number, currency: string) {
	return new Intl.NumberFormat("ru-KZ", { style: "currency", currency }).format(
		amount,
	);
}

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
		setAdding(true);
		try {
			await api.post("/rental/investments", { propertyId, investorId: parseInt(addInvestorId), sharePercent: share });
			setAddInvestorId(""); setAddShare("");
			invalidate();
		} catch (e: any) {
			toast({ title: "Ошибка", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
		} finally { setAdding(false); }
	};

	const handleShareChange = async (id: number, val: string) => {
		const share = parseFloat(val);
		if (isNaN(share)) return;
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
			toast({ title: "Ошибка", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
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

export default function RentalProperties() {
	const searchString = useSearch();
	const { toast } = useToast();
	const qc = useQueryClient();
	const { data: properties, isLoading } = useListRentalProperties();
	const propertiesArray = (Array.isArray(properties) ? properties : []) as RentalPropertyRow[];
	const { sorted: sortedProps, sortKey, sortDir, toggle } = useSortable(propertiesArray, "projectName");

	const rentedCount = propertiesArray.filter((p) => p.rentalStatus === "rented").length;
	const totalArea = propertiesArray.reduce((s, p) => s + (p.area ?? 0), 0);

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
		qc.invalidateQueries({ queryKey: ["rental-properties"] });
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
			const msg =
				e && typeof e === "object" && "response" in e
					? (e as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			toast({
				title: "Ошибка",
				description: msg || (e instanceof Error ? e.message : "Не удалось сохранить"),
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const setField = (k: keyof FormState, v: string) =>
		setForm((f) => ({ ...f, [k]: v }));

	return (
		<div className="p-6 space-y-4">
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

			<div className="rounded-md border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<SortHead label="Проект" sortKey="projectName" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Номер" sortKey="unitNumber" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Тип" sortKey="type" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Площадь, м²" sortKey="area" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Арендатор" sortKey="currentTenantName" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Аренда" sortKey="currentRentAmount" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Статус" sortKey="rentalStatus" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<TableHead className="w-12" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !propertiesArray.length ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center text-muted-foreground py-10">
									<p>Объекты не найдены</p>
									<Button variant="link" className="mt-2" onClick={openCreate}>Добавить первый объект</Button>
								</TableCell>
							</TableRow>
						) : (
							sortedProps.map((p) => (
								<TableRow key={p.id}>
									<TableCell className="font-medium">{p.projectName}</TableCell>
									<TableCell>{p.unitNumber}</TableCell>
									<TableCell>
										{p.type === "apartment"
											? "Квартира"
											: p.type === "office"
												? "Офис"
												: p.type}
									</TableCell>
									<TableCell>{p.area ? `${p.area} м²` : "—"}</TableCell>
									<TableCell>{p.currentTenantName || "—"}</TableCell>
									<TableCell>
										{p.currentRentAmount
											? formatCurrency(
													p.currentRentAmount,
													p.currency || "KZT",
												)
											: "—"}
									</TableCell>
									<TableCell>
										<Badge
											className={statusColors[p.rentalStatus] || ""}
											variant="secondary"
										>
											{statusLabels[p.rentalStatus] || p.rentalStatus}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => openEdit(p)}
										>
											<Pencil className="w-3.5 h-3.5" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
					{!isLoading && propertiesArray.length > 0 && (
						<tfoot>
							<TableRow className="bg-gray-50 font-semibold border-t-2">
								<TableCell colSpan={2} className="text-sm text-gray-600">Итого: {propertiesArray.length} объектов</TableCell>
								<TableCell className="text-sm text-gray-600">{rentedCount} сдано</TableCell>
								<TableCell className="text-sm tabular-nums">{totalArea > 0 ? `${new Intl.NumberFormat("ru-RU").format(totalArea)} м²` : "—"}</TableCell>
								<TableCell colSpan={4} />
							</TableRow>
						</tfoot>
					)}
				</Table>
			</div>

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
								<div className="flex justify-end gap-2 pt-2">
									<Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
									<Button onClick={handleSave} disabled={saving}>
										{saving ? "Сохранение..." : "Сохранить"}
									</Button>
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
