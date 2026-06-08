import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Banknote,
	Building2,
	Check,
	Lock,
	Plus,
	TrendingUp,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

type Access = {
	canAccess: boolean;
	isManager: boolean;
	isFinance: boolean;
	allowedUserIds: number[];
};

type Employee = {
	id: number;
	companyId: number;
	legalEntityId: number | null;
	legalEntityName?: string | null;
	userId: number | null;
	fullName: string;
	position: string | null;
	department: string | null;
	employmentType: string | null;
	hireDate: string | null;
	baseSalary: string | null;
	currentSalary: string | null;
	currency: string | null;
	status: string | null;
	notes: string | null;
};

type SalaryChange = {
	id: number;
	payrollEmployeeId: number;
	effectiveDate: string | null;
	previousAmount: string | null;
	newAmount: string | null;
	delta: string | null;
	reason: string | null;
	createdAt: string | null;
	employeeName?: string | null;
	department?: string | null;
	legalEntityName?: string | null;
};

type ApprovalRequest = {
	id: number;
	payrollEmployeeId: number;
	requestType: string;
	requestedAmount: string | null;
	currentAmount: string | null;
	reason: string | null;
	status: string;
	requestedBy: number | null;
	directorComment: string | null;
	reviewedBy: number | null;
	reviewedAt: string | null;
	effectiveDate: string | null;
};

type CompanyUser = {
	id: number;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	role?: string | null;
};

type LegalEntity = {
	id: number;
	name: string;
	fullLegalName?: string | null;
	inn?: string | null;
	isActive?: boolean | null;
};

const EMPLOYMENT_LABELS: Record<string, string> = {
	staff: "Штат",
	parttime: "Совместитель",
	contract: "Подряд",
};

const STATUS_LABELS: Record<string, string> = {
	active: "Работает",
	dismissed: "Уволен",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
	pending: "На рассмотрении",
	approved: "Одобрено",
	rejected: "Отклонено",
};

function fmtMoney(amount: string | number | null | undefined, currency = "KGS") {
	const n = parseFloat(String(amount ?? "0"));
	const formatted = new Intl.NumberFormat("ru-KG").format(Number.isFinite(n) ? n : 0);
	return currency === "KGS" ? `${formatted} сом` : `${formatted} ${currency}`;
}

function growthPercent(base: string | null, current: string | null): number | null {
	const b = parseFloat(String(base ?? "0"));
	const c = parseFloat(String(current ?? "0"));
	if (!Number.isFinite(b) || b <= 0 || !Number.isFinite(c)) return null;
	return ((c - b) / b) * 100;
}

function userLabel(u: CompanyUser): string {
	const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
	return name || u.email || `#${u.id}`;
}

