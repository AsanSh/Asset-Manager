import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckCircle2,
	FileUp,
	Scale,
	Search,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type ReconLine = {
	id: number;
	source: string;
	operationDate: string;
	amount: string;
	currency: string;
	counterpartyName?: string | null;
	description?: string | null;
	matchStatus: string;
	reviewStatus: string;
	suggestedProjectId?: number | null;
	suggestedCategory?: string | null;
	suggestionReason?: string | null;
	confirmedProjectId?: number | null;
	confirmedCategory?: string | null;
	confirmedStageId?: number | null;
	constructionOperationId?: number | null;
};

type MatchingGroup = {
	pairGroupId: string | null;
	operationDate: string;
	amount: string;
	oneCLines: ReconLine[];
	bankLines: ReconLine[];
	matchStatus: string;
};

const SOURCE_LABELS: Record<string, string> = {
	one_c: "1С",
	bank: "Банк",
	manual: "Вручную",
};

const REVIEW_LABELS: Record<string, string> = {
	inbox: "Входящие",
	suggested: "Предложено",
	confirmed: "Подтверждено",
	posted: "Проведено",
	rejected: "Отклонено",
};

function fmtMoney(amount: string | number, currency = "KGS") {
	const n = parseFloat(String(amount));
	const formatted = new Intl.NumberFormat("ru-KG").format(Number.isFinite(n) ? n : 0);
	return currency === "KGS" ? `${formatted} сом` : `${formatted} ${currency}`;
}

function parseCsvLines(text: string) {
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(";").map((p) => p.trim());
			const [operationDate, amount, counterpartyName, ...rest] = parts;
			return {
				operationDate,
				amount,
				counterpartyName: counterpartyName || undefined,
				description: rest.join("; ") || undefined,
			};
		})
		.filter((l) => l.operationDate && l.amount);
}

