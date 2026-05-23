import { useListRentalProperties } from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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

export default function RentalProperties() {
	const searchString = useSearch();
	const { toast } = useToast();
	const qc = useQueryClient();
	const { data: properties, isLoading } = useListRentalProperties();
	const propertiesArray = (Array.isArray(properties) ? properties : []) as RentalPropertyRow[];

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
							<TableHead>Проект</TableHead>
							<TableHead>Номер</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Площадь, м²</TableHead>
							<TableHead>Арендатор</TableHead>
							<TableHead>Аренда</TableHead>
							<TableHead>Статус</TableHead>
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
								<TableCell
									colSpan={8}
									className="text-center text-muted-foreground py-10"
								>
									<p>Объекты не найдены</p>
									<Button
										variant="link"
										className="mt-2"
										onClick={openCreate}
									>
										Добавить первый объект
									</Button>
								</TableCell>
							</TableRow>
						) : (
							propertiesArray.map((p) => (
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
				</Table>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Редактировать объект" : "Новый объект аренды"}
						</DialogTitle>
						<DialogDescription>
							Объект появится в списке и будет доступен при создании договора
							аренды
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div>
							<Label className="text-xs">Проект / здание *</Label>
							<Input
								className="mt-1"
								value={form.projectName}
								onChange={(e) => setField("projectName", e.target.value)}
								placeholder="Например, ЖК Центральный"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label className="text-xs">Номер / кабинет *</Label>
								<Input
									className="mt-1"
									value={form.unitNumber}
									onChange={(e) => setField("unitNumber", e.target.value)}
									placeholder="101"
								/>
							</div>
							<div>
								<Label className="text-xs">Тип</Label>
								<Select
									value={form.type}
									onValueChange={(v) => setField("type", v)}
								>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
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
								<Input
									className="mt-1"
									type="number"
									value={form.area}
									onChange={(e) => setField("area", e.target.value)}
								/>
							</div>
							<div>
								<Label className="text-xs">Блок</Label>
								<Input
									className="mt-1"
									value={form.block}
									onChange={(e) => setField("block", e.target.value)}
								/>
							</div>
							<div>
								<Label className="text-xs">Этаж</Label>
								<Input
									className="mt-1"
									type="number"
									value={form.floor}
									onChange={(e) => setField("floor", e.target.value)}
								/>
							</div>
						</div>
						<div>
							<Label className="text-xs">Комментарий</Label>
							<Textarea
								className="mt-1 resize-none"
								rows={2}
								value={form.comment}
								onChange={(e) => setField("comment", e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Отмена
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
