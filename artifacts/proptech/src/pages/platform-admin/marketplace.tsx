import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileSpreadsheet, Package, Plus, Upload, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { downloadMarketplacePriceTemplate } from "@/lib/marketplace-price-template";
import { PortalPreviewDialog } from "@/components/portal-preview-dialog";

type Supplier = {
	id: number;
	name: string;
	supplierType?: string;
	code?: string | null;
	phone?: string | null;
	email?: string | null;
	isActive: boolean;
	portalUser?: {
		id: number;
		firstName: string;
		lastName: string;
		phone?: string | null;
		email?: string | null;
	} | null;
};

type Product = {
	id: number;
	supplierId?: number | null;
	supplierName?: string | null;
	sku?: string | null;
	name: string;
	category: string;
	unit: string;
	unitPrice: string;
	currency: string;
	description?: string | null;
	isActive: boolean;
};

type Order = {
	id: number;
	companyName?: string | null;
	productName?: string | null;
	quantity: string;
	totalAmount: string;
	currency: string;
	status: string;
	createdAt: string;
};

type PreviewRow = {
	rowNumber: number;
	name: string;
	unitPrice: number;
	unit: string;
	sku: string | null;
	category: string;
	errors: string[];
};

type ParseResponse = {
	import: { id: number };
	stats: { total: number; valid: number; invalid: number };
	preview: PreviewRow[];
	previewTruncated?: boolean;
};

const emptySupplier = {
	name: "",
	code: "",
	phone: "",
	email: "",
	supplierType: "seller" as "seller" | "distributor",
};
const emptyPortalAccount = {
	firstName: "",
	lastName: "",
	phone: "",
	email: "",
	password: "",
};

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
	seller: "Продавец",
	distributor: "Дистрибьютор",
};
const emptyProduct = {
	name: "",
	unitPrice: "",
	unit: "шт",
	supplierId: "",
};

