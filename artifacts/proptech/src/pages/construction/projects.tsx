import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building,
	Calculator,
	CalendarDays,
	Edit2,
	FileUp,
	FileText,
	Grid3X3,
	HardHat,
	MapPin,
	Plus,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	applyParsedToProjectForm,
	ProjectDocumentUploadDialog,
	type ParsedProjectDocument,
} from "@/components/project-document-upload";
import { api } from "@/lib/api";
import {
	currencySymbol,
	fmtProjectAmount,
	projectCostBreakdown,
	projectCostInCurrency,
	projectCostLabel,
} from "@/lib/project-currency";
import { unwrapList } from "@/lib/unwrap-list";

const BUILD_TYPES = [
	{ value: "apartment", label: "Жилой дом (квартиры)" },
	{ value: "commercial", label: "Коммерческая недвижимость" },
	{ value: "office", label: "Офисный центр" },
	{ value: "warehouse", label: "Склад" },
	{ value: "mixed", label: "Многофункциональный" },
	{ value: "cottage", label: "Коттедж / дача" },
];
const CONST_TYPES = [
	{ value: "monolith", label: "Монолит" },
	{ value: "brick", label: "Кирпич" },
	{ value: "panel", label: "Панельный" },
	{ value: "frame", label: "Каркасный" },
	{ value: "wood", label: "Дерево" },
];
const STATUS_OPTS = [
	{ value: "planning", label: "Планирование" },
	{ value: "active", label: "Активен" },
	{ value: "paused", label: "Приостановлен" },
	{ value: "completed", label: "Завершён" },
];
const CURRENCY_OPTS = ["KGS", "USD", "EUR", "RUB", "CNY"];
const RATE_SOURCES = [
	{ value: "nbkr", label: "НБКР (официальный)" },
	{ value: "optima", label: "Optima Bank" },
	{ value: "rsb", label: "RSB Bank" },
	{ value: "bakai", label: "Bakai Bank" },
	{ value: "dobank", label: "Dos-Credit Bank" },
	{ value: "mbank", label: "MBank" },
	{ value: "manual", label: "Ввести вручную" },
];
const STATUS_COLORS: Record<string, string> = {
	planning: "bg-gray-100 text-gray-700",
	active: "bg-blue-100 text-blue-700",
	completed: "bg-emerald-100 text-emerald-700",
	paused: "bg-amber-100 text-amber-700",
};

interface Project {
	id: number;
	name: string;
	address?: string;
	region?: string;
	status: string;
	buildingType: string;
	constructionType: string;
	totalFloors?: number;
	totalUnits?: number;
	totalArea?: string;
	costPerSqm?: string;
	currency: string;
	exchangeRateSource: string;
	exchangeRate?: string;
	estimatedCostKgs?: string;
	startDate?: string;
	plannedEndDate?: string;
	description?: string;
	documentMeta?: string | Record<string, unknown> | null;
	contractTemplateMeta?: string | Record<string, unknown> | null;
	createdAt: string;
}

function parseContractTemplateMeta(
	raw: string | Record<string, unknown> | null | undefined,
): { fileName?: string; label?: string; uploadedAt?: string } | null {
	if (!raw) return null;
	try {
		const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
		if (!obj || typeof obj !== "object") return null;
		return {
			fileName: obj.fileName ? String(obj.fileName) : undefined,
			label: obj.label ? String(obj.label) : undefined,
			uploadedAt: obj.uploadedAt ? String(obj.uploadedAt) : undefined,
		};
	} catch {
		return null;
	}
}

function parseDocumentMeta(
	raw: string | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
	if (!raw) return null;
	if (typeof raw === "object") return raw;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
}

const emptyForm = () => ({
	name: "",
	address: "",
	region: "",
	status: "planning",
	buildingType: "apartment",
	constructionType: "monolith",
	totalFloors: "",
	totalUnits: "",
	totalArea: "",
	costPerSqm: "",
	currency: "KGS",
	exchangeRateSource: "nbkr",
	exchangeRate: "1",
	startDate: "",
	plannedEndDate: "",
	description: "",
});