function ImportDialog({
	open,
	onClose,
	onImported,
}: {
	open: boolean;
	onClose: () => void;
	onImported: () => void;
}) {
	const [source, setSource] = useState<"one_c" | "bank" | "manual">("one_c");
	const [csvText, setCsvText] = useState(
		"2026-05-01;150000;ОсОО СтройКом;Оплата по договору\n2026-05-02;-45000;Банк РСК;Комиссия",
	);

	const importMut = useMutation({
		mutationFn: () => {
			const lines = parseCsvLines(csvText);
			if (!lines.length) {
				throw new Error(
					"Не нашли ни одной строки. Проверьте формат: дата;сумма;контрагент;описание — по одной операции на строку.",
				);
			}
			return api
				.post("/finance-reconciliation/import", { source, lines })
				.then((r) => r.data);
		},
		onSuccess: (data) => {
			toast.success(`Импортировано ${data.imported} строк`);
			onImported();
			onClose();
		},
		onError: (err) =>
			toast.error(getApiErrorMessage(err, "Ошибка импорта")),
	});

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Импорт строк</DialogTitle>
					<DialogDescription>
						Формат CSV: дата;сумма;контрагент;описание (по строке)
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Источник</Label>
						<Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="one_c">1С</SelectItem>
								<SelectItem value="bank">Банк</SelectItem>
								<SelectItem value="manual">Вручную</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Данные</Label>
						<Textarea
							className="mt-1 font-mono text-xs min-h-[140px]"
							value={csvText}
							onChange={(e) => setCsvText(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Отмена
					</Button>
					<Button
						onClick={() => importMut.mutate()}
						disabled={importMut.isPending}
					>
						{importMut.isPending ? "Импорт..." : "Импортировать"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ConfirmDialog({
	line,
	projects,
	onClose,
	onDone,
}: {
	line: ReconLine | null;
	projects: { id: number; name: string }[];
	onClose: () => void;
	onDone: () => void;
}) {
	const [projectId, setProjectId] = useState("");
	const [category, setCategory] = useState("");

	const confirmMut = useMutation({
		mutationFn: () =>
			api.patch(`/finance-reconciliation/${line!.id}`, {
				reviewStatus: "confirmed",
				confirmedProjectId: projectId || null,
				confirmedCategory: category || line?.suggestedCategory || null,
			}),
		onSuccess: () => {
			toast.success("Строка подтверждена");
			onDone();
			onClose();
		},
		onError: (err) =>
			toast.error(getApiErrorMessage(err, "Не удалось подтвердить")),
	});

	const postMut = useMutation({
		mutationFn: () =>
			api.post(`/finance-reconciliation/${line!.id}/post`).then((r) => r.data),
		onSuccess: () => {
			toast.success("Операция проведена");
			onDone();
			onClose();
		},
		onError: (err) =>
			toast.error(getApiErrorMessage(err, "Не удалось провести")),
	});

	const rejectMut = useMutation({
		mutationFn: () =>
			api.patch(`/finance-reconciliation/${line!.id}`, {
				reviewStatus: "rejected",
			}),
		onSuccess: () => {
			toast.success("Строка отклонена");
			onDone();
			onClose();
		},
		onError: (err) =>
			toast.error(getApiErrorMessage(err, "Не удалось отклонить")),
	});

	if (!line) return null;

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Подтверждение строки</DialogTitle>
					<DialogDescription>
						{line.counterpartyName || "—"} · {fmtMoney(line.amount, line.currency)}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">{line.description || "—"}</p>
					{line.suggestionReason && (
						<p className="text-xs bg-amber-50 text-amber-800 rounded px-2 py-1">
							{line.suggestionReason}
						</p>
					)}
					<div>
						<Label>Проект</Label>
						<Select
							value={projectId || String(line.suggestedProjectId || "")}
							onValueChange={setProjectId}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите проект" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Категория</Label>
						<Input
							className="mt-1"
							value={category || line.suggestedCategory || ""}
							onChange={(e) => setCategory(e.target.value)}
							placeholder="Строительство, материалы..."
						/>
					</div>
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
						Отклонить
					</Button>
					<Button variant="secondary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
						Подтвердить
					</Button>
					<Button onClick={() => postMut.mutate()} disabled={postMut.isPending}>
						Провести
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function InboxTable({
	lines,
	onConfirm,
	onImport,
	isFiltered,
}: {
	lines: ReconLine[];
	onConfirm: (line: ReconLine) => void;
	onImport: () => void;
	isFiltered?: boolean;
}) {
	if (!lines.length) {
		if (isFiltered) {
			return (
				<p className="text-sm text-muted-foreground py-8 text-center">
					По этому запросу ничего не найдено. Попробуйте другое имя контрагента или
					описание.
				</p>
			);
		}
		return (
			<div className="py-10 px-4 text-center space-y-3 max-w-md mx-auto">
				<p className="text-sm font-medium text-foreground">
					Во входящих пока нет операций
				</p>
				<p className="text-sm text-muted-foreground">
					После импорта из 1С, банка или ручного ввода строки появятся здесь для
					подтверждения и проведения.
				</p>
				<Button variant="outline" size="sm" className="gap-2" onClick={onImport}>
					<FileUp className="w-4 h-4" />
					Импортировать строки
				</Button>
			</div>
		);
	}

	return <InboxDataTable lines={lines} onConfirm={onConfirm} />;
}

function InboxDataTable({
	lines,
	onConfirm,
}: {
	lines: ReconLine[];
	onConfirm: (line: ReconLine) => void;
}) {
	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				accessorKey: "operationDate",
				header: "Дата",
				size: 120,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => <span>{row.original.operationDate}</span>,
			},
			{
				id: "source",
				header: "Источник",
				size: 110,
				accessorFn: (row: any) => SOURCE_LABELS[row.source] || row.source,
				meta: { exportLabel: "Источник" },
				cell: ({ getValue }) => <span>{getValue() as string}</span>,
			},
			{
				id: "counterparty",
				header: "Контрагент",
				size: 200,
				accessorFn: (row: any) => row.counterpartyName || "—",
				meta: { exportLabel: "Контрагент" },
				cell: ({ getValue }) => <span>{getValue() as string}</span>,
			},
			{
				accessorKey: "description",
				header: "Описание",
				size: 220,
				meta: { exportLabel: "Описание" },
				cell: ({ row }) => (
					<span className="truncate block max-w-[220px]">
						{row.original.description || "—"}
					</span>
				),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 140,
				accessorFn: (row: any) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-medium font-mono">
						{fmtMoney(row.original.amount, row.original.currency)}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorFn: (row: any) =>
					REVIEW_LABELS[row.reviewStatus] || row.reviewStatus,
				meta: { exportLabel: "Статус" },
				cell: ({ getValue }) => (
					<Badge variant="outline">{getValue() as string}</Badge>
				),
			},
			{
				id: "__actions",
				header: "",
				size: 110,
				enableSorting: false,
				cell: ({ row }) => (
					<Button
						size="sm"
						variant="outline"
						onClick={() => onConfirm(row.original)}
					>
						Обработать
					</Button>
				),
			},
		],
		[onConfirm],
	);

	return (
		<DataTable
			tableId="construction-reconciliation-inbox"
			columns={columns}
			data={lines}
			initialSorting={[{ id: "operationDate", desc: true }]}
		/>
	);
}

function HistoryTable({ lines }: { lines: ReconLine[] }) {
	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				accessorKey: "operationDate",
				header: "Дата",
				size: 120,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => <span>{row.original.operationDate}</span>,
			},
			{
				id: "counterparty",
				header: "Контрагент",
				size: 200,
				accessorFn: (row: any) => row.counterpartyName || "—",
				meta: { exportLabel: "Контрагент" },
				cell: ({ getValue }) => <span>{getValue() as string}</span>,
			},
			{
				id: "amount",
				header: "Сумма",
				size: 140,
				accessorFn: (row: any) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">
						{fmtMoney(row.original.amount, row.original.currency)}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 140,
				accessorFn: (row: any) =>
					REVIEW_LABELS[row.reviewStatus] || row.reviewStatus,
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					const line = row.original;
					if (line.reviewStatus === "posted") {
						return (
							<Badge className="gap-1">
								<CheckCircle2 className="w-3 h-3" />
								Проведено
							</Badge>
						);
					}
					if (line.reviewStatus === "rejected") {
						return (
							<Badge variant="destructive" className="gap-1">
								<XCircle className="w-3 h-3" />
								Отклонено
							</Badge>
						);
					}
					return (
						<Badge variant="outline">{REVIEW_LABELS[line.reviewStatus]}</Badge>
					);
				},
			},
			{
				id: "operation",
				header: "Операция",
				size: 120,
				accessorFn: (row: any) =>
					row.constructionOperationId
						? `#${row.constructionOperationId}`
						: "—",
				meta: { exportLabel: "Операция" },
				cell: ({ getValue }) => <span>{getValue() as string}</span>,
			},
		],
		[],
	);

	return (
		<DataTable
			tableId="construction-reconciliation-history"
			columns={columns}
			data={lines}
			initialSorting={[{ id: "operationDate", desc: true }]}
		/>
	);
}

