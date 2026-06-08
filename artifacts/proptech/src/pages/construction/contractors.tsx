import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Briefcase,
	CheckCircle2,
	Edit2,
	Eye,
	FileText,
	Plus,
	Star,
	Trash2,
	UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ContractFileUpload } from "@/components/contract-file-upload";
import { PortalPreviewDialog } from "@/components/portal-preview-dialog";
import {
	AdminReconciliationAct,
	reconciliationFmtMoney,
} from "@/components/admin-reconciliation-act";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { getApiErrorMessage } from "@/lib/api-error";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const SPECS_FALLBACK = [
	"Монолит",
	"Кирпичная кладка",
	"Кровля",
	"Электромонтаж",
	"Сантехника",
	"Отделочные работы",
	"Фасадные работы",
	"Металлоконструкции",
	"Генподряд",
	"Дорожные работы",
	"Благоустройство",
];

interface Specialization {
	id: number;
	name: string;
}

interface Stage {
	id: number;
	name: string;
	projectId: number;
}

interface Contractor {
	id: number;
	fullName: string;
	type: string;
	specialization?: string;
	phone?: string;
	email?: string;
	inn?: string;
	okpo?: string;
	bic?: string;
	contractNumber?: string;
	contractAmount?: string;
	currency: string;
	status: string;
	rating?: number;
	notes?: string;
	stageId?: number | null;
	paymentMilestones?: string;
	paidAmount?: string;
	contractDocument?: { fileName: string; mimeType: string; uploadedAt: string } | null;
}

interface ReconciliationLine {
	date: string | null;
	description: string | null;
	amount: number;
	currency: string | null;
	balanceAfter: number;
}

function emptyForm() {
	return {
		fullName: "",
		type: "company",
		specialization: "",
		phone: "",
		email: "",
		inn: "",
		okpo: "",
		bic: "",
		contractNumber: "",
		contractAmount: "",
		currency: "KGS",
		status: "active",
		rating: "",
		notes: "",
		stageId: "",
		paymentMilestones: "",
		paidAmount: "0",
	};
}

function formFromContractor(c: Contractor) {
	return {
		fullName: c.fullName || "",
		type: c.type || "company",
		specialization: c.specialization || "",
		phone: c.phone || "",
		email: c.email || "",
		inn: c.inn || "",
		okpo: c.okpo || "",
		bic: c.bic || "",
		contractNumber: c.contractNumber || "",
		contractAmount: c.contractAmount || "",
		currency: c.currency || "KGS",
		status: c.status || "active",
		rating: c.rating ? String(c.rating) : "",
		notes: c.notes || "",
		stageId: c.stageId ? String(c.stageId) : "",
		paymentMilestones: c.paymentMilestones || "",
		paidAmount: c.paidAmount || "0",
	};
}