function ProjectDialog({
	project,
	prefill,
	onClose,
	onSaved,
	onRequestDocUpload,
}: {
	project: Project | null | "new";
	prefill?: ReturnType<typeof applyParsedToProjectForm> | null;
	onClose: () => void;
	onSaved: () => void;
	onRequestDocUpload?: () => void;
}) {
	const { toast } = useToast();
	const isEdit = project && project !== "new";
	const init = isEdit ? (project as Project) : null;
	const [form, setForm] = useState(() => {
		if (prefill) {
			const { documentMeta: _dm, ...rest } = prefill;
			return { ...emptyForm(), ...rest };
		}
		if (init) {
			return {
				name: init.name,
				address: init.address || "",
				region: init.region || "",
				status: init.status,
				buildingType: init.buildingType,
				constructionType: init.constructionType,
				totalFloors: String(init.totalFloors || ""),
				totalUnits: String(init.totalUnits || ""),
				totalArea: init.totalArea || "",
				costPerSqm: init.costPerSqm || "",
				currency: init.currency,
				exchangeRateSource: init.exchangeRateSource,
				exchangeRate: init.exchangeRate || "1",
				startDate: init.startDate || "",
				plannedEndDate: init.plannedEndDate || "",
				description: init.description || "",
			};
		}
		return emptyForm();
	});
	const [documentMeta, setDocumentMeta] = useState<Record<string, unknown> | null>(
		() => prefill?.documentMeta ?? parseDocumentMeta(init?.documentMeta) ?? null,
	);
	const [templateInfo, setTemplateInfo] = useState(() =>
		parseContractTemplateMeta(init?.contractTemplateMeta),
	);
	const [templateLabel, setTemplateLabel] = useState(
		() => parseContractTemplateMeta(init?.contractTemplateMeta)?.label || "",
	);
	const [templateUploading, setTemplateUploading] = useState(false);
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	useEffect(() => {
		if (!prefill) return;
		const { documentMeta: dm, ...rest } = prefill;
		setForm((f) => ({ ...f, ...rest }));
		if (dm) setDocumentMeta(dm);
	}, [prefill]);

	const area = parseFloat(form.totalArea || "0");
	const cps = parseFloat(form.costPerSqm || "0");
	const rate = parseFloat(form.exchangeRate || "1");
	const estimatedLocal = area * cps;
	const estimatedKgs =
		form.currency === "KGS" ? estimatedLocal : estimatedLocal * rate;
	const displayCost = projectCostInCurrency({
		totalArea: form.totalArea,
		costPerSqm: form.costPerSqm,
		currency: form.currency,
		exchangeRate: form.exchangeRate,
		estimatedCostKgs: String(estimatedKgs),
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim()) {
			toast({ title: "Укажите название проекта", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			// Подготовка данных - конвертация строк в числа
			const payload = {
				...form,
				totalFloors: form.totalFloors ? parseInt(form.totalFloors, 10) : null,
				totalUnits: form.totalUnits ? parseInt(form.totalUnits, 10) : null,
				totalArea: form.totalArea ? parseFloat(form.totalArea) : null,
				costPerSqm: form.costPerSqm ? parseFloat(form.costPerSqm) : null,
				exchangeRate: form.exchangeRate ? parseFloat(form.exchangeRate) : 1,
				totalBudget: estimatedKgs,
				documentMeta: documentMeta || undefined,
			};

			if (isEdit) {
				await api.patch(
					`/construction/projects/${(init as Project).id}`,
					payload,
				);
			} else {
				const { data } = await api.post<Project & { unitsCreated?: number }>(
					"/construction/projects",
					payload,
				);
				const created = data.unitsCreated ?? 0;
				toast({
					title: "Проект создан",
					description:
						created > 0
							? `В шахматке автоматически создано ${created} квартир`
							: "Укажите этажи и число квартир — тогда шахматка заполнится сама",
				});
				onSaved();
				onClose();
				return;
			}

			toast({ title: "Проект обновлён" });
			onSaved();
			onClose();
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Не удалось сохранить проект";
			toast({
				title: "Ошибка",
				description: message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!project} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать проект" : "Новый строительный проект"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5">
					{onRequestDocUpload && (
						<Button
							type="button"
							variant="outline"
							className="w-full gap-2 border-amber-200 text-amber-800 hover:bg-amber-50"
							onClick={onRequestDocUpload}
						>
							<FileUp className="w-4 h-4" />
							Загрузить данные из документа (PDF / фото)
						</Button>
					)}
					{documentMeta && (
						<div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-800">
							Данные с титульного листа загружены (стадия, заказчик, ГАП…)
						</div>
					)}
					{/* Основная информация */}
					<div className="space-y-3">
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Основное
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="sm:col-span-2 flex flex-col">
								<Label className="leading-tight mb-1.5">Название проекта *</Label>
								<Input
									className="mt-auto"
									value={form.name}
									onChange={(e) => set("name", e.target.value)}
									placeholder='ЖК "Бишкек Хайтс"'
									required
								/>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Статус</Label>
								<Select
									value={form.status}
									onValueChange={(v) => set("status", v)}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Регион</Label>
								<Input
									className="mt-auto"
									value={form.region}
									onChange={(e) => set("region", e.target.value)}
									placeholder="Бишкек"
								/>
							</div>
							<div className="sm:col-span-2 flex flex-col">
								<Label className="leading-tight mb-1.5">Адрес</Label>
								<Input
									className="mt-auto"
									value={form.address}
									onChange={(e) => set("address", e.target.value)}
									placeholder="ул. Манаса, 45"
								/>
							</div>
						</div>
					</div>

					{/* Характеристики здания */}
					<div className="space-y-3">
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
							<Building className="w-3.5 h-3.5" /> Характеристики здания
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Тип здания</Label>
								<Select
									value={form.buildingType}
									onValueChange={(v) => set("buildingType", v)}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{BUILD_TYPES.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Тип конструкции</Label>
								<Select
									value={form.constructionType}
									onValueChange={(v) => set("constructionType", v)}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CONST_TYPES.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Этажей</Label>
								<Input
									className="mt-auto"
									type="number"
									min="1"
									value={form.totalFloors}
									onChange={(e) => set("totalFloors", e.target.value)}
									placeholder="16"
								/>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Квартир / юнитов (всего)</Label>
								<Input
									className="mt-auto"
									type="number"
									min="1"
									value={form.totalUnits}
									onChange={(e) => set("totalUnits", e.target.value)}
									placeholder="120"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									При сохранении проекта квартиры появятся в шахматке автоматически
								</p>
							</div>
							<div className="sm:col-span-2 flex flex-col">
								<Label className="leading-tight mb-1.5">Общая площадь (кв.м)</Label>
								<Input
									className="mt-auto"
									type="number"
									min="0"
									step="0.01"
									value={form.totalArea}
									onChange={(e) => set("totalArea", e.target.value)}
									placeholder="8400"
								/>
							</div>
						</div>
					</div>

					{/* Себестоимость */}
					<div className="space-y-3">
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
							<Calculator className="w-3.5 h-3.5" /> Расчёт себестоимости
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Стоимость за 1 кв.м ({form.currency})</Label>
								<Input
									className="mt-auto"
									type="number"
									min="0"
									value={form.costPerSqm}
									onChange={(e) => set("costPerSqm", e.target.value)}
									placeholder={form.currency === "USD" ? "1200" : "105000"}
								/>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Валюта проекта</Label>
								<Select
									value={form.currency}
									onValueChange={(v) => {
										set("currency", v);
										if (v === "KGS") set("exchangeRate", "1");
									}}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CURRENCY_OPTS.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{form.currency !== "KGS" && (
								<>
									<div>
										<Label>Источник курса</Label>
										<Select
											value={form.exchangeRateSource}
											onValueChange={(v) => set("exchangeRateSource", v)}
										>
											<SelectTrigger className="mt-1">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{RATE_SOURCES.map((r) => (
													<SelectItem key={r.value} value={r.value}>
														{r.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label>Курс к KGS</Label>
										<Input
											className="mt-1"
											type="number"
											min="0"
											step="0.0001"
											value={form.exchangeRate}
											onChange={(e) => set("exchangeRate", e.target.value)}
											placeholder="88.5"
										/>
									</div>
								</>
							)}
						</div>

						{displayCost.total > 0 && (
							<div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-100 rounded-lg p-3">
								<p className="text-xs text-amber-600 font-medium">
									{projectCostLabel(form.currency)}
								</p>
								<p className="text-lg font-bold text-amber-700">
									{fmtProjectAmount(displayCost.total)}{" "}
									{currencySymbol(form.currency)}
								</p>
								{projectCostBreakdown({
									totalArea: form.totalArea,
									costPerSqm: form.costPerSqm,
									currency: form.currency,
									exchangeRate: form.exchangeRate,
								}) && (
									<p className="text-xs text-amber-600 mt-0.5">
										{projectCostBreakdown({
											totalArea: form.totalArea,
											costPerSqm: form.costPerSqm,
											currency: form.currency,
											exchangeRate: form.exchangeRate,
										})}
										{form.currency !== "KGS" &&
											` · курс ${rate} KGS/${form.currency}`}
									</p>
								)}
							</div>
						)}
					</div>

					{/* Сроки */}
					<div className="space-y-3">
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Сроки
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Дата начала</Label>
								<Input
									className="mt-auto"
									type="date"
									value={form.startDate}
									onChange={(e) => set("startDate", e.target.value)}
								/>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Плановая дата сдачи</Label>
								<Input
									className="mt-auto"
									type="date"
									value={form.plannedEndDate}
									onChange={(e) => set("plannedEndDate", e.target.value)}
								/>
							</div>
						</div>
					</div>

					{isEdit && init && (
						<div className="space-y-3 border border-orange-100 rounded-lg p-3 bg-orange-50/40">
							<p className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5" /> Шаблон договора продаж
							</p>
							<p className="text-xs text-gray-500">
								Загрузите .docx — его будут использовать менеджеры продаж и юристы при
								генерации договоров по этому проекту.
							</p>
							{templateInfo?.fileName && (
								<div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
									Загружен: {templateInfo.label || templateInfo.fileName}
									{templateInfo.uploadedAt && (
										<span className="text-emerald-600">
											{" "}
											· {new Date(templateInfo.uploadedAt).toLocaleDateString("ru-RU")}
										</span>
									)}
								</div>
							)}
							<div>
								<Label>Название шаблона</Label>
								<Input
									className="mt-1 bg-white"
									value={templateLabel}
									onChange={(e) => setTemplateLabel(e.target.value)}
									placeholder="Договор BFT — ЖК Алатоо"
								/>
							</div>
							<div>
								<Label>Файл шаблона (.docx)</Label>
								<Input
									className="mt-1 bg-white"
									type="file"
									accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
									onChange={async (e) => {
										const file = e.target.files?.[0];
										if (!file || !init) return;
										setTemplateUploading(true);
										try {
											const buf = await file.arrayBuffer();
											const bytes = new Uint8Array(buf);
											let binary = "";
											for (let i = 0; i < bytes.length; i++) {
												binary += String.fromCharCode(bytes[i]);
											}
											const dataBase64 = btoa(binary);
											const { data } = await api.post<{
												contractTemplateMeta: {
													fileName: string;
													label: string;
													uploadedAt: string;
												};
											}>(`/construction/projects/${init.id}/contract-template`, {
												fileName: file.name,
												label: templateLabel.trim() || file.name,
												dataBase64,
											});
											setTemplateInfo(data.contractTemplateMeta);
											toast({ title: "Шаблон договора сохранён" });
										} catch (err: unknown) {
											toast({
												title: "Не удалось загрузить шаблон",
												description:
													err instanceof Error ? err.message : undefined,
												variant: "destructive",
											});
										} finally {
											setTemplateUploading(false);
											e.target.value = "";
										}
									}}
									disabled={templateUploading}
								/>
							</div>
							{templateInfo?.fileName && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="text-rose-700 border-rose-200 hover:bg-rose-50"
									disabled={templateUploading}
									onClick={async () => {
										if (!init || !confirm("Удалить шаблон договора проекта?")) return;
										setTemplateUploading(true);
										try {
											await api.delete(
												`/construction/projects/${init.id}/contract-template`,
											);
											setTemplateInfo(null);
											setTemplateLabel("");
											toast({ title: "Шаблон удалён" });
										} catch {
											toast({ title: "Ошибка", variant: "destructive" });
										} finally {
											setTemplateUploading(false);
										}
									}}
								>
									Удалить шаблон
								</Button>
							)}
						</div>
					)}

					<div>
						<Label>Описание</Label>
						<Textarea
							className="mt-1"
							value={form.description}
							onChange={(e) => set("description", e.target.value)}
							rows={2}
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
							{loading
								? "Сохранение..."
								: isEdit
									? "Сохранить"
									: "Создать проект"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionProjects() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Project | null | "new">(null);
	const [docUploadOpen, setDocUploadOpen] = useState(false);
	const [prefill, setPrefill] = useState<ReturnType<
		typeof applyParsedToProjectForm
	> | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("create") !== "1") return;
		setPrefill(null);
		setDialog("new");
		window.history.replaceState(null, "", "/construction/projects");
	}, []);

	const handleDocumentParsed = (parsed: ParsedProjectDocument) => {
		setPrefill(applyParsedToProjectForm(parsed));
		setDialog("new");
	};

	const { data: projectsRaw, isLoading } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () =>
			api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: expensesRaw } = useQuery({
		queryKey: ["construction-project-expenses"],
		queryFn: () =>
			api.get("/construction/analytics/project-expenses").then((r) => r.data),
	});

	const projectsArray = unwrapList<Project>(projectsRaw);
	const expensesArray = unwrapList<{ projectId: number; totalExpenses: string }>(
		expensesRaw,
	);
	const expensesMap = new Map(
		expensesArray.map((e) => [e.projectId, parseFloat(e.totalExpenses || "0")]),
	);
	const filtered = projectsArray.filter(
		(p) =>
			!search ||
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.address?.toLowerCase().includes(search.toLowerCase()),
	);

	const handleDelete = async (id: number, name: string) => {
		if (!confirm(`Удалить проект "${name}"?`)) return;
		try {
			await api.delete(`/construction/projects/${id}`);
			toast({ title: "Проект удалён" });
			queryClient.invalidateQueries({ queryKey: ["construction-projects"] });
		} catch (err: any) {
			toast({
				title: "Ошибка удаления",
				description: err.message,
				variant: "destructive",
			});
		}
	};

	const BUILD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
		BUILD_TYPES.map((b) => [b.value, b.label]),
	);
	const STATUS_LABEL: Record<string, string> = Object.fromEntries(
		STATUS_OPTS.map((s) => [s.value, s.label]),
	);

	return (
		<div className="am-page space-y-5">
			<div className="am-page-header">
				<div>
					<h1 className="am-page-title text-2xl">
						Строительные проекты
					</h1>
					<p className="am-page-subtitle text-sm">
						Управление проектами и расчёт себестоимости
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={() => setDocUploadOpen(true)}
						className="gap-2"
					>
						<FileUp className="w-4 h-4" /> Из документа
					</Button>
					<Button
						onClick={() => {
							setPrefill(null);
							setDialog("new");
						}}
						className="bg-amber-500 hover:bg-orange-600 gap-2"
					>
						<Plus className="w-4 h-4" /> Новый проект
					</Button>
				</div>
			</div>

			<div className="mb-2">
				<Input
					placeholder="Поиск по названию или адресу..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-xl rounded-2xl bg-white shadow-sm"
				/>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-52 rounded-xl" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<div className="text-center py-16 text-gray-600">
					<HardHat className="w-12 h-12 mx-auto mb-3 opacity-20" />
					<p className="font-medium">
						{search ? "Ничего не найдено" : "Проектов пока нет"}
					</p>
					<p className="text-sm mt-1">Нажмите «Новый проект» чтобы начать</p>
				</div>
			) : (
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
					{filtered.map((p) => {
						const cost = projectCostInCurrency(p);
						const breakdown = projectCostBreakdown(p);
						const sym = currencySymbol(p.currency || "KGS");
						const meta = parseDocumentMeta(p.documentMeta);
						const templateMeta = parseContractTemplateMeta(p.contractTemplateMeta);

						const totalExpenses = expensesMap.get(p.id) || 0;
						const area = parseFloat(p.totalArea || "0");
						const currentCostPerSqm = area > 0 ? totalExpenses / area : 0;
						const plannedCostPerSqm = parseFloat(p.costPerSqm || "0");

						return (
							<div
								key={p.id}
								className="group overflow-hidden rounded-[28px] border border-white/80 bg-white/78 shadow-2xl shadow-slate-950/8 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-cyan-950/12"
							>
								<div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
									<div className="min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 text-white">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/85">
													Проект / ЖК
												</p>
												<h3 className="mt-1 truncate text-xl font-black text-white">
												{p.name}
											</h3>
											{(p.address || p.region) && (
													<div className="mt-1 flex items-center gap-1.5">
														<MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-200/70" />
														<p className="truncate text-sm text-slate-300">
														{p.address || p.region}
													</p>
												</div>
											)}
										</div>
										<Badge
												className={`${STATUS_COLORS[p.status] || ""} rounded-full px-3 py-1 text-xs`}
											variant="secondary"
										>
											{STATUS_LABEL[p.status] || p.status}
										</Badge>
										</div>

										<div className="mt-3 grid gap-2 sm:grid-cols-3">
											<div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 backdrop-blur">
												<p className="text-[11px] text-slate-400">Тип</p>
												<p className="mt-1 truncate text-sm font-bold text-white">
												{BUILD_TYPE_LABELS[p.buildingType]
													?.split("(")[0]
													.trim() || p.buildingType}
											</p>
										</div>
											<div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 backdrop-blur">
												<p className="text-[11px] text-slate-400">Этажей</p>
												<p className="mt-1 text-lg font-black text-white">
												{p.totalFloors || "—"}
											</p>
										</div>
											<div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 backdrop-blur">
												<p className="text-[11px] text-slate-400">Юнитов</p>
												<p className="mt-1 text-lg font-black text-white">
												{p.totalUnits || "—"}
											</p>
										</div>
									</div>

									{meta && (
											<div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs">
											{meta.stage != null && (
												<p>
													<span className="text-blue-600">Стадия:</span>{" "}
													{String(meta.stage)}
												</p>
											)}
											{meta.client != null && (
												<p>
													<span className="text-blue-600">Заказчик:</span>{" "}
													{String(meta.client)}
												</p>
											)}
											{meta.chiefArchitect != null && (
												<p>
													<span className="text-blue-600">ГАП:</span>{" "}
													{String(meta.chiefArchitect)}
												</p>
											)}
											{meta.contractorCompany != null && (
												<p className="text-gray-600 truncate">
													{String(meta.contractorCompany)}
												</p>
											)}
										</div>
									)}

										<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
											<Button
												size="sm"
												variant="outline"
												className="h-9 flex-1 border-white/15 bg-white/10 text-white hover:bg-white/15"
												onClick={() => setDialog(p)}
											>
												<Edit2 className="mr-2 h-4 w-4" /> Редактировать
											</Button>
											<a
												href={`/construction/chess?projectId=${p.id}`}
												className="inline-flex h-9 items-center gap-2 rounded-full bg-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300"
											>
												<Grid3X3 className="h-4 w-4" /> Шахматка
											</a>
											<Button
												size="icon"
												variant="ghost"
												className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-600"
												onClick={() => handleDelete(p.id, p.name)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div className="space-y-3 p-4">
									{cost.total > 0 && (
											<div className="rounded-[24px] border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-4 shadow-inner">
												<p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
												{projectCostLabel(p.currency || "KGS")}
											</p>
												<p className="mt-2 text-2xl font-black text-slate-950">
												{fmtProjectAmount(cost.total)} {sym}
											</p>
											{breakdown && (
													<p className="mt-1 text-sm text-orange-600">
													{breakdown}
													{p.currency !== "KGS" &&
														p.exchangeRate &&
														` · курс ${p.exchangeRate}`}
												</p>
											)}
										</div>
									)}

									{area > 0 && (plannedCostPerSqm > 0 || currentCostPerSqm > 0) && (
											<div className="rounded-[22px] border border-slate-200/80 bg-white/70 p-3.5 shadow-sm shadow-slate-950/4">
												<p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
												Стоимость за кв.м
											</p>
												<div className="space-y-2">
												{plannedCostPerSqm > 0 && (
													<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
															<span className="text-sm text-slate-500">Плановая</span>
															<span className="text-base font-black text-slate-900">
															{fmtProjectAmount(plannedCostPerSqm)} {sym}/м²
														</span>
													</div>
												)}
												{currentCostPerSqm > 0 && (
													<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
															<span className="text-sm text-slate-500">Текущая</span>
															<span className="text-base font-black text-orange-600">
															{fmtProjectAmount(currentCostPerSqm)} {sym}/м²
														</span>
													</div>
												)}
											</div>
										</div>
									)}

										<div className="rounded-[22px] border border-cyan-100 bg-cyan-50/55 p-3.5">
											<div className="flex items-start gap-3">
												<div className="rounded-2xl bg-cyan-50 p-2 text-cyan-700">
													<CalendarDays className="h-4 w-4" />
												</div>
												<div className="min-w-0 text-sm text-slate-500">
													<p className="font-bold text-slate-900">Сроки проекта</p>
													<p className="mt-1">
											{p.startDate &&
												`Нач: ${new Date(p.startDate).toLocaleDateString("ru-KG")}`}
											{p.startDate && p.plannedEndDate && " — "}
											{p.plannedEndDate &&
												`Сдача: ${new Date(p.plannedEndDate).toLocaleDateString("ru-KG")}`}
														{!p.startDate && !p.plannedEndDate && "Не заданы"}
													</p>
												</div>
											</div>
											{templateMeta?.fileName && (
												<Badge
													variant="outline"
													className="mt-3 rounded-full border-orange-200 bg-orange-50 text-[10px] text-orange-700"
												>
													<FileText className="mr-1 h-3 w-3" />
													Шаблон договора
												</Badge>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<ProjectDialog
				key={dialog === "new" ? `new-${prefill?.name || "empty"}` : String(dialog)}
				project={dialog}
				prefill={dialog === "new" ? prefill : null}
				onClose={() => {
					setDialog(null);
					setPrefill(null);
				}}
				onSaved={() => {
					setPrefill(null);
					queryClient.invalidateQueries({ queryKey: ["construction-projects"] });
				}}
				onRequestDocUpload={() => setDocUploadOpen(true)}
			/>

			<ProjectDocumentUploadDialog
				open={docUploadOpen}
				onClose={() => setDocUploadOpen(false)}
				onParsed={(parsed) => handleDocumentParsed(parsed)}
			/>
		</div>
	);
}
