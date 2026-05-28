import { getApiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import {
	type Counterparty,
	type CreateCounterpartyBodyType,
	getListCounterpartiesQueryKey,
	useCreateCounterparty,
	useDeleteCounterparty,
	useListCounterparties,
	useUpdateCounterparty,
} from "@/api-client";
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
import { cn } from "@/lib/utils";

const CATEGORIES = [
	{ key: "all", label: "Все" },
	{ key: "tenant", label: "Арендаторы" },
	{ key: "buyer", label: "Покупатели" },
	{ key: "supplier", label: "Поставщики" },
	{ key: "contractor", label: "Подрядчики" },
	{ key: "owner", label: "Собственники" },
	{ key: "other", label: "Прочие" },
];

const CATEGORY_COLORS: Record<string, string> = {
	tenant: "bg-blue-100 text-blue-800",
	buyer: "bg-indigo-100 text-indigo-800",
	supplier: "bg-amber-100 text-amber-800",
	contractor: "bg-amber-100 text-amber-800",
	owner: "bg-emerald-100 text-emerald-700",
	other: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
	individual: "Физлицо",
	company: "Юрлицо",
};

const CATEGORY_LABELS: Record<string, string> = {
	tenant: "Арендатор",
	buyer: "Покупатель",
	supplier: "Поставщик",
	contractor: "Подрядчик",
	owner: "Собственник",
	other: "Прочее",
};

interface CounterpartyDialogProps {
	open: boolean;
	onClose: () => void;
	counterparty?: Counterparty;
}

function CounterpartyDialog({
	open,
	onClose,
	counterparty,
}: CounterpartyDialogProps) {
	const createMutation = useCreateCounterparty();
	const updateMutation = useUpdateCounterparty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		fullName: "",
		type: "individual",
		category: "tenant",
		iin: "",
		phone: "",
		email: "",
		address: "",
		additionalContact: "",
		comment: "",
	});

	useEffect(() => {
		if (counterparty && open) {
			setFormData({
				fullName: counterparty.fullName,
				type: counterparty.type || "individual",
				category: (counterparty as any).category || "other",
				iin: counterparty.iin || "",
				phone: counterparty.phone || "",
				email: counterparty.email || "",
				address: (counterparty as any).address || "",
				additionalContact: counterparty.additionalContact || "",
				comment: counterparty.comment || "",
			});
		} else if (!counterparty && open) {
			setFormData({
				fullName: "",
				type: "individual",
				category: "tenant",
				iin: "",
				phone: "",
				email: "",
				address: "",
				additionalContact: "",
				comment: "",
			});
		}
	}, [counterparty, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				fullName: formData.fullName,
				type: formData.type as CreateCounterpartyBodyType,
				category: formData.category,
				iin: formData.iin || null,
				phone: formData.phone || null,
				email: formData.email || null,
				address: formData.address || null,
				additionalContact: formData.additionalContact || null,
				comment: formData.comment || null,
			};
			if (counterparty) {
				await updateMutation.mutateAsync({
					id: counterparty.id,
					data: payload,
				});
				toast({ title: "Контрагент обновлён" });
			} else {
				await createMutation.mutateAsync({ data: payload });
				toast({ title: "Контрагент добавлен" });
			}
			queryClient.invalidateQueries({
				queryKey: getListCounterpartiesQueryKey(),
			});
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description:
					getApiErrorMessage(err, "Не удалось сохранить контрагента"),
				variant: "destructive",
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{counterparty
							? "Редактировать контрагента"
							: "Добавить контрагента"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Тип *</Label>
							<Select
								value={formData.type}
								onValueChange={(v) => setFormData({ ...formData, type: v })}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="individual">Физическое лицо</SelectItem>
									<SelectItem value="company">Юридическое лицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Категория *</Label>
							<Select
								value={formData.category}
								onValueChange={(v) => setFormData({ ...formData, category: v })}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="tenant">Арендатор</SelectItem>
									<SelectItem value="buyer">Покупатель</SelectItem>
									<SelectItem value="supplier">Поставщик</SelectItem>
									<SelectItem value="contractor">Подрядчик</SelectItem>
									<SelectItem value="owner">Собственник</SelectItem>
									<SelectItem value="other">Прочее</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>
							{formData.type === "company"
								? "Наименование организации *"
								: "ФИО *"}
						</Label>
						<Input
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							placeholder={
								formData.type === "company"
									? 'ОсОО "Ваша Компания" / АО / ЗАО'
									: "Иванов Иван Иванович"
							}
							required
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>
								{formData.type === "company" ? "ИНН (ОГРН)" : "ИНН (ИИН)"}
							</Label>
							<Input
								value={formData.iin}
								onChange={(e) =>
									setFormData({ ...formData, iin: e.target.value })
								}
								placeholder="12345678901234"
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 700 000 000"
								className="mt-1"
							/>
						</div>
					</div>

					<div>
						<Label>Email</Label>
						<Input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="example@mail.kg"
							className="mt-1"
						/>
					</div>

					<div>
						<Label>Адрес</Label>
						<Input
							value={formData.address}
							onChange={(e) =>
								setFormData({ ...formData, address: e.target.value })
							}
							placeholder="г. Бишкек, ул..."
							className="mt-1"
						/>
					</div>

					<div>
						<Label>Комментарий</Label>
						<Input
							value={formData.comment}
							onChange={(e) =>
								setFormData({ ...formData, comment: e.target.value })
							}
							className="mt-1"
						/>
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

export default function Counterparties() {
	const searchString = useSearch();
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const { data: counterparties, isLoading } = useListCounterparties({
		search: search || undefined,
		type: typeFilter !== "all" ? typeFilter : undefined,
	});
	const deleteMutation = useDeleteCounterparty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedCP, setSelectedCP] = useState<Counterparty | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(
			searchString.startsWith("?") ? searchString.slice(1) : searchString,
		);
		if (params.get("create") === "1") {
			setSelectedCP(undefined);
			setDialogOpen(true);
		}
	}, [searchString]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await deleteMutation.mutateAsync({ id: deleteId });
			toast({ title: "Контрагент удалён" });
			queryClient.invalidateQueries({
				queryKey: getListCounterpartiesQueryKey(),
			});
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось удалить контрагента",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const counterpartiesArray = Array.isArray(counterparties)
		? counterparties
		: [];
	const filtered = counterpartiesArray.filter((cp) => {
		if (categoryFilter === "all") return true;
		return (cp as any).category === categoryFilter;
	});

	// Count by category
	const countByCategory = counterpartiesArray.reduce(
		(acc, cp) => {
			const cat = (cp as any).category || "other";
			acc[cat] = (acc[cat] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Briefcase className="w-6 h-6 text-blue-600" /> Справочник
						контрагентов
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Арендаторы, покупатели, поставщики и подрядчики
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedCP(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить
				</Button>
			</div>

			{/* Category tabs */}
			<div className="flex gap-1 flex-wrap border-b border-gray-200">
				{CATEGORIES.map((cat) => {
					const count =
						cat.key === "all"
							? counterpartiesArray.length
							: countByCategory[cat.key] || 0;
					return (
						<button
							key={cat.key}
							onClick={() => setCategoryFilter(cat.key)}
							className={cn(
								"px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
								categoryFilter === cat.key
									? "border-blue-600 text-blue-700"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
							)}
						>
							{cat.label}
							<span
								className={cn(
									"ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
									categoryFilter === cat.key
										? "bg-blue-100 text-blue-700"
										: "bg-gray-100 text-gray-700",
								)}
							>
								{count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Search + type filter */}
			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Поиск по имени, телефону, ИНН..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Все типы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все типы</SelectItem>
						<SelectItem value="individual">Физические лица</SelectItem>
						<SelectItem value="company">Юридические лица</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>ФИО / Наименование</TableHead>
							<TableHead>Категория</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>ИНН</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
							<TableHead className="w-20"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
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
									<Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Контрагенты не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((cp) => (
								<TableRow key={cp.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{cp.fullName}
									</TableCell>
									<TableCell>
										<Badge
											className={cn(
												"text-xs",
												CATEGORY_COLORS[(cp as any).category] ||
													CATEGORY_COLORS.other,
											)}
											variant="secondary"
										>
											{CATEGORY_LABELS[(cp as any).category] ||
												(cp as any).category ||
												"—"}
										</Badge>
									</TableCell>
									<TableCell>
										<span className="text-xs text-gray-500">
											{TYPE_LABELS[cp.type] || cp.type}
										</span>
									</TableCell>
									<TableCell className="text-gray-500">
										{cp.iin || "—"}
									</TableCell>
									<TableCell className="text-gray-600">
										{cp.phone || "—"}
									</TableCell>
									<TableCell className="text-gray-500 text-sm">
										{cp.email || "—"}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedCP(cp);
													setDialogOpen(true);
												}}
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(cp.id)}
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

			<CounterpartyDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				counterparty={selectedCP}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить контрагента?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Контрагент будет удалён из системы.
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