function MatchingView({
	groups,
	onImport,
}: {
	groups: MatchingGroup[];
	onImport: () => void;
}) {
	if (!groups.length) {
		return (
			<div className="py-10 px-4 text-center space-y-3 max-w-md mx-auto">
				<p className="text-sm font-medium text-foreground">
					Сверка начнётся после импорта
				</p>
				<p className="text-sm text-muted-foreground">
					Загрузите выписки из 1С и банка — система сопоставит суммы и даты и
					покажет расхождения.
				</p>
				<Button variant="outline" size="sm" className="gap-2" onClick={onImport}>
					<FileUp className="w-4 h-4" />
					Импортировать из 1С и банка
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{groups.map((g, idx) => (
				<div
					key={g.pairGroupId || idx}
					className="border rounded-lg p-3 grid md:grid-cols-[1fr_auto_1fr] gap-3 items-start"
				>
					<div>
						<p className="text-xs font-semibold text-gray-500 mb-2">1С</p>
						{g.oneCLines.length ? (
							g.oneCLines.map((l) => (
								<div key={l.id} className="text-sm">
									<p>{l.counterpartyName || "—"}</p>
									<p className="text-muted-foreground text-xs">{l.description}</p>
								</div>
							))
						) : (
							<p className="text-sm text-rose-600">Нет строки 1С</p>
						)}
					</div>
					<div className="text-center px-2">
						<p className="text-xs text-gray-500">{g.operationDate}</p>
						<p className="font-semibold">{fmtMoney(g.amount)}</p>
						<Badge
							variant={
								g.matchStatus === "matched"
									? "default"
									: g.matchStatus === "conflict"
										? "destructive"
										: "outline"
							}
						>
							{g.matchStatus === "matched"
								? "Совпало"
								: g.matchStatus === "conflict"
									? "Конфликт"
									: "Не сопоставлено"}
						</Badge>
					</div>
					<div>
						<p className="text-xs font-semibold text-gray-500 mb-2">Банк</p>
						{g.bankLines.length ? (
							g.bankLines.map((l) => (
								<div key={l.id} className="text-sm">
									<p>{l.counterpartyName || "—"}</p>
									<p className="text-muted-foreground text-xs">{l.description}</p>
								</div>
							))
						) : (
							<p className="text-sm text-rose-600">Нет строки банка</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

export default function ConstructionReconciliation() {
	const qc = useQueryClient();
	const [tab, setTab] = useState("inbox");
	const [importOpen, setImportOpen] = useState(false);
	const [confirmLine, setConfirmLine] = useState<ReconLine | null>(null);
	const [sourceFilter, setSourceFilter] = useState("all");
	const [search, setSearch] = useState("");

	const { data: inbox = [], isLoading: inboxLoading } = useQuery({
		queryKey: ["finance-recon-inbox", sourceFilter],
		queryFn: () =>
			api
				.get("/finance-reconciliation/inbox", {
					params: { source: sourceFilter },
				})
				.then((r) => r.data as ReconLine[]),
		enabled: tab === "inbox",
	});

	const { data: matching, isLoading: matchingLoading } = useQuery({
		queryKey: ["finance-recon-matching"],
		queryFn: () =>
			api.get("/finance-reconciliation/matching").then((r) => r.data as {
				groups: MatchingGroup[];
			}),
		enabled: tab === "matching",
	});

	const { data: history = [], isLoading: historyLoading } = useQuery({
		queryKey: ["finance-recon-history"],
		queryFn: () =>
			api.get("/finance-reconciliation/history").then((r) => r.data as ReconLine[]),
		enabled: tab === "history",
	});

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const refresh = () => {
		qc.invalidateQueries({ queryKey: ["finance-recon-inbox"] });
		qc.invalidateQueries({ queryKey: ["finance-recon-matching"] });
		qc.invalidateQueries({ queryKey: ["finance-recon-history"] });
	};

	const filteredInbox = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return inbox;
		return inbox.filter(
			(l) =>
				l.counterpartyName?.toLowerCase().includes(q) ||
				l.description?.toLowerCase().includes(q),
		);
	}, [inbox, search]);

	const matchingGroups = useMemo(() => {
		const groups = matching?.groups ?? [];
		return groups.filter(
			(g) => g.matchStatus !== "matched" || g.oneCLines.length !== g.bankLines.length,
		);
	}, [matching]);

	return (
		<div className="p-6 space-y-4 max-w-6xl mx-auto">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Scale className="w-6 h-6 text-orange-500" />
						Сверка 1С
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Импорт строк, сопоставление 1С ↔ банк, подтверждение и проведение
					</p>
				</div>
				<Button onClick={() => setImportOpen(true)} className="gap-2">
					<FileUp className="w-4 h-4" />
					Импорт
				</Button>
			</div>

			<Tabs value={tab} onValueChange={setTab}>
				<TabsList>
					<TabsTrigger value="inbox">Входящие</TabsTrigger>
					<TabsTrigger value="matching">Сверка 1С ↔ Банк</TabsTrigger>
					<TabsTrigger value="history">История</TabsTrigger>
				</TabsList>

				<TabsContent value="inbox" className="space-y-3 mt-4">
					<div className="flex flex-wrap gap-2">
						<div className="relative flex-1 min-w-[200px]">
							<Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
							<Input
								className="pl-8"
								placeholder="Поиск по контрагенту или описанию"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<Select value={sourceFilter} onValueChange={setSourceFilter}>
							<SelectTrigger className="w-[140px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все источники</SelectItem>
								<SelectItem value="one_c">1С</SelectItem>
								<SelectItem value="bank">Банк</SelectItem>
								<SelectItem value="manual">Вручную</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{inboxLoading ? (
						<p className="text-sm text-muted-foreground">Загрузка...</p>
					) : (
						<InboxTable
							lines={filteredInbox}
							onConfirm={setConfirmLine}
							onImport={() => setImportOpen(true)}
							isFiltered={Boolean(search.trim()) && inbox.length > 0}
						/>
					)}
				</TabsContent>

				<TabsContent value="matching" className="mt-4">
					{matchingLoading ? (
						<p className="text-sm text-muted-foreground">Загрузка...</p>
					) : (
						<MatchingView
							groups={matchingGroups.length ? matchingGroups : matching?.groups ?? []}
							onImport={() => setImportOpen(true)}
						/>
					)}
				</TabsContent>

				<TabsContent value="history" className="mt-4">
					{historyLoading ? (
						<p className="text-sm text-muted-foreground">Загрузка...</p>
					) : !history.length ? (
						<div className="py-10 px-4 text-center space-y-2 max-w-md mx-auto">
							<p className="text-sm font-medium text-foreground">
								Подтверждённые операции появятся здесь
							</p>
							<p className="text-sm text-muted-foreground">
								После подтверждения или отклонения строк во вкладке «Входящие»
								запись сохранится в истории со статусом и номером операции.
							</p>
						</div>
					) : (
						<HistoryTable lines={history} />
					)}
				</TabsContent>
			</Tabs>

			<ImportDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
				onImported={refresh}
			/>
			<ConfirmDialog
				line={confirmLine}
				projects={projects}
				onClose={() => setConfirmLine(null)}
				onDone={refresh}
			/>
		</div>
	);
}
