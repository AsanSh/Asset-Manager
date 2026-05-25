import {
	Download,
	Edit2,
	Eye,
	FileText,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>ID Клиента *</Label>
							<Input
								type="number"
								value={formData.clientId}
								onChange={(e) =>
									setFormData({ ...formData, clientId: e.target.value })
								}
								placeholder="1"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>ID Объекта *</Label>
							<Input
								type="number"
								value={formData.propertyId}
								onChange={(e) =>
									setFormData({ ...formData, propertyId: e.target.value })
								}
								placeholder="1"
								required
								className="mt-1"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Сумма *</Label>
							<Input
								type="number"
								value={formData.totalAmount}
								onChange={(e) =>
									setFormData({ ...formData, totalAmount: e.target.value })
								}
								placeholder="15000000"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Валюта *</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger className="mt-1">
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

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Дата подписания</Label>
							<Input
								type="date"
								value={formData.signDate}
								onChange={(e) =>
									setFormData({ ...formData, signDate: e.target.value })
								}
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Дата регистрации</Label>
							<Input
								type="date"
								value={formData.registrationDate}
								onChange={(e) =>
									setFormData({ ...formData, registrationDate: e.target.value })
								}
								className="mt-1"
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
	const [search, setSearch] = useState("");
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
				search: search || undefined,
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
	}, [search, statusFilter]);

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

	const handleGenerateContract = (_contractId: number) => {
		toast({
			title: "Генерация договора",
			description: "Функция генерации документа будет реализована позже",
		});
	};

	const getStatusBadge = (status: string) => {
		const opt = STATUS_OPTIONS.find((s) => s.value === status);
		return (
			<Badge
				className={cn("text-xs", opt?.color || "bg-gray-100 text-gray-800")}
				variant="secondary"
			>
				{opt?.label || status}
			</Badge>
		);
	};

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

			{/* Filters */}
			<div className="space-y-3">
			<PeriodPicker value={period} onChange={setPeriod} />
			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Поиск по номеру, клиенту..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-44">
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
			</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Номер договора</TableHead>
							<TableHead>Клиент</TableHead>
							<TableHead>Объект</TableHead>
							<TableHead>Сумма</TableHead>
							<TableHead>Дата подписания</TableHead>
							<TableHead>Дата регистрации</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="w-40"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !filteredContracts.length ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center py-12">
									<FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Договоры не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filteredContracts.map((contract) => (
								<TableRow key={contract.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{contract.contractNumber}
									</TableCell>
									<TableCell className="text-gray-700">
										{contract.clientName || `Клиент #${contract.clientId}`}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{contract.propertyName || `Объект #${contract.propertyId}`}
									</TableCell>
									<TableCell className="font-medium">
										{formatCurrency(contract.totalAmount, contract.currency)}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{contract.signDate
											? new Date(contract.signDate).toLocaleDateString("ru-RU")
											: "—"}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{contract.registrationDate
											? new Date(contract.registrationDate).toLocaleDateString(
													"ru-RU",
												)
											: "—"}
									</TableCell>
									<TableCell>{getStatusBadge(contract.status)}</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedContract(contract);
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
													setSelectedContract(contract);
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
												onClick={() => handleGenerateContract(contract.id)}
												title="Сгенерировать документ"
											>
												<Download className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(contract.id)}
												title="Удалить"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