function formatSom(v: string | number) {
	const n = typeof v === "string" ? parseFloat(v) : v;
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} сом`;
}

export default function PlatformAdminMarketplace() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);

	const [tab, setTab] = useState("import");
	const [supplierFilter, setSupplierFilter] = useState<string>("all");
	const [importSupplierId, setImportSupplierId] = useState<string>("");
	const [pendingImportId, setPendingImportId] = useState<number | null>(null);
	const [preview, setPreview] = useState<PreviewRow[]>([]);
	const [deactivateMissing, setDeactivateMissing] = useState(true);

	const [supplierDialog, setSupplierDialog] = useState(false);
	const [supplierForm, setSupplierForm] = useState(emptySupplier);
	const [portalDialog, setPortalDialog] = useState(false);
	const [portalSupplier, setPortalSupplier] = useState<Supplier | null>(null);
	const [portalForm, setPortalForm] = useState(emptyPortalAccount);
	const [productDialog, setProductDialog] = useState(false);
	const [productForm, setProductForm] = useState(emptyProduct);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewSupplierId, setPreviewSupplierId] = useState<number | null>(null);

	const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
		queryKey: ["platform-marketplace-suppliers"],
		queryFn: () =>
			api.get<Supplier[]>("/platform-admin/marketplace/suppliers").then((r) => r.data),
	});

	const productQueryKey = [
		"platform-marketplace-products",
		supplierFilter === "all" ? null : supplierFilter,
	] as const;

	const { data: products, isLoading: loadingProducts } = useQuery({
		queryKey: productQueryKey,
		queryFn: () => {
			const params =
				supplierFilter !== "all" ? { supplierId: supplierFilter } : undefined;
			return api
				.get<Product[]>("/platform-admin/marketplace/products", { params })
				.then((r) => r.data);
		},
	});

	const { data: orders } = useQuery({
		queryKey: ["platform-marketplace-orders"],
		queryFn: () =>
			api.get<Order[]>("/platform-admin/marketplace/orders").then((r) => r.data),
	});

	const { data: imports } = useQuery({
		queryKey: ["platform-marketplace-imports"],
		queryFn: () =>
			api
				.get<
					{
						id: number;
						supplierName: string;
						fileName: string | null;
						status: string;
						createdAt: string;
					}[]
				>("/platform-admin/marketplace/imports")
				.then((r) => r.data),
	});

	const createSupplierMut = useMutation({
		mutationFn: () =>
			api.post("/platform-admin/marketplace/suppliers", supplierForm),
		onSuccess: () => {
			toast({ title: "Поставщик добавлен" });
			setSupplierDialog(false);
			setSupplierForm(emptySupplier);
			qc.invalidateQueries({ queryKey: ["platform-marketplace-suppliers"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const createPortalMut = useMutation({
		mutationFn: () =>
			api.post(
				`/platform-admin/marketplace/suppliers/${portalSupplier!.id}/portal-account`,
				portalForm,
			),
		onSuccess: (res) => {
			const d = res.data as { created: boolean; loginUrl: string; portalUrl: string };
			toast({
				title: d.created ? "Аккаунт создан" : "Аккаунт уже был",
				description: `Вход: ${d.loginUrl} → портал ${d.portalUrl}`,
			});
			setPortalDialog(false);
			setPortalForm(emptyPortalAccount);
			qc.invalidateQueries({ queryKey: ["platform-marketplace-suppliers"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const createProductMut = useMutation({
		mutationFn: () =>
			api.post("/platform-admin/marketplace/products", {
				name: productForm.name,
				unit: productForm.unit,
				unitPrice: parseFloat(productForm.unitPrice || "0"),
				supplierId: productForm.supplierId
					? parseInt(productForm.supplierId, 10)
					: null,
			}),
		onSuccess: () => {
			toast({ title: "Товар добавлен" });
			setProductDialog(false);
			setProductForm(emptyProduct);
			qc.invalidateQueries({ queryKey: ["platform-marketplace-products"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const parseMut = useMutation({
		mutationFn: (payload: { supplierId: number; fileName: string; base64: string }) =>
			api
				.post<ParseResponse>("/platform-admin/marketplace/imports/parse", payload)
				.then((r) => r.data),
		onSuccess: (data) => {
			setPendingImportId(data.import.id);
			setPreview(data.preview);
			toast({
				title: "Файл разобран",
				description: `Валидных строк: ${data.stats.valid} из ${data.stats.total}`,
			});
			qc.invalidateQueries({ queryKey: ["platform-marketplace-imports"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка разбора",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const commitMut = useMutation({
		mutationFn: () =>
			api.post(`/platform-admin/marketplace/imports/${pendingImportId}/commit`, {
				deactivateMissing,
			}),
		onSuccess: (res) => {
			const d = res.data as { created: number; updated: number };
			toast({
				title: "Прайс загружен в каталог",
				description: `Создано: ${d.created}, обновлено: ${d.updated}`,
			});
			setPendingImportId(null);
			setPreview([]);
			qc.invalidateQueries({ queryKey: ["platform-marketplace-products"] });
			qc.invalidateQueries({ queryKey: ["platform-marketplace-imports"] });
			setTab("catalog");
		},
		onError: (e) =>
			toast({
				title: "Ошибка загрузки",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const statusMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) =>
			api.patch(`/platform-admin/marketplace/orders/${id}`, { status }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["platform-marketplace-orders"] });
			toast({ title: "Статус обновлён" });
		},
	});

	const handleFile = (file: File) => {
		if (!importSupplierId) {
			toast({
				title: "Выберите поставщика",
				variant: "destructive",
			});
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const base64 = String(reader.result || "");
			parseMut.mutate({
				supplierId: parseInt(importSupplierId, 10),
				fileName: file.name,
				base64,
			});
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Package className="w-7 h-7 text-violet-600" />
						Маркетплейс материалов
					</h1>
					<p className="text-gray-500 mt-1">
						Поставщики, импорт прайс-листов Excel, каталог для всех компаний
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => downloadMarketplacePriceTemplate()}>
						<Download className="w-4 h-4 mr-2" />
						Шаблон Excel
					</Button>
					<Button variant="outline" onClick={() => setSupplierDialog(true)}>
						<Plus className="w-4 h-4 mr-2" />
						Поставщик
					</Button>
				</div>
			</div>

			<Tabs value={tab} onValueChange={setTab}>
				<TabsList>
					<TabsTrigger value="import">Импорт прайса</TabsTrigger>
					<TabsTrigger value="catalog">Каталог</TabsTrigger>
					<TabsTrigger value="suppliers">Поставщики</TabsTrigger>
					<TabsTrigger value="orders">Заявки</TabsTrigger>
				</TabsList>

				<TabsContent value="import" className="space-y-4 mt-4">
					<Card className="p-4 space-y-4">
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label>Поставщик</Label>
								<Select value={importSupplierId} onValueChange={setImportSupplierId}>
									<SelectTrigger>
										<SelectValue placeholder="Выберите поставщика" />
									</SelectTrigger>
									<SelectContent>
										{suppliers
											.filter((s) => s.isActive)
											.map((s) => (
												<SelectItem key={s.id} value={String(s.id)}>
													{s.name}
													{s.code ? ` (${s.code})` : ""}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-end gap-2">
								<input
									ref={fileRef}
									type="file"
									accept=".xlsx,.xls"
									className="hidden"
									onChange={(e) => {
										const f = e.target.files?.[0];
										if (f) handleFile(f);
										e.target.value = "";
									}}
								/>
								<Button
									className="flex-1"
									disabled={!importSupplierId || parseMut.isPending}
									onClick={() => fileRef.current?.click()}
								>
									<Upload className="w-4 h-4 mr-2" />
									{parseMut.isPending ? "Разбор…" : "Загрузить Excel"}
								</Button>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Колонки: Наименование, Цена, Ед., Артикул (опц.), Категория (опц.). При
							повторной загрузке цены обновляются по артикулу или названию.
						</p>
						{pendingImportId && preview.length > 0 && (
							<div className="space-y-3 border-t pt-4">
								<div className="flex items-center gap-2">
									<Checkbox
										id="deactivate"
										checked={deactivateMissing}
										onCheckedChange={(v) => setDeactivateMissing(!!v)}
									/>
									<label htmlFor="deactivate" className="text-sm">
										Скрыть позиции поставщика, которых нет в этом файле
									</label>
								</div>
								<Button
									onClick={() => commitMut.mutate()}
									disabled={commitMut.isPending}
								>
									<FileSpreadsheet className="w-4 h-4 mr-2" />
									{commitMut.isPending ? "Публикация…" : "Опубликовать в маркетплейс"}
								</Button>
							</div>
						)}
					</Card>

					{preview.length > 0 && (
						<Card className="overflow-hidden max-h-[420px] overflow-y-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>#</TableHead>
										<TableHead>Наименование</TableHead>
										<TableHead className="text-right">Цена</TableHead>
										<TableHead>Ед.</TableHead>
										<TableHead>Артикул</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{preview.map((r) => (
										<TableRow key={r.rowNumber}>
											<TableCell>{r.rowNumber}</TableCell>
											<TableCell>{r.name}</TableCell>
											<TableCell className="text-right font-mono">
												{formatSom(r.unitPrice)}
											</TableCell>
											<TableCell>{r.unit}</TableCell>
											<TableCell>{r.sku || "—"}</TableCell>
											<TableCell>
												{r.errors.length > 0 ? (
													<Badge variant="destructive">{r.errors[0]}</Badge>
												) : (
													<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
														OK
													</Badge>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					)}

					{(imports || []).length > 0 && (
						<Card className="p-4">
							<h3 className="font-semibold mb-2">История импортов</h3>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Дата</TableHead>
										<TableHead>Поставщик</TableHead>
										<TableHead>Файл</TableHead>
										<TableHead>Статус</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{imports!.slice(0, 10).map((imp) => (
										<TableRow key={imp.id}>
											<TableCell>
												{new Date(imp.createdAt).toLocaleString("ru-KG")}
											</TableCell>
											<TableCell>{imp.supplierName}</TableCell>
											<TableCell>{imp.fileName || "—"}</TableCell>
											<TableCell>{imp.status}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="catalog" className="mt-4 space-y-3">
					<div className="flex flex-wrap gap-2 items-center justify-between">
						<Select value={supplierFilter} onValueChange={setSupplierFilter}>
							<SelectTrigger className="w-56">
								<SelectValue placeholder="Все поставщики" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все поставщики</SelectItem>
								{suppliers.map((s) => (
									<SelectItem key={s.id} value={String(s.id)}>
										{s.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button onClick={() => setProductDialog(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Добавить вручную
						</Button>
					</div>
					<Card className="overflow-hidden">
						{loadingProducts ? (
							<Skeleton className="h-48 m-4" />
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Поставщик</TableHead>
										<TableHead>Название</TableHead>
										<TableHead>Артикул</TableHead>
										<TableHead className="text-right">Цена</TableHead>
										<TableHead>Ед.</TableHead>
										<TableHead>Статус</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(products || []).map((p) => (
										<TableRow key={p.id}>
											<TableCell className="text-muted-foreground">
												{p.supplierName || "—"}
											</TableCell>
											<TableCell className="font-medium">{p.name}</TableCell>
											<TableCell>{p.sku || "—"}</TableCell>
											<TableCell className="text-right font-mono">
												{formatSom(p.unitPrice)}
											</TableCell>
											<TableCell>{p.unit}</TableCell>
											<TableCell>
												<Badge variant={p.isActive ? "default" : "secondary"}>
													{p.isActive ? "В продаже" : "Скрыт"}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Card>
				</TabsContent>

				<TabsContent value="suppliers" className="mt-4">
					<Card className="overflow-hidden">
						{loadingSuppliers ? (
							<Skeleton className="h-32 m-4" />
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Название</TableHead>
										<TableHead>Тип</TableHead>
										<TableHead>Код</TableHead>
										<TableHead>Телефон</TableHead>
										<TableHead>Аккаунт</TableHead>
										<TableHead>Статус</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{suppliers.map((s) => (
										<TableRow key={s.id}>
											<TableCell className="font-medium">{s.name}</TableCell>
											<TableCell>
												<Badge variant="outline">
													{SUPPLIER_TYPE_LABEL[s.supplierType || "seller"]}
												</Badge>
											</TableCell>
											<TableCell>{s.code || "—"}</TableCell>
											<TableCell>{s.phone || "—"}</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{s.portalUser
													? `${s.portalUser.firstName} ${s.portalUser.lastName}${
															s.portalUser.phone
																? ` · ${s.portalUser.phone}`
																: s.portalUser.email
																	? ` · ${s.portalUser.email}`
																	: ""
														}`
													: "—"}
											</TableCell>
											<TableCell>
												<Badge variant={s.isActive ? "default" : "secondary"}>
													{s.isActive ? "Активен" : "Выкл"}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{!s.portalUser ? (
														<Button
															size="sm"
															variant="outline"
															onClick={() => {
																setPortalSupplier(s);
																setPortalForm({
																	...emptyPortalAccount,
																	firstName: s.name.split(" ")[0] || "",
																	lastName:
																		s.name.split(" ").slice(1).join(" ") ||
																		"Поставщик",
																	phone: s.phone || "",
																	email: s.email || "",
																});
																setPortalDialog(true);
															}}
														>
															<UserPlus className="w-3.5 h-3.5 mr-1" />
															Портал
														</Button>
													) : (
														<Button
															size="sm"
															variant="outline"
															onClick={() => {
																setPreviewSupplierId(s.id);
																setPreviewOpen(true);
															}}
														>
															<Eye className="w-3.5 h-3.5 mr-1" />
															Просмотр
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Card>
				</TabsContent>

				<TabsContent value="orders" className="mt-4">
					<Card className="overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Компания</TableHead>
									<TableHead>Товар</TableHead>
									<TableHead>Сумма</TableHead>
									<TableHead>Статус</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{(orders || []).map((o) => (
									<TableRow key={o.id}>
										<TableCell>{o.companyName || "—"}</TableCell>
										<TableCell>
											{o.productName} × {o.quantity}
										</TableCell>
										<TableCell>{formatSom(o.totalAmount)}</TableCell>
										<TableCell>{o.status}</TableCell>
										<TableCell>
											{o.status === "pending" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														statusMut.mutate({ id: o.id, status: "confirmed" })
													}
												>
													Подтвердить
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый поставщик</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Название</Label>
							<Input
								value={supplierForm.name}
								onChange={(e) =>
									setSupplierForm({ ...supplierForm, name: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Код (краткий)</Label>
							<Input
								value={supplierForm.code}
								onChange={(e) =>
									setSupplierForm({ ...supplierForm, code: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Тип</Label>
							<Select
								value={supplierForm.supplierType}
								onValueChange={(v: "seller" | "distributor") =>
									setSupplierForm({ ...supplierForm, supplierType: v })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="seller">Продавец</SelectItem>
									<SelectItem value="distributor">Дистрибьютор</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Email (для входа)</Label>
							<Input
								value={supplierForm.email}
								onChange={(e) =>
									setSupplierForm({ ...supplierForm, email: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Телефон (OTP-вход)</Label>
							<Input
								value={supplierForm.phone}
								onChange={(e) =>
									setSupplierForm({ ...supplierForm, phone: e.target.value })
								}
							/>
						</div>
						<Button
							className="w-full"
							disabled={!supplierForm.name.trim() || createSupplierMut.isPending}
							onClick={() => createSupplierMut.mutate()}
						>
							Сохранить
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={portalDialog} onOpenChange={setPortalDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Аккаунт портала — {portalSupplier?.name}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-xs text-muted-foreground">
							Телефон → вход через /portal-login (SMS). Email + пароль → обычный /login.
						</p>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Имя</Label>
								<Input
									value={portalForm.firstName}
									onChange={(e) =>
										setPortalForm({ ...portalForm, firstName: e.target.value })
									}
								/>
							</div>
							<div>
								<Label>Фамилия</Label>
								<Input
									value={portalForm.lastName}
									onChange={(e) =>
										setPortalForm({ ...portalForm, lastName: e.target.value })
									}
								/>
							</div>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								value={portalForm.phone}
								onChange={(e) =>
									setPortalForm({ ...portalForm, phone: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								value={portalForm.email}
								onChange={(e) =>
									setPortalForm({ ...portalForm, email: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Пароль (опц., мин. 12 символов)</Label>
							<Input
								type="password"
								value={portalForm.password}
								onChange={(e) =>
									setPortalForm({ ...portalForm, password: e.target.value })
								}
							/>
						</div>
						<Button
							className="w-full"
							disabled={
								!portalForm.firstName.trim() ||
								!portalForm.lastName.trim() ||
								(!portalForm.phone.trim() && !portalForm.email.trim()) ||
								createPortalMut.isPending
							}
							onClick={() => createPortalMut.mutate()}
						>
							Создать аккаунт
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={productDialog} onOpenChange={setProductDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый материал</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Поставщик</Label>
							<Select
								value={productForm.supplierId}
								onValueChange={(v) =>
									setProductForm({ ...productForm, supplierId: v })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Не указан" />
								</SelectTrigger>
								<SelectContent>
									{suppliers.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Название</Label>
							<Input
								value={productForm.name}
								onChange={(e) =>
									setProductForm({ ...productForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Цена (сом)</Label>
								<Input
									type="number"
									value={productForm.unitPrice}
									onChange={(e) =>
										setProductForm({ ...productForm, unitPrice: e.target.value })
									}
								/>
							</div>
							<div>
								<Label>Единица</Label>
								<Input
									value={productForm.unit}
									onChange={(e) =>
										setProductForm({ ...productForm, unit: e.target.value })
									}
								/>
							</div>
						</div>
						<Button
							className="w-full"
							disabled={!productForm.name.trim() || createProductMut.isPending}
							onClick={() => createProductMut.mutate()}
						>
							Сохранить
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{previewSupplierId != null && (
				<PortalPreviewDialog
					type="marketplace_supplier"
					id={previewSupplierId}
					open={previewOpen}
					onClose={() => {
						setPreviewOpen(false);
						setPreviewSupplierId(null);
					}}
				/>
			)}
		</div>
	);
}
