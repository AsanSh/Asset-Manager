import {
	Download,
	Edit2,
	Eye,
	FileText,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface PaymentScheduleItem {
	date: string;
	amount: number;
	description: string;
}

interface SalesContract {
	id: number;
	contractNumber: string;
	clientId: number;
	clientName?: string;
	propertyId: number;
	propertyName?: string;
	totalAmount: number;
	currency: string;
	paymentSchedule?: PaymentScheduleItem[];
	signDate?: string;
	registrationDate?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

const STATUS_OPTIONS = [
	{ value: "draft", label: "Черновик", color: "bg-gray-100 text-gray-800" },
	{ value: "signed", label: "Подписан", color: "bg-blue-100 text-blue-800" },
	{
		value: "registered",
		label: "Зарегистрирован",
		color: "bg-emerald-100 text-emerald-800",
	},
	{ value: "cancelled", label: "Отменён", color: "bg-rose-100 text-rose-800" },
];

const CURRENCIES = ["KGS", "USD", "EUR"];

interface ContractDialogProps {
	open: boolean;
	onClose: () => void;
	contract?: SalesContract;
	onSuccess: () => void;
}

function ContractDialog({
	open,
	onClose,
	contract,
	onSuccess,
}: ContractDialogProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		contractNumber: "",
		clientId: "",
		propertyId: "",
		totalAmount: "",
		currency: "KGS",
		signDate: "",
		registrationDate: "",
		status: "draft",
	});

	useEffect(() => {
		if (contract && open) {
			setFormData({
				contractNumber: contract.contractNumber || "",
				clientId: String(contract.clientId) || "",
				propertyId: String(contract.propertyId) || "",
				totalAmount: String(contract.totalAmount) || "",
				currency: contract.currency || "KGS",
				signDate: contract.signDate ? contract.signDate.split("T")[0] : "",
				registrationDate: contract.registrationDate
					? contract.registrationDate.split("T")[0]
					: "",
				status: contract.status || "draft",
			});
		} else if (!contract && open) {
			setFormData({
				contractNumber: `СК-${Date.now().toString().slice(-6)}`,
				clientId: "",
				propertyId: "",
				totalAmount: "",
				currency: "KGS",
				signDate: "",
				registrationDate: "",
				status: "draft",
			});
		}
	}, [contract, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const payload = {
				contractNumber: formData.contractNumber,
				clientId: parseInt(formData.clientId, 10),
				propertyId: parseInt(formData.propertyId, 10),
				totalAmount: parseFloat(formData.totalAmount),
				currency: formData.currency,
				signDate: formData.signDate || null,
				registrationDate: formData.registrationDate || null,
				status: formData.status,
			};

			if (contract) {
				await api.patch(`/crm/sales-contracts/${contract.id}`, payload);
				toast({ title: "Договор обновлён" });
			} else {
				await api.post("/crm/sales-contracts", payload);
				toast({ title: "Договор создан" });
			}
			onSuccess();
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось сохранить договор",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{contract ? "Редактировать договор" : "Создать договор продажи"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Номер договора *</Label>
						<Input
							value={formData.contractNumber}
							onChange={(e) =>
								setFormData({ ...formData, contractNumber: e.target.value })
							}
							placeholder="СК-001234"
							required
							className="mt-1"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ID Клиента *</Label>
							<Input
								type="number"
								value={formData.clientId}
								onChange={(e) =>
									setFormData({ ...formData, clientId: e.target.value })
								}
								placeholder="1"
								required
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ID Объекта *</Label>
							<Input
								type="number"
								value={formData.propertyId}
								onChange={(e) =>
									setFormData({ ...formData, propertyId: e.target.value })
								}
								placeholder="1"
								required
								className="mt-auto"
							/>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Сумма *</Label>
							<Input
								type="number"
								value={formData.totalAmount}
								onChange={(e) =>
									setFormData({ ...formData, totalAmount: e.target.value })
								}
								placeholder="15000000"
								required
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валюта *</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((cur) => (
										<SelectItem key={cur} value={cur}>
											{cur}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Дата подписания</Label>
							<Input
								type="date"
								value={formData.signDate}
								onChange={(e) =>
									setFormData({ ...formData, signDate: e.target.value })
								}
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Дата регистрации</Label>
							<Input
								type="date"
								value={formData.registrationDate}
								onChange={(e) =>
									setFormData({ ...formData, registrationDate: e.target.value })
								}
								className="mt-auto"
							/>
						</div>
					</div>

					<div>
						<Label>Статус *</Label>
						<Select
							value={formData.status}
							onValueChange={(v) => setFormData({ ...formData, status: v })}
						>
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

interface PaymentScheduleDialogProps {
	open: boolean;
	onClose: () => void;
	contract?: SalesContract;
}

function PaymentScheduleDialog({
	open,
	onClose,
	contract,
}: PaymentScheduleDialogProps) {
	if (!contract) return null;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>График платежей - {contract.contractNumber}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{Array.isArray(contract.paymentSchedule) &&
					contract.paymentSchedule.length > 0 ? (
						<div className="border rounded-lg overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										<TableHead>Дата</TableHead>
										<TableHead>Сумма</TableHead>
										<TableHead>Описание</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{contract.paymentSchedule.map((item, idx) => (
										<TableRow key={idx}>
											<TableCell>
												{new Date(item.date).toLocaleDateString("ru-RU")}
											</TableCell>
											<TableCell className="font-medium">
												{formatCurrency(item.amount, contract.currency)}
											</TableCell>
											<TableCell className="text-sm text-gray-600">
												{item.description}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<p className="text-center py-8 text-gray-500">
							График платежей не настроен
						</p>
					)}
					<div className="flex justify-end">
						<Button variant="outline" onClick={onClose}>
							Закрыть
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default function SalesContracts() {
	const [contracts, setContracts] = useState<SalesContract[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

	const filteredContracts = useMemo(
		() => contracts.filter((c) => !c.signDate || inPeriod(c.signDate, period)),
		[contracts, period],
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
	const [selectedContract, setSelectedContract] = useState<
		SalesContract | undefined
	>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadContracts = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				status: statusFilter !== "all" ? statusFilter : undefined,
			};
			const response = await api.get<SalesContract[]>("/crm/sales-contracts", {
				params,
			});
			setContracts(Array.isArray(response.data) ? response.data : []);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить договоры",
				variant: "destructive",
			});
			setContracts([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadContracts();
	}, [statusFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await api.delete(`/crm/sales-contracts/${deleteId}`);
			toast({ title: "Договор удалён" });
			loadContracts();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось удалить договор",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const handleGenerateContract = useCallback((_contractId: number) => {
		toast({
			title: "Генерация договора",
			description: "Функция генерации документа будет реализована позже",
		});
	}, [toast]);

	const getStatusBadge = useCallback((status: string) => {
		const opt = STATUS_OPTIONS.find((s) => s.value === status);
		return (
			<Badge
				className={cn("text-xs", opt?.color || "bg-gray-100 text-gray-800")}
				variant="secondary"
			>
				{opt?.label || status}
			</Badge>
		);
	}, []);

	const columns = useMemo<ColumnDef<SalesContract, unknown>[]>(
		() => [
			{
				accessorKey: "contractNumber",
				header: "Номер договора",
				size: 150,
				meta: { exportLabel: "Номер договора", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.contractNumber}</span>
				),
			},
			{
				id: "client",
				header: "Клиент",
				size: 160,
				accessorFn: (row) => row.clientName || `Клиент #${row.clientId}`,
				meta: { exportLabel: "Клиент" },
				cell: ({ row }) =>
					row.original.clientName || `Клиент #${row.original.clientId}`,
			},
			{
				id: "property",
				header: "Объект",
				size: 160,
				accessorFn: (row) => row.propertyName || `Объект #${row.propertyId}`,
				meta: { exportLabel: "Объект" },
				cell: ({ row }) =>
					row.original.propertyName || `Объект #${row.original.propertyId}`,
			},
			{
				id: "totalAmount",
				header: "Сумма",
				size: 130,
				accessorFn: (row) => row.totalAmount,
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{formatCurrency(row.original.totalAmount, row.original.currency)}
					</span>
				),
			},
			{
				id: "signDate",
				header: "Дата подписания",
				size: 130,
				accessorFn: (row) => row.signDate || "",
				meta: { exportLabel: "Дата подписания" },
				cell: ({ row }) =>
					row.original.signDate
						? new Date(row.original.signDate).toLocaleDateString("ru-KG")
						: "—",
			},
			{
				id: "registrationDate",
				header: "Дата регистрации",
				size: 130,
				accessorFn: (row) => row.registrationDate || "",
				meta: { exportLabel: "Дата регистрации" },
				cell: ({ row }) =>
					row.original.registrationDate
						? new Date(row.original.registrationDate).toLocaleDateString("ru-KG")
						: "—",
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => getStatusBadge(row.original.status),
			},
			{
				id: "actions",
				header: "",
				size: 140,
				enableSorting: false,
				meta: { align: "right" },
				cell: ({ row }) => (
					<div className="flex gap-1 justify-end">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSelectedContract(row.original);
								setDialogOpen(true);
							}}
							title="Редактировать"
						>
							<Edit2 className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSelectedContract(row.original);
								setScheduleDialogOpen(true);
							}}
							title="График платежей"
						>
							<Eye className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-blue-600 hover:text-blue-700"
							onClick={() => handleGenerateContract(row.original.id)}
							title="Сгенерировать документ"
						>
							<Download className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-rose-600 hover:text-rose-700"
							onClick={() => setDeleteId(row.original.id)}
							title="Удалить"
						>
							<Trash2 className="w-4 h-4" />
						</Button>
					</div>
				),
			},
		],
		[getStatusBadge, handleGenerateContract],
	);

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<FileText className="w-6 h-6 text-blue-600" /> Договоры продажи
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление договорами купли-продажи
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedContract(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Создать договор
				</Button>
			</div>

			<div className="space-y-3">
				<PeriodPicker value={period} onChange={setPeriod} />
			</div>

			<DataTable
				tableId="crm-sales-contracts"
				columns={columns}
				data={filteredContracts}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по номеру, клиенту, объекту…"
				initialSorting={[{ id: "signDate", desc: true }]}
				toolbar={
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-44 h-8">
							<SelectValue placeholder="Все статусы" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все статусы</SelectItem>
							{STATUS_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				emptyState={
					<div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
						<FileText className="w-8 h-8 opacity-30" />
						<span>Договоры не найдены</span>
					</div>
				}
			/>

			<ContractDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				contract={selectedContract}
				onSuccess={loadContracts}
			/>

			<PaymentScheduleDialog
				open={scheduleDialogOpen}
				onClose={() => {
					setScheduleDialogOpen(false);
					setSelectedContract(undefined);
				}}
				contract={selectedContract}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить договор?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Договор будет удалён из системы.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-rose-600 hover:bg-rose-700"
						>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
