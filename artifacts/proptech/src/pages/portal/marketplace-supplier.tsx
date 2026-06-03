import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	FileSpreadsheet,
	LogOut,
	Package,
	Store,
	Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadMarketplacePriceTemplate } from "@/lib/marketplace-price-template";

type PreviewRow = {
	rowNumber: number;
	name: string;
	unitPrice: number;
	unit: string;
	sku: string | null;
	errors: string[];
};

const TYPE_LABEL: Record<string, string> = {
	seller: "Продавец",
	distributor: "Дистрибьютор",
};

function formatSom(v: number) {
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v)} сом`;
}

export default function MarketplaceSupplierPortal({
	previewSupplierId,
}: { previewSupplierId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const qc = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);
	const [pendingImportId, setPendingImportId] = useState<number | null>(null);
	const [preview, setPreview] = useState<PreviewRow[]>([]);
	const [deactivateMissing, setDeactivateMissing] = useState(true);
	const isPreview = previewSupplierId != null;

	const { data, isLoading } = useQuery({
		queryKey: isPreview
			? ["platform-marketplace-supplier-preview", previewSupplierId]
			: ["portal-marketplace-supplier-me"],
		queryFn: () =>
			api
				.get<{
					supplier: {
						id: number;
						name: string;
						supplierType: string;
						code?: string | null;
					};
					stats: { productsTotal: number; productsActive: number };
					portalUser?: {
						firstName: string;
						lastName: string;
					} | null;
				}>(
					isPreview
						? `/platform-admin/marketplace/suppliers/${previewSupplierId}/portal-preview`
						: "/portal/marketplace-supplier/me",
				)
				.then((r) => r.data),
	});

	const { data: products = [] } = useQuery({
		queryKey: isPreview
			? ["platform-marketplace-supplier-preview-products", previewSupplierId]
			: ["portal-marketplace-supplier-products"],
		queryFn: () =>
			api
				.get<
					{
						id: number;
						name: string;
						sku?: string | null;
						unitPrice: string;
						unit: string;
						isActive: boolean;
					}[]
				>(
					isPreview
						? `/platform-admin/marketplace/suppliers/${previewSupplierId}/portal-preview/products`
						: "/portal/marketplace-supplier/products",
				)
				.then((r) => r.data),
	});

	const parseMut = useMutation({
		mutationFn: (payload: { fileName: string; base64: string }) =>
			api
				.post<{
					import: { id: number };
					stats: { valid: number; total: number };
					preview: PreviewRow[];
				}>("/portal/marketplace-supplier/imports/parse", payload)
				.then((r) => r.data),
		onSuccess: (d) => {
			setPendingImportId(d.import.id);
			setPreview(d.preview);
			toast({
				title: "Файл разобран",
				description: `Готово к публикации: ${d.stats.valid} из ${d.stats.total}`,
			});
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const commitMut = useMutation({
		mutationFn: () =>
			api.post(`/portal/marketplace-supplier/imports/${pendingImportId}/commit`, {
				deactivateMissing,
			}),
		onSuccess: (res) => {
			const d = res.data as { created: number; updated: number };
			toast({
				title: "Каталог обновлён",
				description: `Создано: ${d.created}, обновлено: ${d.updated}`,
			});
			setPendingImportId(null);
			setPreview([]);
			qc.invalidateQueries({ queryKey: ["portal-marketplace-supplier-me"] });
			qc.invalidateQueries({ queryKey: ["portal-marketplace-supplier-products"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка публикации",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const handleFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			parseMut.mutate({
				fileName: file.name,
				base64: String(reader.result || ""),
			});
		};
		reader.readAsDataURL(file);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Skeleton className="h-12 w-48" />
			</div>
		);
	}

	const supplier = data?.supplier;
	const userName = isPreview
		? data?.portalUser
			? `${data.portalUser.firstName} ${data.portalUser.lastName}`.trim()
			: supplier?.name || "Поставщик"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
			supplier?.name ||
			"Поставщик";

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
							<Store className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">Planalityc.ai Маркетплейс</p>
							<p className="text-[10px] text-gray-400 -mt-0.5">Кабинет поставщика</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isPreview && (
							<span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
								👁 Предпросмотр
							</span>
						)}
						<span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[40vw]">
							{userName}
						</span>
						{!isPreview && (
							<Button variant="ghost" size="sm" onClick={logout} className="gap-1.5">
								<LogOut className="w-4 h-4" /> Выйти
							</Button>
						)}
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
				<div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white">
					<div className="flex flex-wrap items-center gap-2 mb-2">
						<Badge className="bg-white/20 text-white border-0">
							{TYPE_LABEL[supplier?.supplierType || "seller"] || "Поставщик"}
						</Badge>
						{supplier?.code && (
							<Badge variant="outline" className="border-white/40 text-white">
								{supplier.code}
							</Badge>
						)}
					</div>
					<h1 className="text-2xl font-bold">{supplier?.name}</h1>
					<p className="text-sm opacity-80 mt-1">
						Загружайте прайс Excel — товары появятся в маркетплейсе под вашим именем
					</p>
					<p className="text-sm mt-3 opacity-90">
						В каталоге: {data?.stats.productsActive ?? 0} активных позиций
					</p>
				</div>

				{!isPreview && (
					<Card className="p-4 space-y-4">
						<h2 className="font-semibold flex items-center gap-2">
							<Upload className="w-4 h-4" /> Загрузка прайс-листа
						</h2>
						<div className="flex flex-wrap gap-2">
							<Button variant="outline" onClick={() => downloadMarketplacePriceTemplate()}>
								<Download className="w-4 h-4 mr-2" /> Шаблон Excel
							</Button>
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
							<Button disabled={parseMut.isPending} onClick={() => fileRef.current?.click()}>
								<FileSpreadsheet className="w-4 h-4 mr-2" />
								{parseMut.isPending ? "Разбор…" : "Выбрать Excel"}
							</Button>
						</div>
						{pendingImportId && preview.length > 0 && (
							<div className="border-t pt-4 space-y-3">
								<div className="flex items-center gap-2">
									<Checkbox
										id="deact"
										checked={deactivateMissing}
										onCheckedChange={(v) => setDeactivateMissing(!!v)}
									/>
									<label htmlFor="deact" className="text-sm">
										Скрыть позиции, которых нет в этом файле
									</label>
								</div>
								<Button onClick={() => commitMut.mutate()} disabled={commitMut.isPending}>
									{commitMut.isPending ? "Публикация…" : "Опубликовать в маркетплейс"}
								</Button>
							</div>
						)}
					</Card>
				)}

				{!isPreview && preview.length > 0 && (
					<Card className="overflow-hidden max-h-80 overflow-y-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Наименование</TableHead>
									<TableHead className="text-right">Цена</TableHead>
									<TableHead>Ед.</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{preview.map((r) => (
									<TableRow key={r.rowNumber}>
										<TableCell>{r.name}</TableCell>
										<TableCell className="text-right font-mono">
											{formatSom(r.unitPrice)}
										</TableCell>
										<TableCell>{r.unit}</TableCell>
										<TableCell>
											{r.errors.length ? (
												<Badge variant="destructive">Ошибка</Badge>
											) : (
												<Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Card>
				)}

				<Card className="overflow-hidden">
					<div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
						<Package className="w-4 h-4" />
						<h2 className="font-semibold">Ваш каталог</h2>
					</div>
					{products.length === 0 ? (
						<p className="p-6 text-center text-muted-foreground text-sm">
							Пока нет товаров — загрузите первый прайс
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Название</TableHead>
									<TableHead>Артикул</TableHead>
									<TableHead className="text-right">Цена</TableHead>
									<TableHead>Статус</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.slice(0, 100).map((p) => (
									<TableRow key={p.id}>
										<TableCell>{p.name}</TableCell>
										<TableCell>{p.sku || "—"}</TableCell>
										<TableCell className="text-right font-mono">
											{formatSom(parseFloat(p.unitPrice))}
										</TableCell>
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
			</div>
		</div>
	);
}