function AddEmployeeDialog({
	open,
	legalEntities,
	onClose,
	onDone,
}: {
	open: boolean;
	legalEntities: LegalEntity[];
	onClose: () => void;
	onDone: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		fullName: "",
		position: "",
		department: "",
		legalEntityId: "none",
		employmentType: "staff",
		hireDate: "",
		baseSalary: "",
		currency: "KGS",
	});

	const set = (key: keyof typeof form, value: string) =>
		setForm((f) => ({ ...f, [key]: value }));

	const mut = useMutation({
		mutationFn: () =>
			api.post("/construction/payroll/employees", {
				fullName: form.fullName,
				legalEntityId:
					form.legalEntityId && form.legalEntityId !== "none"
						? Number(form.legalEntityId)
						: undefined,
				position: form.position || undefined,
				department: form.department || undefined,
				employmentType: form.employmentType,
				hireDate: form.hireDate || undefined,
				baseSalary: form.baseSalary || "0",
				currency: form.currency,
			}),
		onSuccess: () => {
			toast({ title: "Сотрудник добавлен" });
			setForm({
				fullName: "",
				position: "",
				department: "",
				legalEntityId: "none",
				employmentType: "staff",
				hireDate: "",
				baseSalary: "",
				currency: "KGS",
			});
			onDone();
			onClose();
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось добавить сотрудника"),
				variant: "destructive",
			}),
	});

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Новый сотрудник</DialogTitle>
					<DialogDescription>
						Первоначальная ЗП фиксируется как текущая. Дальнейшие изменения — через
						запросы на одобрение.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="flex flex-col sm:col-span-2">
						<Label className="leading-tight mb-1.5">ФИО *</Label>
						<Input
							className="mt-auto"
							value={form.fullName}
							onChange={(e) => set("fullName", e.target.value)}
						/>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Должность</Label>
						<Input
							className="mt-auto"
							value={form.position}
							onChange={(e) => set("position", e.target.value)}
						/>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Отдел / штатная группа</Label>
						<Input
							className="mt-auto"
							value={form.department}
							onChange={(e) => set("department", e.target.value)}
						/>
					</div>
					<div className="flex flex-col sm:col-span-2">
						<Label className="leading-tight mb-1.5">ОсОО</Label>
						<Select
							value={form.legalEntityId}
							onValueChange={(v) => set("legalEntityId", v)}
						>
							<SelectTrigger className="mt-auto">
								<SelectValue placeholder="Выберите ОсОО" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Не распределён</SelectItem>
								{legalEntities.map((entity) => (
									<SelectItem key={entity.id} value={String(entity.id)}>
										{entity.name}
										{entity.inn ? ` · ИНН ${entity.inn}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Тип занятости</Label>
						<Select
							value={form.employmentType}
							onValueChange={(v) => set("employmentType", v)}
						>
							<SelectTrigger className="mt-auto">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="staff">Штат</SelectItem>
								<SelectItem value="parttime">Совместитель</SelectItem>
								<SelectItem value="contract">Подряд</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Дата приёма</Label>
						<Input
							type="date"
							className="mt-auto"
							value={form.hireDate}
							onChange={(e) => set("hireDate", e.target.value)}
						/>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Первоначальная ЗП</Label>
						<Input
							type="number"
							className="mt-auto"
							value={form.baseSalary}
							onChange={(e) => set("baseSalary", e.target.value)}
						/>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Валюта</Label>
						<Select value={form.currency} onValueChange={(v) => set("currency", v)}>
							<SelectTrigger className="mt-auto">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="KGS">сом (KGS)</SelectItem>
								<SelectItem value="USD">USD</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Отмена
					</Button>
					<Button
						onClick={() => mut.mutate()}
						disabled={mut.isPending || !form.fullName.trim()}
					>
						{mut.isPending ? "Сохранение..." : "Добавить"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RequestDialog({
	open,
	employees,
	onClose,
	onDone,
}: {
	open: boolean;
	employees: Employee[];
	onClose: () => void;
	onDone: () => void;
}) {
	const { toast } = useToast();
	const [employeeId, setEmployeeId] = useState("");
	const [requestedAmount, setRequestedAmount] = useState("");
	const [effectiveDate, setEffectiveDate] = useState("");
	const [reason, setReason] = useState("");

	const selected = employees.find((e) => String(e.id) === employeeId);

	const mut = useMutation({
		mutationFn: () =>
			api.post("/construction/payroll/requests", {
				payrollEmployeeId: Number(employeeId),
				requestedAmount: requestedAmount || "0",
				effectiveDate: effectiveDate || undefined,
				reason: reason || undefined,
			}),
		onSuccess: () => {
			toast({ title: "Запрос отправлен на одобрение" });
			setEmployeeId("");
			setRequestedAmount("");
			setEffectiveDate("");
			setReason("");
			onDone();
			onClose();
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось создать запрос"),
				variant: "destructive",
			}),
	});

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Запрос на изменение ЗП</DialogTitle>
					<DialogDescription>
						Запрос уйдёт руководителю на одобрение.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Сотрудник *</Label>
						<Select value={employeeId} onValueChange={setEmployeeId}>
							<SelectTrigger className="mt-auto">
								<SelectValue placeholder="Выберите сотрудника" />
							</SelectTrigger>
							<SelectContent>
								{employees.map((e) => (
									<SelectItem key={e.id} value={String(e.id)}>
										{e.fullName}
										{e.legalEntityName ? ` · ${e.legalEntityName}` : ""}
										{e.position ? ` · ${e.position}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{selected && (
						<p className="text-sm text-muted-foreground">
							Текущая ЗП: {fmtMoney(selected.currentSalary, selected.currency ?? "KGS")}
						</p>
					)}
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Новая ЗП *</Label>
							<Input
								type="number"
								className="mt-auto"
								value={requestedAmount}
								onChange={(e) => setRequestedAmount(e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Дата вступления</Label>
							<Input
								type="date"
								className="mt-auto"
								value={effectiveDate}
								onChange={(e) => setEffectiveDate(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-col">
						<Label className="leading-tight mb-1.5">Обоснование</Label>
						<Textarea
							className="mt-auto"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Повышение по результатам работы, индексация..."
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Отмена
					</Button>
					<Button
						onClick={() => mut.mutate()}
						disabled={mut.isPending || !employeeId || !requestedAmount}
					>
						{mut.isPending ? "Отправка..." : "Отправить"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function HistoryDialog({
	employee,
	onClose,
}: {
	employee: Employee | null;
	onClose: () => void;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["payroll-employee-history", employee?.id],
		queryFn: () =>
			api
				.get(`/construction/payroll/employees/${employee!.id}/history`)
				.then((r) => r.data as { employee: Employee; changes: SalaryChange[] }),
		enabled: !!employee,
	});

	if (!employee) return null;

	const changes = data?.changes ?? [];

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{employee.fullName}</DialogTitle>
					<DialogDescription>
						{employee.position || "—"} · {employee.legalEntityName || "Без ОсОО"} · приём:{" "}
						{employee.hireDate || "—"} · первоначальная ЗП:{" "}
						{fmtMoney(employee.baseSalary, employee.currency ?? "KGS")}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<div className="flex items-center justify-between rounded-md border p-2.5">
						<span className="text-sm text-muted-foreground">Текущая ЗП</span>
						<span className="font-semibold">
							{fmtMoney(employee.currentSalary, employee.currency ?? "KGS")}
						</span>
					</div>
					{isLoading ? (
						<Skeleton className="h-24 w-full" />
					) : changes.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							Изменений зарплаты пока не было.
						</p>
					) : (
						<div className="space-y-2">
							{changes.map((c) => {
								const delta = parseFloat(String(c.delta ?? "0"));
								return (
									<div key={c.id} className="rounded-md border p-2.5 text-sm">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<span className="text-muted-foreground">
												{c.effectiveDate || "—"}
											</span>
											<Badge variant={delta >= 0 ? "default" : "destructive"}>
												{delta >= 0 ? "+" : ""}
												{fmtMoney(c.delta, employee.currency ?? "KGS")}
											</Badge>
										</div>
										<div className="mt-1">
											{fmtMoney(c.previousAmount, employee.currency ?? "KGS")} →{" "}
											<span className="font-medium">
												{fmtMoney(c.newAmount, employee.currency ?? "KGS")}
											</span>
										</div>
										{c.reason && (
											<p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Закрыть
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function LedgerTab({
	employees,
	isLoading,
	canEdit,
	onAdd,
	onRowClick,
}: {
	employees: Employee[];
	isLoading: boolean;
	canEdit: boolean;
	onAdd: () => void;
	onRowClick: (e: Employee) => void;
}) {
	const columns = useMemo<ColumnDef<Employee, unknown>[]>(
		() => [
			{
				id: "legalEntity",
				header: "ОсОО",
				size: 160,
				accessorFn: (row) => row.legalEntityName?.trim() || "Не распределён",
				meta: { exportLabel: "ОсОО" },
				cell: ({ row }) =>
					row.original.legalEntityName ? (
						<Badge variant="outline" className="font-normal">
							{row.original.legalEntityName}
						</Badge>
					) : (
						<span className="text-muted-foreground">Не распределён</span>
					),
			},
			{
				id: "department",
				header: "Отдел",
				size: 140,
				accessorFn: (row) => row.department?.trim() || "Без отдела",
				meta: { exportLabel: "Отдел" },
			},
			{
				accessorKey: "fullName",
				header: "ФИО",
				size: 200,
				meta: { exportLabel: "ФИО", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">
						{row.original.fullName}
						{row.original.status === "dismissed" && (
							<Badge variant="outline" className="ml-2">
								{STATUS_LABELS.dismissed}
							</Badge>
						)}
					</span>
				),
			},
			{
				accessorKey: "position",
				header: "Должность",
				size: 140,
				meta: { exportLabel: "Должность" },
				cell: ({ row }) => row.original.position || "—",
			},
			{
				id: "employmentType",
				header: "Занятость",
				size: 120,
				accessorFn: (row) =>
					EMPLOYMENT_LABELS[row.employmentType ?? "staff"] ??
					row.employmentType,
				meta: { exportLabel: "Занятость" },
			},
			{
				accessorKey: "hireDate",
				header: "Приём",
				size: 110,
				meta: { exportLabel: "Приём" },
				cell: ({ row }) => row.original.hireDate || "—",
			},
			{
				id: "baseSalary",
				header: "Первоначальная ЗП",
				size: 140,
				accessorFn: (row) => parseFloat(String(row.baseSalary ?? "0")),
				meta: { exportLabel: "Первоначальная ЗП", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">
						{fmtMoney(row.original.baseSalary, row.original.currency ?? "KGS")}
					</span>
				),
			},
			{
				id: "currentSalary",
				header: "Текущая ЗП",
				size: 130,
				accessorFn: (row) => parseFloat(String(row.currentSalary ?? "0")),
				meta: { exportLabel: "Текущая ЗП", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{fmtMoney(row.original.currentSalary, row.original.currency ?? "KGS")}
					</span>
				),
			},
			{
				id: "growth",
				header: "Рост",
				size: 90,
				accessorFn: (row) =>
					growthPercent(row.baseSalary, row.currentSalary) ?? -999,
				meta: { exportLabel: "Рост (%)", align: "right" },
				cell: ({ row }) => {
					const growth = growthPercent(
						row.original.baseSalary,
						row.original.currentSalary,
					);
					if (growth === null) return "—";
					return (
						<span
							className={
								growth > 0
									? "text-emerald-600"
									: growth < 0
										? "text-rose-600"
										: "text-muted-foreground"
							}
						>
							{growth > 0 ? "+" : ""}
							{growth.toFixed(1)}%
						</span>
					);
				},
			},
		],
		[],
	);

	if (isLoading) return <Skeleton className="h-40 w-full" />;

	if (employees.length === 0) {
		return (
			<div className="mx-auto max-w-md space-y-3 px-4 py-10 text-center">
				<p className="text-sm font-medium text-foreground">
					В ведомости пока нет сотрудников
				</p>
				<p className="text-sm text-muted-foreground">
					Добавьте сотрудников, чтобы вести учёт зарплат и согласовывать изменения.
				</p>
				{canEdit && (
					<Button variant="outline" size="sm" className="gap-2" onClick={onAdd}>
						<Plus className="h-4 w-4" />
						Добавить сотрудника
					</Button>
				)}
			</div>
		);
	}

	return (
		<DataTable
			tableId="construction-payroll-ledger"
			columns={columns}
			data={employees}
			enableSearch
			searchPlaceholder="Поиск по ФИО, должности, отделу…"
			initialSorting={[
				{ id: "department", desc: false },
				{ id: "fullName", desc: false },
			]}
			onRowClick={onRowClick}
			rowClassName={() => "cursor-pointer"}
		/>
	);
}

function StaffByLegalEntityTab({
	employees,
	legalEntities,
	isLoading,
	canEdit,
	onRefresh,
	onAdd,
}: {
	employees: Employee[];
	legalEntities: LegalEntity[];
	isLoading: boolean;
	canEdit: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}) {
	const { toast } = useToast();

	const assignMut = useMutation({
		mutationFn: ({
			employeeId,
			legalEntityId,
		}: {
			employeeId: number;
			legalEntityId: number | null;
		}) =>
			api.patch(`/construction/payroll/employees/${employeeId}`, {
				legalEntityId,
			}),
		onSuccess: () => {
			toast({ title: "ОсОО сотрудника обновлено" });
			onRefresh();
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось распределить сотрудника"),
				variant: "destructive",
			}),
	});

	const totalPayroll = (items: Employee[]) =>
		items.reduce((sum, employee) => {
			const amount = parseFloat(String(employee.currentSalary ?? "0"));
			return sum + (Number.isFinite(amount) ? amount : 0);
		}, 0);

	const groups = useMemo(() => {
		const activeEntities = legalEntities.filter((entity) => entity.isActive !== false);
		const base = activeEntities.map((entity) => ({
			id: entity.id,
			name: entity.name,
			inn: entity.inn ?? null,
			employees: employees.filter((employee) => employee.legalEntityId === entity.id),
		}));
		const unassigned = employees.filter((employee) => employee.legalEntityId == null);
		return [
			...base,
			{
				id: null,
				name: "Не распределён",
				inn: null,
				employees: unassigned,
			},
		];
	}, [employees, legalEntities]);

	if (isLoading) return <Skeleton className="h-64 w-full" />;

	if (employees.length === 0) {
		return (
			<div className="mx-auto max-w-md space-y-3 px-4 py-10 text-center">
				<Building2 className="mx-auto h-9 w-9 text-muted-foreground" />
				<p className="text-sm font-medium text-foreground">Штат пока не создан</p>
				<p className="text-sm text-muted-foreground">
					Создайте сотрудников и распределите их по ОсОО для управленческого и
					юридического учета зарплаты.
				</p>
				{canEdit && (
					<Button variant="outline" size="sm" className="gap-2" onClick={onAdd}>
						<Plus className="h-4 w-4" />
						Добавить сотрудника
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Штат</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{employees.length}</div>
						<p className="text-sm text-muted-foreground">сотрудников в ведомости</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">ФОТ / месяц</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{fmtMoney(totalPayroll(employees))}
						</div>
						<p className="text-sm text-muted-foreground">по текущим окладам</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Без ОсОО</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{employees.filter((employee) => employee.legalEntityId == null).length}
						</div>
						<p className="text-sm text-muted-foreground">нужно распределить</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				{groups.map((group) => {
					const payroll = totalPayroll(group.employees);
					return (
						<Card key={group.id ?? "unassigned"} className="overflow-hidden">
							<CardHeader className="border-b bg-muted/30">
								<div className="flex items-start justify-between gap-3">
									<div>
										<CardTitle className="flex items-center gap-2 text-base">
											<Building2 className="h-4 w-4 text-cyan-600" />
											{group.name}
										</CardTitle>
										<p className="mt-1 text-xs text-muted-foreground">
											{group.inn ? `ИНН ${group.inn}` : "Юрлицо не выбрано"}
										</p>
									</div>
									<div className="text-right">
										<div className="text-lg font-semibold">
											{fmtMoney(payroll)}
										</div>
										<p className="text-xs text-muted-foreground">
											{group.employees.length} чел.
										</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{group.employees.length === 0 ? (
									<p className="px-4 py-6 text-center text-sm text-muted-foreground">
										Нет сотрудников
									</p>
								) : (
									<div className="divide-y">
										{group.employees.map((employee) => (
											<div
												key={employee.id}
												className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_190px] sm:items-center"
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">
														{employee.fullName}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{employee.position || "Без должности"} ·{" "}
														{employee.department || "Без отдела"} ·{" "}
														{fmtMoney(employee.currentSalary, employee.currency ?? "KGS")}
													</p>
												</div>
												<Select
													value={
														employee.legalEntityId == null
															? "none"
															: String(employee.legalEntityId)
													}
													onValueChange={(value) =>
														assignMut.mutate({
															employeeId: employee.id,
															legalEntityId:
																value === "none" ? null : Number(value),
														})
													}
													disabled={!canEdit || assignMut.isPending}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">Не распределён</SelectItem>
														{legalEntities.map((entity) => (
															<SelectItem key={entity.id} value={String(entity.id)}>
																{entity.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

function RequestsTab({
	requests,
	employees,
	isLoading,
	access,
	onCreate,
	onRefresh,
}: {
	requests: ApprovalRequest[];
	employees: Employee[];
	isLoading: boolean;
	access: Access;
	onCreate: () => void;
	onRefresh: () => void;
}) {
	const { toast } = useToast();
	const [comments, setComments] = useState<Record<number, string>>({});

	const empName = (id: number) =>
		employees.find((e) => e.id === id)?.fullName ?? `#${id}`;

	const decideMut = useMutation({
		mutationFn: ({
			id,
			action,
			comment,
		}: {
			id: number;
			action: "approve" | "reject";
			comment: string;
		}) =>
			api.post(`/construction/payroll/requests/${id}/${action}`, {
				directorComment: comment || undefined,
			}),
		onSuccess: (_d, vars) => {
			toast({
				title: vars.action === "approve" ? "Запрос одобрен" : "Запрос отклонён",
			});
			onRefresh();
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось обработать запрос"),
				variant: "destructive",
			}),
	});

	const columns = useMemo<ColumnDef<ApprovalRequest, unknown>[]>(() => {
		const base: ColumnDef<ApprovalRequest, unknown>[] = [
			{
				id: "employee",
				header: "Сотрудник",
				size: 180,
				accessorFn: (row) => empName(row.payrollEmployeeId),
				meta: { exportLabel: "Сотрудник", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">
						{empName(row.original.payrollEmployeeId)}
					</span>
				),
			},
			{
				id: "currentAmount",
				header: "Текущая",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.currentAmount ?? "0")),
				meta: { exportLabel: "Текущая", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">{fmtMoney(row.original.currentAmount)}</span>
				),
			},
			{
				id: "requestedAmount",
				header: "Запрошено",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.requestedAmount ?? "0")),
				meta: { exportLabel: "Запрошено", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{fmtMoney(row.original.requestedAmount)}
					</span>
				),
			},
			{
				accessorKey: "effectiveDate",
				header: "Дата",
				size: 110,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => row.original.effectiveDate || "—",
			},
			{
				accessorKey: "reason",
				header: "Обоснование",
				size: 200,
				meta: { exportLabel: "Обоснование" },
				cell: ({ row }) => (
					<span className="max-w-[200px] truncate block">
						{row.original.reason || "—"}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 140,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					const r = row.original;
					const isPending = r.status === "pending";
					return (
						<div>
							<Badge
								variant={
									r.status === "approved"
										? "default"
										: r.status === "rejected"
											? "destructive"
											: "outline"
								}
							>
								{REQUEST_STATUS_LABELS[r.status] ?? r.status}
							</Badge>
							{!isPending && r.directorComment && (
								<p className="mt-1 text-xs text-muted-foreground">
									{r.directorComment}
								</p>
							)}
						</div>
					);
				},
			},
		];
		if (access.isManager) {
			base.push({
				id: "__decision",
				header: "Решение",
				size: 330,
				minSize: 300,
				enableSorting: false,
				cell: ({ row }) => {
					const r = row.original;
					if (r.status !== "pending") {
						return <span className="text-xs text-muted-foreground">—</span>;
					}
					return (
						<div
							className="flex min-w-[290px] flex-col gap-2 pr-2"
							onClick={(e) => e.stopPropagation()}
						>
							<Textarea
								className="min-h-[42px] resize-none rounded-2xl text-xs"
								placeholder="Комментарий руководителя"
								value={comments[r.id] ?? ""}
								onChange={(e) =>
									setComments((c) => ({ ...c, [r.id]: e.target.value }))
								}
							/>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									className="h-9 flex-1 gap-1 rounded-full"
									disabled={decideMut.isPending}
									onClick={() =>
										decideMut.mutate({
											id: r.id,
											action: "approve",
											comment: comments[r.id] ?? "",
										})
									}
								>
									<Check className="h-3 w-3" />
									Одобрить
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="h-9 flex-1 gap-1 rounded-full"
									disabled={decideMut.isPending}
									onClick={() =>
										decideMut.mutate({
											id: r.id,
											action: "reject",
											comment: comments[r.id] ?? "",
										})
									}
								>
									<X className="h-3 w-3" />
									Отклонить
								</Button>
							</div>
						</div>
					);
				},
			});
		}
		return base;
	}, [access.isManager, comments, decideMut.isPending, employees]);

	return (
		<div className="space-y-3">
			{(access.isFinance || access.isManager) && (
				<div className="flex justify-end">
					<Button size="sm" className="gap-2" onClick={onCreate}>
						<Plus className="h-4 w-4" />
						Новый запрос
					</Button>
				</div>
			)}
			<DataTable
				tableId="construction-payroll-requests"
				columns={columns}
				data={requests}
				isLoading={isLoading}
				initialSorting={[{ id: "effectiveDate", desc: true }]}
				emptyState="Запросов на изменение зарплаты пока нет."
			/>
		</div>
	);
}

function HistoryTab() {
	const { data: changes = [], isLoading } = useQuery({
		queryKey: ["payroll-changes"],
		queryFn: () =>
			api.get("/construction/payroll/changes").then((r) => r.data as SalaryChange[]),
	});

	const columns = useMemo<ColumnDef<SalaryChange, unknown>[]>(
		() => [
			{
				accessorKey: "effectiveDate",
				header: "Дата",
				size: 110,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => row.original.effectiveDate || "—",
			},
			{
				accessorKey: "employeeName",
				header: "Сотрудник",
				size: 180,
				meta: { exportLabel: "Сотрудник", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.employeeName || "—"}</span>
				),
			},
			{
				accessorKey: "legalEntityName",
				header: "ОсОО",
				size: 150,
				meta: { exportLabel: "ОсОО" },
				cell: ({ row }) => row.original.legalEntityName || "—",
			},
			{
				accessorKey: "department",
				header: "Отдел",
				size: 140,
				meta: { exportLabel: "Отдел" },
				cell: ({ row }) => row.original.department || "—",
			},
			{
				id: "previousAmount",
				header: "Было",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.previousAmount ?? "0")),
				meta: { exportLabel: "Было", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">{fmtMoney(row.original.previousAmount)}</span>
				),
			},
			{
				id: "newAmount",
				header: "Стало",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.newAmount ?? "0")),
				meta: { exportLabel: "Стало", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{fmtMoney(row.original.newAmount)}
					</span>
				),
			},
			{
				id: "delta",
				header: "Δ",
				size: 110,
				accessorFn: (row) => parseFloat(String(row.delta ?? "0")),
				meta: { exportLabel: "Δ", align: "right" },
				cell: ({ row }) => {
					const delta = parseFloat(String(row.original.delta ?? "0"));
					return (
						<span
							className={`font-mono ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
						>
							{delta >= 0 ? "+" : ""}
							{fmtMoney(row.original.delta)}
						</span>
					);
				},
			},
			{
				accessorKey: "reason",
				header: "Обоснование",
				size: 200,
				meta: { exportLabel: "Обоснование" },
				cell: ({ row }) => (
					<span className="max-w-[200px] truncate block">
						{row.original.reason || "—"}
					</span>
				),
			},
		],
		[],
	);

	return (
		<DataTable
			tableId="construction-payroll-history"
			columns={columns}
			data={changes}
			isLoading={isLoading}
			initialSorting={[{ id: "effectiveDate", desc: true }]}
			emptyState="История изменений зарплат пуста."
		/>
	);
}

function AccessSettingsTab() {
	const qc = useQueryClient();
	const { toast } = useToast();

	const { data: users = [], isLoading: usersLoading } = useQuery({
		queryKey: ["payroll-company-users"],
		queryFn: () => api.get("/users").then((r) => r.data as CompanyUser[]),
	});

	const { data: settings, isLoading: settingsLoading } = useQuery({
		queryKey: ["payroll-access-settings"],
		queryFn: () =>
			api
				.get("/construction/payroll/settings/access")
				.then((r) => r.data as { allowedUserIds: number[] }),
	});

	const [selected, setSelected] = useState<number[] | null>(null);
	const current = selected ?? settings?.allowedUserIds ?? [];

	const toggle = (id: number) => {
		const base = selected ?? settings?.allowedUserIds ?? [];
		setSelected(
			base.includes(id) ? base.filter((x) => x !== id) : [...base, id],
		);
	};

	const saveMut = useMutation({
		mutationFn: () =>
			api.put("/construction/payroll/settings/access", { allowedUserIds: current }),
		onSuccess: () => {
			toast({ title: "Доступ обновлён" });
			qc.invalidateQueries({ queryKey: ["payroll-access-settings"] });
			qc.invalidateQueries({ queryKey: ["payroll-access"] });
			setSelected(null);
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось сохранить"),
				variant: "destructive",
			}),
	});

	if (usersLoading || settingsLoading) return <Skeleton className="h-40 w-full" />;

	return (
		<div className="max-w-xl space-y-4">
			<div>
				<h3 className="text-sm font-semibold">Кто видит зарплатную ведомость</h3>
				<p className="text-sm text-muted-foreground">
					Руководители и финансисты имеют доступ всегда. Здесь можно дополнительно
					открыть доступ отдельным сотрудникам.
				</p>
			</div>
			<div className="space-y-1.5">
				{users.map((u) => (
					<label
						key={u.id}
						className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5"
					>
						<Checkbox
							checked={current.includes(u.id)}
							onCheckedChange={() => toggle(u.id)}
						/>
						<div className="flex-1">
							<p className="text-sm font-medium">{userLabel(u)}</p>
							<p className="text-xs text-muted-foreground">
								{u.email} · {u.role}
							</p>
						</div>
					</label>
				))}
			</div>
			<Button
				onClick={() => saveMut.mutate()}
				disabled={saveMut.isPending || selected === null}
			>
				{saveMut.isPending ? "Сохранение..." : "Сохранить доступ"}
			</Button>
		</div>
	);
}

export default function ConstructionPayroll() {
	const qc = useQueryClient();
	const [tab, setTab] = useState("ledger");
	const [addOpen, setAddOpen] = useState(false);
	const [requestOpen, setRequestOpen] = useState(false);
	const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

	const { data: access, isLoading: accessLoading } = useQuery({
		queryKey: ["payroll-access"],
		queryFn: () =>
			api.get("/construction/payroll/access").then((r) => r.data as Access),
	});

	const canAccess = access?.canAccess ?? false;
	const isManager = access?.isManager ?? false;
	const isFinance = access?.isFinance ?? false;
	const canEdit = isManager || isFinance;

	const { data: employees = [], isLoading: employeesLoading } = useQuery({
		queryKey: ["payroll-employees"],
		queryFn: () =>
			api.get("/construction/payroll/employees").then((r) => r.data as Employee[]),
		enabled: canAccess,
	});

	const { data: legalEntities = [], isLoading: legalEntitiesLoading } = useQuery({
		queryKey: ["payroll-legal-entities"],
		queryFn: () => api.get("/legal-entities").then((r) => r.data as LegalEntity[]),
		enabled: canAccess,
	});

	const { data: requests = [], isLoading: requestsLoading } = useQuery({
		queryKey: ["payroll-requests"],
		queryFn: () =>
			api.get("/construction/payroll/requests").then((r) => r.data as ApprovalRequest[]),
		enabled: canAccess,
	});

	const refreshAll = () => {
		qc.invalidateQueries({ queryKey: ["payroll-employees"] });
		qc.invalidateQueries({ queryKey: ["payroll-legal-entities"] });
		qc.invalidateQueries({ queryKey: ["payroll-requests"] });
		qc.invalidateQueries({ queryKey: ["payroll-changes"] });
	};

	if (accessLoading) {
		return (
			<div className="mx-auto max-w-6xl space-y-4 p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (!canAccess) {
		return (
			<div className="mx-auto max-w-md px-4 py-20 text-center">
				<Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Нет доступа</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Зарплатная ведомость доступна руководителям, финансистам и сотрудникам из
					списка доступа. Обратитесь к руководителю, чтобы получить доступ.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4 p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="flex items-center gap-2 text-2xl font-bold">
						<Banknote className="h-6 w-6 text-orange-500" />
						Зарплатная ведомость
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Учёт зарплат, согласование изменений и история повышений
					</p>
				</div>
				{canEdit && (
					<Button onClick={() => setAddOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						Добавить сотрудника
					</Button>
				)}
			</div>

			<Tabs value={tab} onValueChange={setTab}>
				<TabsList>
					<TabsTrigger value="ledger">Ведомость</TabsTrigger>
					<TabsTrigger value="staff">
						<Building2 className="mr-1 h-4 w-4" />
						Штат по ОсОО
					</TabsTrigger>
					<TabsTrigger value="requests">Запросы на одобрение</TabsTrigger>
					<TabsTrigger value="history">
						<TrendingUp className="mr-1 h-4 w-4" />
						История
					</TabsTrigger>
					{isManager && <TabsTrigger value="settings">Настройки доступа</TabsTrigger>}
				</TabsList>

				<TabsContent value="ledger" className="mt-4">
					<LedgerTab
						employees={employees}
						isLoading={employeesLoading}
						canEdit={canEdit}
						onAdd={() => setAddOpen(true)}
						onRowClick={setHistoryEmployee}
					/>
				</TabsContent>

				<TabsContent value="staff" className="mt-4">
					<StaffByLegalEntityTab
						employees={employees}
						legalEntities={legalEntities}
						isLoading={employeesLoading || legalEntitiesLoading}
						canEdit={canEdit}
						onRefresh={refreshAll}
						onAdd={() => setAddOpen(true)}
					/>
				</TabsContent>

				<TabsContent value="requests" className="mt-4">
					{access && (
						<RequestsTab
							requests={requests}
							employees={employees}
							isLoading={requestsLoading}
							access={access}
							onCreate={() => setRequestOpen(true)}
							onRefresh={refreshAll}
						/>
					)}
				</TabsContent>

				<TabsContent value="history" className="mt-4">
					<HistoryTab />
				</TabsContent>

				{isManager && (
					<TabsContent value="settings" className="mt-4">
						<AccessSettingsTab />
					</TabsContent>
				)}
			</Tabs>

			<AddEmployeeDialog
				open={addOpen}
				legalEntities={legalEntities}
				onClose={() => setAddOpen(false)}
				onDone={refreshAll}
			/>
			<RequestDialog
				open={requestOpen}
				employees={employees}
				onClose={() => setRequestOpen(false)}
				onDone={refreshAll}
			/>
			<HistoryDialog
				employee={historyEmployee}
				onClose={() => setHistoryEmployee(null)}
			/>
		</div>
	);
}