function ContractorDialog({
	contractor,
	specs,
	stages,
	onAddSpec,
	onClose,
	onSaved,
}: {
	contractor: Contractor | null | "new";
	specs: Specialization[];
	stages: Stage[];
	onAddSpec: (name: string) => Promise<void>;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = contractor && contractor !== "new";
	const init = isEdit ? (contractor as Contractor) : null;
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(false);
	const [newSpec, setNewSpec] = useState("");
	const [addingSpec, setAddingSpec] = useState(false);
	const [portalForm, setPortalForm] = useState({
		phone: "",
		email: "",
		firstName: "",
		lastName: "",
	});
	const [portalLoading, setPortalLoading] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const qc = useQueryClient();
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const { data: portalStatus } = useQuery<{
		exists: boolean;
		phone?: string | null;
		firstName?: string | null;
		lastName?: string | null;
	}>({
		queryKey: ["portal-account-status", "contractor", init?.id],
		queryFn: () =>
			api.get(`/portal/account-status/contractor/${init!.id}`).then((r) => r.data),
		enabled: !!init?.id,
	});

	const { data: reconciliationData } = useQuery<{
		reconciliation: {
			contractAmount: number;
			paidAmount: number;
			outstanding: number;
			currency: string;
			lines: ReconciliationLine[];
		};
	}>({
		queryKey: ["contractor-reconciliation", init?.id],
		queryFn: () =>
			api
				.get(`/construction/contractors/${init!.id}/reconciliation`)
				.then((r) => r.data),
		enabled: !!init?.id,
	});

	useEffect(() => {
		if (!contractor || contractor === "new") {
			setForm(emptyForm());
			setPortalForm({ phone: "", email: "", firstName: "", lastName: "" });
			setNewSpec("");
			return;
		}
		const c = contractor as Contractor;
		setForm(formFromContractor(c));
		const nameParts = (c.fullName || "").trim().split(/\s+/);
		setPortalForm({
			phone: c.phone || "",
			email: c.email || "",
			firstName: nameParts[0] || "",
			lastName: nameParts.slice(1).join(" ") || "",
		});
		setNewSpec("");
	}, [contractor]);

	const contractAmount = parseFloat(form.contractAmount || "0");
	const paidAmount = parseFloat(form.paidAmount || "0");
	const outstanding = contractAmount - paidAmount;
	const reconciliation = reconciliationData?.reconciliation;

	const createPortalAccount = async () => {
		if (!isEdit || !init?.id) return;
		if (!form.phone || !portalForm.firstName || !portalForm.lastName) {
			toast({
				title: "Укажите телефон (в контактах), имя и фамилию",
				variant: "destructive",
			});
			return;
		}
		setPortalLoading(true);
		try {
			await api.post("/portal/create-contractor-account", {
				contractorId: init.id,
				phone: form.phone,
				email: portalForm.email || undefined,
				firstName: portalForm.firstName,
				lastName: portalForm.lastName,
			});
			toast({ title: "Доступ создан. Вход — по телефону и SMS-коду." });
			void qc.invalidateQueries({
				queryKey: ["portal-account-status", "contractor", init.id],
			});
		} catch (e: unknown) {
			toast({
				title: getApiErrorMessage(e, "Ошибка создания аккаунта"),
				variant: "destructive",
			});
		} finally {
			setPortalLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fullName) {
			toast({ title: "Укажите название", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/contractors/${init?.id}`
				: `${BASE}/construction/contractors`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					stageId: form.stageId ? parseInt(form.stageId) : null,
				}),
			});
			toast({ title: isEdit ? "Подрядчик обновлён" : "Подрядчик добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!contractor} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать подрядчика" : "Добавить подрядчика"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Basic info */}
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Название / ФИО *</Label>
							<Input
								className="mt-auto"
								value={form.fullName}
								onChange={(e) => set("fullName", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип</Label>
							<Select value={form.type} onValueChange={(v) => set("type", v)}>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="company">Компания</SelectItem>
									<SelectItem value="individual">ИП / физлицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Специализация</Label>
							<Select
								value={form.specialization}
								onValueChange={(v) => set("specialization", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="Выберите..." />
								</SelectTrigger>
								<SelectContent>
									{specs.map((s) => (
										<SelectItem key={s.id} value={s.name}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="mt-2 flex gap-2">
								<Input
									value={newSpec}
									onChange={(e) => setNewSpec(e.target.value)}
									placeholder="Новая специализация"
									className="h-8 text-sm"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="shrink-0"
									disabled={addingSpec || !newSpec.trim()}
									onClick={async () => {
										const name = newSpec.trim();
										if (!name) return;
										setAddingSpec(true);
										try {
											await onAddSpec(name);
											set("specialization", name);
											setNewSpec("");
										} finally {
											setAddingSpec(false);
										}
									}}
								>
									{addingSpec ? "..." : "Добавить"}
								</Button>
							</div>
						</div>
					</div>

					{/* Contacts */}
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон</Label>
							<Input className="mt-auto" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Email</Label>
							<Input className="mt-auto" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ИНН</Label>
							<Input className="mt-auto" value={form.inn} onChange={(e) => set("inn", e.target.value)} />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ОКПО</Label>
							<Input className="mt-auto" value={form.okpo} onChange={(e) => set("okpo", e.target.value)} placeholder="Код организации" />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">БИК банка</Label>
							<Input className="mt-auto" value={form.bic} onChange={(e) => set("bic", e.target.value)} placeholder="БИК" />
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select value={form.status} onValueChange={(v) => set("status", v)}>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
									<SelectItem value="blacklisted">В чёрном списке</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Contract */}
					<div className="border-t pt-3">
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Договор</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">№ договора</Label>
								<Input className="mt-auto" value={form.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} />
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Сумма договора</Label>
								<Input className="mt-auto" type="number" value={form.contractAmount} onChange={(e) => set("contractAmount", e.target.value)} />
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Оплачено</Label>
								<Input className="mt-auto" type="number" value={form.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} />
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Остаток к оплате</Label>
								<div className={`mt-1 h-9 px-3 flex items-center rounded-md border text-sm font-medium ${outstanding < 0 ? "text-rose-700 bg-rose-50 border-rose-200" : outstanding === 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
									{outstanding.toLocaleString("ru-KG")} {form.currency}
								</div>
							</div>
						</div>
						<div className="mt-3">
							<Label>Этапы оплат / вехи</Label>
							<textarea
								className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20"
								value={form.paymentMilestones}
								onChange={(e) => set("paymentMilestones", e.target.value)}
								placeholder="Опишите условия и этапы оплаты..."
							/>
						</div>
					</div>

					{/* Stage link */}
					{stages.length > 0 && (
						<div>
							<Label>Связанный этап</Label>
							<Select
								value={form.stageId || "none"}
								onValueChange={(v) => set("stageId", v === "none" ? "" : v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Не привязан" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Не привязан —</SelectItem>
									{stages.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Rating */}
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Рейтинг (1–5)</Label>
							<Select value={form.rating} onValueChange={(v) => set("rating", v)}>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5].map((n) => (
										<SelectItem key={n} value={String(n)}>
											{"⭐".repeat(n)} ({n})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Document upload */}
					{isEdit && init?.id && (
						<ContractFileUpload
							entityType="contractor"
							entityId={init.id}
							contractDocument={init.contractDocument}
							onUploaded={onSaved}
							portalPrompt={{
								entityType: "contractor",
								entityId: init.id,
								entityName: init.fullName,
								defaultEmail: form.email,
							}}
						/>
					)}

					{isEdit && init?.id && reconciliation && (
						<AdminReconciliationAct
							mode="contractor"
							subjectLabel="Подрядчик"
							subjectName={init.fullName}
							contractLabel={`Договор №${form.contractNumber || "—"}`}
							currency={reconciliation.currency ?? form.currency}
							summary={[
								{
									label: "Договор",
									value: reconciliationFmtMoney(
										reconciliation.contractAmount ?? contractAmount,
										reconciliation.currency ?? form.currency,
									),
								},
								{
									label: "Оплачено",
									value: reconciliationFmtMoney(
										reconciliation.paidAmount ?? paidAmount,
										reconciliation.currency ?? form.currency,
									),
									tone: "emerald",
								},
								{
									label: "Остаток",
									value: reconciliationFmtMoney(
										reconciliation.outstanding ?? outstanding,
										reconciliation.currency ?? form.currency,
									),
									tone: "amber",
								},
							]}
							lines={(reconciliation.lines ?? []).map((line) => ({
								date: line.date ?? "",
								description: line.description || "—",
								amount: line.amount,
								currency: line.currency ?? undefined,
								balanceAfter: line.balanceAfter,
							}))}
						/>
					)}

					{isEdit && init?.id && (
						<div className="border-t pt-3 space-y-3">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
									Доступ в портал подрядчика
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1.5"
									onClick={() => setPreviewOpen(true)}
								>
									<Eye className="w-4 h-4" /> Предпросмотр портала
								</Button>
							</div>

							{portalStatus?.exists ? (
								<div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
									<CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
									<div className="text-sm">
										<p className="font-medium text-emerald-800">
											Доступ создан
										</p>
										<p className="text-xs text-emerald-700">
											Вход по телефону {portalStatus.phone || form.phone || "—"} и SMS-коду
										</p>
									</div>
								</div>
							) : (
								<>
									<p className="text-[11px] text-gray-600">
										Войдёт по телефону из контактов выше ({form.phone || "укажите телефон"}) и SMS-коду
									</p>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="flex flex-col">
											<Label className="leading-tight mb-1.5">Имя *</Label>
											<Input
												className="mt-auto"
												value={portalForm.firstName}
												onChange={(e) =>
													setPortalForm((p) => ({ ...p, firstName: e.target.value }))
												}
											/>
										</div>
										<div className="flex flex-col">
											<Label className="leading-tight mb-1.5">Фамилия *</Label>
											<Input
												className="mt-auto"
												value={portalForm.lastName}
												onChange={(e) =>
													setPortalForm((p) => ({ ...p, lastName: e.target.value }))
												}
											/>
										</div>
										<div className="sm:col-span-2 flex flex-col">
											<Label className="leading-tight mb-1.5">Email (необязательно)</Label>
											<Input
												className="mt-auto"
												type="email"
												value={portalForm.email}
												onChange={(e) =>
													setPortalForm((p) => ({ ...p, email: e.target.value }))
												}
											/>
										</div>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-1.5"
										onClick={() => void createPortalAccount()}
										disabled={portalLoading}
									>
										<UserPlus className="w-4 h-4" />
										{portalLoading ? "..." : "Создать доступ в портал"}
									</Button>
								</>
							)}

							<PortalPreviewDialog
								type="contractor"
								id={init.id}
								open={previewOpen}
								onClose={() => setPreviewOpen(false)}
							/>
						</div>
					)}

					<div>
						<Label>Заметки</Label>
						<Input className="mt-1" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button type="submit" className="bg-amber-500 hover:bg-orange-600" disabled={loading}>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionContractors() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Contractor | null | "new">(null);

	const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
		queryKey: ["construction-contractors"],
		queryFn: () => api.get("/construction/contractors").then((r) => r.data),
	});
	const { data: specs = [] } = useQuery<Specialization[]>({
		queryKey: ["construction-contractor-specs"],
		queryFn: () =>
			api.get("/construction/contractors/specializations").then((r) => r.data),
	});
	const { data: stages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages", "all"],
		queryFn: () => api.get("/construction/stages").then((r) => r.data),
	});
	const specOptions =
		specs.length > 0
			? specs
			: SPECS_FALLBACK.map((name, id) => ({ id: -id, name }));
	const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

	const handleAddSpec = async (name: string) => {
		try {
			await api.post("/construction/contractors/specializations", { name });
			qc.invalidateQueries({ queryKey: ["construction-contractor-specs"] });
			toast({ title: "Специализация добавлена" });
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Не удалось добавить специализацию";
			toast({ title: message, variant: "destructive" });
			throw err;
		}
	};
	const handleDelete = async (id: number) => {
		if (!confirm("Удалить подрядчика?")) return;
		await fetch(`${BASE}/construction/contractors/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-contractors"] });
	};

	const columns = useMemo<ColumnDef<Contractor, unknown>[]>(
		() => [
			{
				id: "fullName",
				header: "Подрядчик",
				size: 200,
				accessorKey: "fullName",
				meta: { exportLabel: "Подрядчик", pinned: "left" },
				cell: ({ row }) => {
					const c = row.original;
					return (
						<div className="flex items-center gap-2.5">
							<div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
								{c.fullName.charAt(0)}
							</div>
							<div>
								<p className="font-medium text-sm text-gray-900">{c.fullName}</p>
								<p className="text-xs text-gray-600">
									{c.type === "company" ? "Компания" : "ИП"}
								</p>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "specialization",
				header: "Специализация",
				size: 140,
				meta: { exportLabel: "Специализация" },
				cell: ({ row }) => (
					<span className="text-sm text-gray-600">
						{row.original.specialization || "—"}
					</span>
				),
			},
			{
				id: "contacts",
				header: "Контакты / ИНН",
				size: 160,
				accessorFn: (row) =>
					[row.phone, row.inn, row.okpo].filter(Boolean).join(" "),
				meta: { exportLabel: "Контакты / ИНН" },
				cell: ({ row }) => {
					const c = row.original;
					return (
						<div className="text-xs">
							<p className="text-gray-600">{c.phone || "—"}</p>
							{c.inn && <p className="text-gray-600">ИНН: {c.inn}</p>}
							{c.okpo && <p className="text-gray-600">ОКПО: {c.okpo}</p>}
						</div>
					);
				},
			},
			{
				id: "contract",
				header: "Договор",
				size: 140,
				accessorFn: (row) => row.contractNumber || "",
				meta: { exportLabel: "Договор" },
				cell: ({ row }) => {
					const c = row.original;
					const contractAmt = parseFloat(c.contractAmount || "0");
					return (
						<div className="text-sm">
							{c.contractNumber && (
								<p className="font-medium text-gray-800">№{c.contractNumber}</p>
							)}
							{contractAmt > 0 && (
								<p className="text-gray-600 text-xs">
									{contractAmt.toLocaleString("ru-KG")} сом
								</p>
							)}
							{c.contractDocument && (
								<p className="text-amber-600 text-xs flex items-center gap-0.5 mt-0.5">
									<FileText className="w-3 h-3" /> договор
								</p>
							)}
							{!c.contractNumber && !c.contractDocument && "—"}
						</div>
					);
				},
			},
			{
				id: "payments",
				header: "Оплачено / Остаток",
				size: 150,
				accessorFn: (row) => parseFloat(row.paidAmount || "0"),
				meta: { exportLabel: "Оплачено", align: "right" },
				cell: ({ row }) => {
					const c = row.original;
					const contractAmt = parseFloat(c.contractAmount || "0");
					const paid = parseFloat(c.paidAmount || "0");
					const outstanding = contractAmt - paid;
					if (contractAmt <= 0) return "—";
					return (
						<div className="text-xs">
							<p className="text-emerald-700 font-medium">
								{paid.toLocaleString("ru-KG")} сом
							</p>
							<p
								className={
									outstanding > 0 ? "text-amber-600" : "text-gray-600"
								}
							>
								ост. {outstanding.toLocaleString("ru-KG")} сом
							</p>
						</div>
					);
				},
			},
			{
				id: "stage",
				header: "Этап",
				size: 120,
				accessorFn: (row) =>
					row.stageId ? stageMap[row.stageId] || `Этап #${row.stageId}` : "—",
				meta: { exportLabel: "Этап" },
				cell: ({ row }) => (
					<span className="text-xs text-gray-600">
						{row.original.stageId
							? stageMap[row.original.stageId] ||
								`Этап #${row.original.stageId}`
							: "—"}
					</span>
				),
			},
			{
				id: "rating",
				header: "Рейтинг",
				size: 110,
				accessorFn: (row) => row.rating ?? 0,
				meta: { exportLabel: "Рейтинг" },
				cell: ({ row }) => {
					const c = row.original;
					if (!c.rating) {
						return <span className="text-gray-600 text-sm">—</span>;
					}
					return (
						<div className="flex items-center gap-0.5">
							{Array.from({ length: 5 }).map((_, i) => (
								<Star
									key={i}
									className={`w-3.5 h-3.5 ${i < c.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
								/>
							))}
						</div>
					);
				},
			},
			{
				id: "status",
				header: "Статус",
				size: 120,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					const c = row.original;
					return (
						<Badge
							className={
								c.status === "active"
									? "bg-emerald-100 text-emerald-800"
									: c.status === "blacklisted"
										? "bg-rose-100 text-rose-800"
										: "bg-gray-100 text-gray-700"
							}
							variant="secondary"
						>
							{c.status === "active"
								? "Активен"
								: c.status === "blacklisted"
									? "Чёрный список"
									: "Неактивен"}
						</Badge>
					);
				},
			},
			{
				id: "__actions",
				header: "Действия",
				size: 90,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => {
					const c = row.original;
					return (
						<div
							className="flex gap-1 justify-center"
							onClick={(e) => e.stopPropagation()}
						>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 w-7 p-0"
								onClick={() => setDialog(c)}
							>
								<Edit2 className="w-3.5 h-3.5 text-gray-600" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 w-7 p-0"
								onClick={() => handleDelete(c.id)}
							>
								<Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-rose-600" />
							</Button>
						</div>
					);
				},
			},
		],
		[stageMap, handleDelete],
	);

	return (
		<div className="am-page space-y-5">
			<div className="am-page-header">
				<div>
					<h1 className="am-page-title text-2xl">Подрядчики</h1>
					<p className="am-page-subtitle text-sm">
						Подрядные организации и ИП со специализацией. Покупатели и поставщики — в{" "}
						<a href="/counterparties" className="text-orange-600 hover:underline">
							общем справочнике контрагентов
						</a>
						.
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить
				</Button>
			</div>

			<DataTable
				tableId="construction-contractors"
				columns={columns}
				data={contractors}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по названию или специализации..."
				initialSorting={[{ id: "fullName", desc: false }]}
				onRowClick={(c) => setDialog(c)}
				rowClassName={() => "cursor-pointer hover:bg-gray-50"}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Briefcase className="w-10 h-10 opacity-20" />
						<span>Подрядчиков нет</span>
					</div>
				}
			/>

			<ContractorDialog
				key={
					dialog && dialog !== "new"
						? `edit-${dialog.id}`
						: dialog === "new"
							? "new"
							: "closed"
				}
				contractor={dialog}
				specs={specOptions}
				stages={stages}
				onAddSpec={handleAddSpec}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-contractors"] })
				}
			/>
		</div>
	);
}
