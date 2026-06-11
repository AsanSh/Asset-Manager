import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowDownLeft,
	ArrowUpRight,
	Car,
	Package,
	Scale,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/am/Breadcrumbs";
import { PageShell } from "@/components/am/PageShell";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	CounterpartySelectField,
	SalesContractSelectField,
} from "@/components/construction/operation-reference-fields";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

function fmt(n: unknown) {
	const v = parseFloat(String(n ?? "0"));
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v);
}

const STATUS_LABELS: Record<string, string> = {
	in_stock: "На складе",
	partial: "Частично выдан",
	disposed: "Выдан полностью",
	cancelled: "Отменён",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
	vehicle: "Транспорт",
	equipment: "Техника",
	other: "Прочее",
};

type BarterAsset = {
	id: number;
	title: string;
	identifier?: string | null;
	assetType: string;
	status: string;
	acceptedAmountKgs: string;
	disposedAmountKgs: string;
	remainder?: number;
	projectId?: number | null;
	projectName?: string | null;
	contractId?: number | null;
	contractNumber?: string | null;
};

export default function ConstructionBarter() {
	const qc = useQueryClient();
	const [projectFilter, setProjectFilter] = useState("all");
	const [acceptOpen, setAcceptOpen] = useState(false);
	const [disposeOpen, setDisposeOpen] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<BarterAsset | null>(null);

	const [acceptForm, setAcceptForm] = useState({
		contractId: "",
		accrualId: "none",
		amount: "",
		date: new Date().toISOString().slice(0, 10),
		assetType: "vehicle",
		title: "",
		identifier: "",
		counterpartyId: "none",
		notes: "",
	});

	const [disposeForm, setDisposeForm] = useState({
		amount: "",
		date: new Date().toISOString().slice(0, 10),
		counterpartyId: "none",
		contractorId: "none",
		purpose: "",
		notes: "",
		category: "Подрядчики",
	});

	const projectParams =
		projectFilter !== "all" ? { projectId: projectFilter } : undefined;

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects-all"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});

	const { data: contractors = [] } = useQuery({
		queryKey: ["construction-contractors"],
		queryFn: () => api.get("/construction/contractors").then((r) => r.data),
	});

	const { data: assets = [], isLoading: assetsLoading } = useQuery({
		queryKey: ["construction-barter-assets", projectFilter],
		queryFn: () =>
			api
				.get<BarterAsset[]>("/construction/barter/assets", { params: projectParams })
				.then((r) => r.data),
	});

	const { data: report } = useQuery({
		queryKey: ["construction-barter-report", projectFilter],
		queryFn: () =>
			api.get("/construction/barter/report", { params: projectParams }).then((r) => r.data),
	});

	const contractAccruals = useMemo(() => {
		if (!acceptForm.contractId) return [];
		return (Array.isArray(accruals) ? accruals : []).filter(
			(a: { contractId: number }) =>
				Number(a.contractId) === Number(acceptForm.contractId),
		);
	}, [accruals, acceptForm.contractId]);

	const acceptMut = useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			api.post("/construction/barter/accept", body).then((r) => r.data),
		onSuccess: () => {
			toast.success("Бартер принят и проведён по договору");
			qc.invalidateQueries({ queryKey: ["construction-barter-assets"] });
			qc.invalidateQueries({ queryKey: ["construction-barter-report"] });
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-operations"] });
			qc.invalidateQueries({ queryKey: ["construction-accounts"] });
			setAcceptOpen(false);
		},
		onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка приёма бартера")),
	});

	const disposeMut = useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			api.post("/construction/barter/dispose", body).then((r) => r.data),
		onSuccess: () => {
			toast.success("Бартер выдан контрагенту");
			qc.invalidateQueries({ queryKey: ["construction-barter-assets"] });
			qc.invalidateQueries({ queryKey: ["construction-barter-report"] });
			qc.invalidateQueries({ queryKey: ["construction-operations"] });
			qc.invalidateQueries({ queryKey: ["construction-accounts"] });
			setDisposeOpen(false);
			setSelectedAsset(null);
		},
		onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка выдачи бартера")),
	});

	const summary = report?.summary;
	const position = summary?.position ?? "balanced";

	const assetColumns: ColumnDef<BarterAsset>[] = [
		{
			id: "title",
			header: "Актив",
			accessorKey: "title",
			cell: ({ row }) => (
				<div>
					<div className="font-medium">{row.original.title}</div>
					{row.original.identifier && (
						<div className="text-xs text-muted-foreground">{row.original.identifier}</div>
					)}
				</div>
			),
		},
		{
			id: "assetType",
			header: "Тип",
			accessorFn: (r) => ASSET_TYPE_LABELS[r.assetType] || r.assetType,
		},
		{
			id: "projectName",
			header: "Объект",
			accessorFn: (r) => r.projectName || "—",
		},
		{
			id: "contractNumber",
			header: "Договор",
			accessorFn: (r) => r.contractNumber || (r.contractId ? `#${r.contractId}` : "—"),
		},
		{
			id: "acceptedAmountKgs",
			header: "Принято",
			accessorFn: (r) => Number(r.acceptedAmountKgs),
			cell: ({ row }) => (
				<span className="font-mono text-emerald-700">{fmt(row.original.acceptedAmountKgs)} сом</span>
			),
		},
		{
			id: "disposedAmountKgs",
			header: "Выдано",
			accessorFn: (r) => Number(r.disposedAmountKgs),
			cell: ({ row }) => (
				<span className="font-mono text-rose-700">{fmt(row.original.disposedAmountKgs)} сом</span>
			),
		},
		{
			id: "remainder",
			header: "Остаток",
			accessorFn: (r) => r.remainder ?? 0,
			cell: ({ row }) => (
				<span className="font-mono font-semibold">{fmt(row.original.remainder)} сом</span>
			),
		},
		{
			id: "status",
			header: "Статус",
			accessorKey: "status",
			cell: ({ row }) => (
				<Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
					{STATUS_LABELS[row.original.status] || row.original.status}
				</Badge>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				(row.original.remainder ?? 0) > 0.01 &&
				row.original.status !== "cancelled" ? (
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							setSelectedAsset(row.original);
							setDisposeForm((f) => ({
								...f,
								amount: String(row.original.remainder ?? ""),
							}));
							setDisposeOpen(true);
						}}
					>
						Выдать
					</Button>
				) : null,
		},
	];

	type DealRow = {
		id: number;
		title: string;
		projectName?: string;
		accepted: number;
		disposed: number;
		remainder: number;
		result: number;
		status: string;
	};

	const dealRows: DealRow[] = useMemo(() => {
		const deals = report?.deals ?? [];
		return deals.map((d: { asset: BarterAsset; remainder: number; dealResult: number }) => {
			const asset = d.asset;
			const project = (Array.isArray(projects) ? projects : []).find(
				(p: { id: number }) => Number(p.id) === Number(asset.projectId),
			);
			return {
				id: asset.id,
				title: asset.title,
				projectName: project?.name,
				accepted: parseFloat(asset.acceptedAmountKgs || "0"),
				disposed: parseFloat(asset.disposedAmountKgs || "0"),
				remainder: d.remainder,
				result: d.dealResult,
				status: asset.status,
			};
		});
	}, [report, projects]);

	const dealColumns: ColumnDef<DealRow>[] = [
		{ id: "title", header: "Сделка / актив", accessorKey: "title" },
		{
			id: "projectName",
			header: "Объект",
			accessorFn: (r) => r.projectName || "—",
		},
		{
			id: "accepted",
			header: "Приняли",
			cell: ({ row }) => (
				<span className="font-mono text-emerald-700">{fmt(row.original.accepted)} сом</span>
			),
		},
		{
			id: "disposed",
			header: "Отдали",
			cell: ({ row }) => (
				<span className="font-mono text-rose-700">{fmt(row.original.disposed)} сом</span>
			),
		},
		{
			id: "remainder",
			header: "На складе",
			cell: ({ row }) => (
				<span className="font-mono">{fmt(row.original.remainder)} сом</span>
			),
		},
		{
			id: "result",
			header: "Результат",
			cell: ({ row }) => {
				const v = row.original.result;
				const cls =
					v > 0.01
						? "text-emerald-700"
						: v < -0.01
							? "text-rose-700"
							: "text-gray-600";
				return <span className={`font-mono font-semibold ${cls}`}>{fmt(v)} сом</span>;
			},
		},
	];

	const submitAccept = () => {
		if (!acceptForm.contractId || !acceptForm.title.trim() || !acceptForm.amount) {
			toast.error("Заполните договор, описание актива и сумму");
			return;
		}
		acceptMut.mutate({
			contractId: Number(acceptForm.contractId),
			accrualId:
				acceptForm.accrualId !== "none" ? Number(acceptForm.accrualId) : null,
			amount: acceptForm.amount,
			date: acceptForm.date,
			assetType: acceptForm.assetType,
			title: acceptForm.title,
			identifier: acceptForm.identifier || null,
			counterpartyId:
				acceptForm.counterpartyId !== "none"
					? Number(acceptForm.counterpartyId)
					: null,
			notes: acceptForm.notes || null,
		});
	};

	const submitDispose = () => {
		if (!selectedAsset || !disposeForm.amount) {
			toast.error("Укажите сумму выдачи");
			return;
		}
		disposeMut.mutate({
			assetId: selectedAsset.id,
			amount: disposeForm.amount,
			date: disposeForm.date,
			counterpartyId:
				disposeForm.counterpartyId !== "none"
					? Number(disposeForm.counterpartyId)
					: null,
			contractorId:
				disposeForm.contractorId !== "none"
					? Number(disposeForm.contractorId)
					: null,
			purpose: disposeForm.purpose || null,
			notes: disposeForm.notes || null,
			category: disposeForm.category,
		});
	};

	return (
		<PageShell.List
			title="Бартерный учёт"
			subtitle="Приём активов от покупателей и оплата подрядчикам с контролем остатков"
			breadcrumb={
				<Breadcrumbs
					items={[
						{ label: "Стройка", href: "/construction/dashboard" },
						{ label: "Бартер" },
					]}
				/>
			}
			primaryAction={
				<Button onClick={() => setAcceptOpen(true)}>
					<ArrowDownLeft className="mr-2 h-4 w-4" />
					Принять бартер
				</Button>
			}
			filters={
				<div className="space-y-1">
					<Label className="text-xs">Объект</Label>
					<Select value={projectFilter} onValueChange={setProjectFilter}>
						<SelectTrigger className="w-[220px]">
							<SelectValue placeholder="Все объекты" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все объекты</SelectItem>
							{(Array.isArray(projects) ? projects : []).map((p: { id: number; name: string }) => (
								<SelectItem key={p.id} value={String(p.id)}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			}
			kpis={
				<div className="am-kpi-grid">
				<div className="am-kpi-card">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<ArrowDownLeft className="h-4 w-4 text-emerald-600" />
						Принято (оценка)
					</div>
					<div className="mt-2 text-2xl font-semibold font-mono text-emerald-700">
						{fmt(summary?.totalAccepted)} сом
					</div>
				</div>
				<div className="am-kpi-card">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<ArrowUpRight className="h-4 w-4 text-rose-600" />
						Выдано подрядчикам
					</div>
					<div className="mt-2 text-2xl font-semibold font-mono text-rose-700">
						{fmt(summary?.totalDisposed)} сом
					</div>
				</div>
				<div className="am-kpi-card">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Package className="h-4 w-4 text-cyan-600" />
						На бартерном складе
					</div>
					<div className="mt-2 text-2xl font-semibold font-mono">
						{fmt(summary?.inStock)} сом
					</div>
				</div>
				<div
					className={`am-kpi-card ${
						position === "plus"
							? "border-emerald-200/80 bg-emerald-50/50"
							: position === "minus"
								? "border-rose-200/80 bg-rose-50/50"
								: ""
					}`}
				>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						{position === "minus" ? (
							<TrendingDown className="h-4 w-4 text-rose-600" />
						) : (
							<TrendingUp className="h-4 w-4 text-emerald-600" />
						)}
						Сальдо бартера
					</div>
					<div className="mt-2 text-2xl font-semibold font-mono">
						{fmt(summary?.spread)} сом
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						{position === "plus"
							? "В плюсе — на складе больше, чем выдано"
							: position === "minus"
								? "В минусе — проверьте учёт"
								: "Сбалансировано"}
						{summary?.ledgerBalanced === false ? " · расхождение в движениях" : ""}
					</p>
				</div>
				</div>
			}
		>
			<Tabs defaultValue="assets">
				<TabsList>
					<TabsTrigger value="assets">
						<Car className="mr-2 h-4 w-4" />
						Активы
					</TabsTrigger>
					<TabsTrigger value="report">
						<Scale className="mr-2 h-4 w-4" />
						Отчёт по сделкам
					</TabsTrigger>
				</TabsList>
				<TabsContent value="assets" className="mt-4">
					<DataTable
						tableId="construction-barter-assets"
						columns={assetColumns}
						data={Array.isArray(assets) ? assets : []}
						isLoading={assetsLoading}
					/>
				</TabsContent>
				<TabsContent value="report" className="mt-4">
					<DataTable
						tableId="construction-barter-deals"
						columns={dealColumns}
						data={dealRows}
					/>
				</TabsContent>
			</Tabs>

			<Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Принять бартер от покупателя</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
							Счёт зачисления (бартерный склад) создаётся автоматически при проведении.
							Нужен только договор продажи и описание актива.
						</p>
						<SalesContractSelectField
							value={acceptForm.contractId}
							prefillAmount={acceptForm.amount}
							onValueChange={(v) =>
								setAcceptForm((f) => ({ ...f, contractId: v, accrualId: "none" }))
							}
						/>
						<div className="space-y-1">
							<Label>Начисление (опционально)</Label>
							<Select
								value={acceptForm.accrualId}
								onValueChange={(v) => setAcceptForm((f) => ({ ...f, accrualId: v }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Автораспределение</SelectItem>
									{contractAccruals.map(
										(a: { id: number; installmentNumber: number; amount: string }) => (
											<SelectItem key={a.id} value={String(a.id)}>
												№{a.installmentNumber} — {fmt(a.amount)} сом
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Тип актива</Label>
								<Select
									value={acceptForm.assetType}
									onValueChange={(v) => setAcceptForm((f) => ({ ...f, assetType: v }))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="vehicle">Транспорт</SelectItem>
										<SelectItem value="equipment">Техника</SelectItem>
										<SelectItem value="other">Прочее</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label>Оценка, сом *</Label>
								<Input
									type="number"
									value={acceptForm.amount}
									onChange={(e) =>
										setAcceptForm((f) => ({ ...f, amount: e.target.value }))
									}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label>Описание актива *</Label>
							<Input
								placeholder="Toyota Camry 2018, белый"
								value={acceptForm.title}
								onChange={(e) => setAcceptForm((f) => ({ ...f, title: e.target.value }))}
							/>
						</div>
						<div className="space-y-1">
							<Label>VIN / госномер</Label>
							<Input
								value={acceptForm.identifier}
								onChange={(e) =>
									setAcceptForm((f) => ({ ...f, identifier: e.target.value }))
								}
							/>
						</div>
						<CounterpartySelectField
							label="КОНТРАГЕНТ (ПОКУПАТЕЛЬ)"
							value={acceptForm.counterpartyId}
							defaultRole="buyer"
							onValueChange={(v) =>
								setAcceptForm((f) => ({ ...f, counterpartyId: v }))
							}
						/>
						<div className="space-y-1">
							<Label>Дата</Label>
							<Input
								type="date"
								value={acceptForm.date}
								onChange={(e) => setAcceptForm((f) => ({ ...f, date: e.target.value }))}
							/>
						</div>
						<div className="space-y-1">
							<Label>Комментарий</Label>
							<Textarea
								value={acceptForm.notes}
								onChange={(e) => setAcceptForm((f) => ({ ...f, notes: e.target.value }))}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAcceptOpen(false)}>
							Отмена
						</Button>
						<Button onClick={submitAccept} disabled={acceptMut.isPending}>
							Провести
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Выдать бартер подрядчику</DialogTitle>
					</DialogHeader>
					{selectedAsset && (
						<p className="text-sm text-muted-foreground">
							{selectedAsset.title} · остаток {fmt(selectedAsset.remainder)} сом
						</p>
					)}
					<div className="grid gap-3 py-2">
						<div className="space-y-1">
							<Label>Сумма оценки, сом *</Label>
							<Input
								type="number"
								value={disposeForm.amount}
								onChange={(e) =>
									setDisposeForm((f) => ({ ...f, amount: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-1">
							<Label>Назначение</Label>
							<Input
								value={disposeForm.purpose}
								onChange={(e) =>
									setDisposeForm((f) => ({ ...f, purpose: e.target.value }))
								}
								placeholder="Оплата работ по договору подряда"
							/>
						</div>
						<CounterpartySelectField
							label="КОНТРАГЕНТ"
							value={disposeForm.counterpartyId}
							defaultRole="contractor"
							onValueChange={(v) =>
								setDisposeForm((f) => ({ ...f, counterpartyId: v }))
							}
						/>
						<div className="space-y-1">
							<Label>Подрядчик</Label>
							<Select
								value={disposeForm.contractorId}
								onValueChange={(v) =>
									setDisposeForm((f) => ({ ...f, contractorId: v }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не указан</SelectItem>
									{(Array.isArray(contractors) ? contractors : []).map(
										(c: { id: number; fullName: string }) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.fullName}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Дата</Label>
							<Input
								type="date"
								value={disposeForm.date}
								onChange={(e) =>
									setDisposeForm((f) => ({ ...f, date: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-1">
							<Label>Комментарий</Label>
							<Textarea
								value={disposeForm.notes}
								onChange={(e) =>
									setDisposeForm((f) => ({ ...f, notes: e.target.value }))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDisposeOpen(false)}>
							Отмена
						</Button>
						<Button onClick={submitDispose} disabled={disposeMut.isPending}>
							Выдать
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell.List>
	);
}
