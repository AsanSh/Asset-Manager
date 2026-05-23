import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building,
	CreditCard,
	Edit2,
	Plus,
	Search,
	Trash2,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";

type AccountType = "bank" | "cash" | "card";
type Currency = "KGS" | "USD" | "EUR";

interface SystemAccount {
	id: number;
	name: string;
	type: AccountType;
	bankName?: string;
	bik?: string;
	accountNumber?: string;
	currency: Currency;
	openingBalance: number;
	currentBalance: number;
	isActive: boolean;
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
}

const ACCOUNT_TYPES = [
	{ value: "bank", label: "Банковский счет", icon: Building },
	{ value: "cash", label: "Касса", icon: Wallet },
	{ value: "card", label: "Карта", icon: CreditCard },
];

const CURRENCIES = ["KGS", "USD", "EUR"];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
	KGS: "сом",
	USD: "$",
	EUR: "€",
};

function formatCurrency(amount: number, currency: Currency) {
	const formatted = new Intl.NumberFormat("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);

	if (currency === "KGS") {
		return `${formatted} ${CURRENCY_SYMBOLS[currency]}`;
	}
	return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
}

interface AccountDialogProps {
	open: boolean;
	onClose: () => void;
	account?: SystemAccount;
}

function AccountDialog({ open, onClose, account }: AccountDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		type: "bank" as AccountType,
		bankName: "",
		bik: "",
		accountNumber: "",
		currency: "KGS" as Currency,
		openingBalance: "",
		isActive: true,
		notes: "",
	});

	useEffect(() => {
		if (account && open) {
			setFormData({
				name: account.name,
				type: account.type,
				bankName: account.bankName || "",
				bik: account.bik || "",
				accountNumber: account.accountNumber || "",
				currency: account.currency,
				openingBalance: account.openingBalance.toString(),
				isActive: account.isActive,
				notes: account.notes || "",
			});
		} else if (!account && open) {
			setFormData({
				name: "",
				type: "bank",
				bankName: "",
				bik: "",
				accountNumber: "",
				currency: "KGS",
				openingBalance: "0",
				isActive: true,
				notes: "",
			});
		}
	}, [account, open]);

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/system-accounts", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["system-accounts"] });
			toast({ title: "Счет создан" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: any) =>
			api.patch(`/system-accounts/${account?.id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["system-accounts"] });
			toast({ title: "Счет обновлен" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = {
			name: formData.name,
			type: formData.type,
			bankName: formData.bankName || null,
			bik: formData.bik || null,
			accountNumber: formData.accountNumber || null,
			currency: formData.currency,
			openingBalance: parseFloat(formData.openingBalance) || 0,
			isActive: formData.isActive,
			notes: formData.notes || null,
		};

		if (account) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const isBankAccount = formData.type === "bank";

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{account ? "Редактировать счет" : "Добавить счет"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Название счета *</Label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Основной расчетный счет"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Тип счета *</Label>
							<Select
								value={formData.type}
								onValueChange={(val: AccountType) =>
									setFormData({ ...formData, type: val })
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ACCOUNT_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{isBankAccount && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label>Название банка</Label>
									<Input
										value={formData.bankName}
										onChange={(e) =>
											setFormData({ ...formData, bankName: e.target.value })
										}
										placeholder="ОАО Банк"
										className="mt-1"
									/>
								</div>
								<div>
									<Label>БИК</Label>
									<Input
										value={formData.bik}
										onChange={(e) =>
											setFormData({ ...formData, bik: e.target.value })
										}
										placeholder="123456"
										className="mt-1"
									/>
								</div>
							</div>

							<div>
								<Label>Номер счета</Label>
								<Input
									value={formData.accountNumber}
									onChange={(e) =>
										setFormData({ ...formData, accountNumber: e.target.value })
									}
									placeholder="1234567890123456789"
									className="mt-1"
								/>
							</div>
						</>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Валюта *</Label>
							<Select
								value={formData.currency}
								onValueChange={(val: Currency) =>
									setFormData({ ...formData, currency: val })
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((curr) => (
										<SelectItem key={curr} value={curr}>
											{curr} ({CURRENCY_SYMBOLS[curr as Currency]})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Начальный баланс</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.openingBalance}
								onChange={(e) =>
									setFormData({ ...formData, openingBalance: e.target.value })
								}
								placeholder="0.00"
								className="mt-1"
								disabled={!!account}
							/>
							{account && (
								<p className="text-xs text-gray-500 mt-1">
									Текущий баланс:{" "}
									{formatCurrency(account.currentBalance, account.currency)}
								</p>
							)}
						</div>
					</div>

					<div>
						<Label>Примечания</Label>
						<Textarea
							value={formData.notes}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							placeholder="Дополнительная информация о счете"
							className="mt-1"
							rows={3}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Switch
							id="isActive"
							checked={formData.isActive}
							onCheckedChange={(checked) =>
								setFormData({ ...formData, isActive: checked })
							}
						/>
						<Label htmlFor="isActive" className="cursor-pointer">
							Активен
						</Label>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function SystemAccounts() {
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [currencyFilter, setCurrencyFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: accounts, isLoading } = useQuery({
		queryKey: ["system-accounts"],
		queryFn: () => api.get("/system-accounts").then((r) => r.data),
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedAccount, setSelectedAccount] = useState<
		SystemAccount | undefined
	>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/system-accounts/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["system-accounts"] });
			toast({ title: "Счет удален" });
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleDelete = async () => {
		if (!deleteId) return;
		deleteMutation.mutate(deleteId);
		setDeleteId(null);
	};

	const accountsArray = Array.isArray(accounts) ? accounts : [];
	const filtered = accountsArray.filter((account: SystemAccount) => {
		if (search) {
			const searchLower = search.toLowerCase();
			const matchesSearch =
				account.name.toLowerCase().includes(searchLower) ||
				account.bankName?.toLowerCase().includes(searchLower) ||
				account.accountNumber?.toLowerCase().includes(searchLower);
			if (!matchesSearch) return false;
		}
		if (typeFilter !== "all" && account.type !== typeFilter) return false;
		if (currencyFilter !== "all" && account.currency !== currencyFilter)
			return false;
		if (statusFilter === "active" && !account.isActive) return false;
		if (statusFilter === "inactive" && account.isActive) return false;
		return true;
	});

	const getTypeIcon = (type: AccountType) => {
		const typeConfig = ACCOUNT_TYPES.find((t) => t.value === type);
		const Icon = typeConfig?.icon || Wallet;
		return <Icon className="w-4 h-4" />;
	};

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Wallet className="w-6 h-6 text-blue-600" /> Счета организации
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Банковские счета, кассы и карты
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedAccount(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить
				</Button>
			</div>

			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Поиск по названию, банку, номеру счета..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Тип" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все типы</SelectItem>
						{ACCOUNT_TYPES.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={currencyFilter} onValueChange={setCurrencyFilter}>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="Валюта" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все валюты</SelectItem>
						{CURRENCIES.map((curr) => (
							<SelectItem key={curr} value={curr}>
								{curr}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="Статус" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все</SelectItem>
						<SelectItem value="active">Активные</SelectItem>
						<SelectItem value="inactive">Неактивные</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Название</TableHead>
							<TableHead>Банк</TableHead>
							<TableHead>Номер счета</TableHead>
							<TableHead>Валюта</TableHead>
							<TableHead className="text-right">Баланс</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="w-20"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !filtered.length ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center py-12">
									<Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Счета не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((account: SystemAccount) => (
								<TableRow key={account.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										<div className="flex items-center gap-2">
											{getTypeIcon(account.type)}
											{account.name}
										</div>
									</TableCell>
									<TableCell className="text-gray-600">
										{account.bankName || "—"}
									</TableCell>
									<TableCell className="text-gray-500 font-mono text-sm">
										{account.accountNumber || "—"}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{account.currency}</Badge>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(account.currentBalance, account.currency)}
									</TableCell>
									<TableCell>
										<Badge
											variant={account.isActive ? "default" : "secondary"}
											className={cn(
												!account.isActive && "bg-gray-200 text-gray-600",
											)}
										>
											{account.isActive ? "Активен" : "Неактивен"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedAccount(account);
													setDialogOpen(true);
												}}
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(account.id)}
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

			<AccountDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				account={selectedAccount}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить счет?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Счет будет удален из системы.
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
