import {
	ArrowRight,
	Edit2,
	LayoutGrid,
	List,
	Plus,
	Search,
	Target,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface Deal {
	id: number;
	clientId: number;
	clientName?: string;
	propertyId?: number;
	propertyName?: string;
	amount: number;
	currency: string;
	stage: string;
	probability: number;
	expectedCloseDate?: string;
	assignedUserId?: number;
	assignedUserName?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

const STAGES = [
	{
		value: "lead",
		label: "Лид",
		probability: 10,
		color: "bg-blue-100 text-blue-800",
	},
	{
		value: "viewing",
		label: "Просмотр",
		probability: 25,
		color: "bg-amber-100 text-amber-800",
	},
	{
		value: "negotiation",
		label: "Переговоры",
		probability: 50,
		color: "bg-amber-100 text-amber-800",
	},
	{
		value: "contract",
		label: "Договор",
		probability: 75,
		color: "bg-blue-100 text-indigo-800",
	},
	{
		value: "closed_won",
		label: "Закрыта",
		probability: 100,
		color: "bg-emerald-100 text-emerald-800",
	},
	{
		value: "closed_lost",
		label: "Проиграна",
		probability: 0,
		color: "bg-rose-100 text-rose-800",
	},
];

const CURRENCIES = ["KGS", "USD", "EUR"];

interface DealDialogProps {
	open: boolean;
	onClose: () => void;
	deal?: Deal;
	onSuccess: () => void;
}

function DealDialog({ open, onClose, deal, onSuccess }: DealDialogProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		clientId: "",
		propertyId: "",
		amount: "",
		currency: "KGS",
		stage: "lead",
		probability: "10",
		expectedCloseDate: "",
		notes: "",
	});

	useEffect(() => {
		if (deal && open) {
			setFormData({
				clientId: String(deal.clientId) || "",
				propertyId: deal.propertyId ? String(deal.propertyId) : "",
				amount: String(deal.amount) || "",
				currency: deal.currency || "KGS",
				stage: deal.stage || "lead",
				probability: String(deal.probability) || "10",
				expectedCloseDate: deal.expectedCloseDate
					? deal.expectedCloseDate.split("T")[0]
					: "",
				notes: deal.notes || "",
			});
		} else if (!deal && open) {
			setFormData({
				clientId: "",
				propertyId: "",
				amount: "",
				currency: "KGS",
				stage: "lead",
				probability: "10",
				expectedCloseDate: "",
				notes: "",
			});
		}
	}, [deal, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const payload = {
				clientId: parseInt(formData.clientId, 10),
				propertyId: formData.propertyId ? parseInt(formData.propertyId, 10) : null,
				amount: parseFloat(formData.amount),
				currency: formData.currency,
				stage: formData.stage,
				probability: parseFloat(formData.probability),
				expectedCloseDate: formData.expectedCloseDate || null,
				notes: formData.notes || null,
			};

			if (deal) {
				await api.patch(`/crm/deals/${deal.id}`, payload);
				toast({ title: "Сделка обновлена" });
			} else {
				await api.post("/crm/deals", payload);
				toast({ title: "Сделка создана" });
			}
			onSuccess();
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось сохранить сделку",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleStageChange = (stage: string) => {
		const stageData = STAGES.find((s) => s.value === stage);
		setFormData({
			...formData,
			stage,
			probability: stageData
				? String(stageData.probability)
				: formData.probability,
		});
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{deal ? "Редактировать сделку" : "Создать сделку"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
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
						<Label>ID Объекта</Label>
						<Input
							type="number"
							value={formData.propertyId}
							onChange={(e) =>
								setFormData({ ...formData, propertyId: e.target.value })
							}
							placeholder="1"
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Сумма *</Label>
							<Input
								type="number"
								value={formData.amount}
								onChange={(e) =>
									setFormData({ ...formData, amount: e.target.value })
								}
								placeholder="10000000"
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
							<Label>Этап *</Label>
							<Select value={formData.stage} onValueChange={handleStageChange}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STAGES.map((stage) => (
										<SelectItem key={stage.value} value={stage.value}>
											{stage.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Вероятность % *</Label>
							<Input
								type="number"
								value={formData.probability}
								onChange={(e) =>
									setFormData({ ...formData, probability: e.target.value })
								}
								min="0"
								max="100"
								required
								className="mt-1"
							/>
						</div>
					</div>

					<div>
						<Label>Ожидаемая дата закрытия</Label>
						<Input
							type="date"
							value={formData.expectedCloseDate}
							onChange={(e) =>
								setFormData({ ...formData, expectedCloseDate: e.target.value })
							}
							className="mt-1"
						/>
					</div>

					<div>
						<Label>Заметки</Label>
						<Textarea
							value={formData.notes}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							placeholder="Детали сделки"
							rows={3}
							className="mt-1"
						/>
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

export default function Deals() {
	const [deals, setDeals] = useState<Deal[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [stageFilter, setStageFilter] = useState<string>("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const filteredDeals = useMemo(
		() => deals.filter((d) => !d.expectedCloseDate || inPeriod(d.expectedCloseDate, period)),
		[deals, period],
	);
	const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedDeal, setSelectedDeal] = useState<Deal | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [moveStageId, setMoveStageId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadDeals = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				search: search || undefined,
				stage: stageFilter !== "all" ? stageFilter : undefined,
			};
			const response = await api.get<Deal[]>("/crm/deals", { params });
			setDeals(Array.isArray(response.data) ? response.data : []);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить сделки",
				variant: "destructive",
			});
			setDeals([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadDeals();
	}, [search, stageFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await api.delete(`/crm/deals/${deleteId}`);
			toast({ title: "Сделка удалена" });
			loadDeals();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось удалить сделку",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const handleMoveStage = async () => {
		if (!moveStageId) return;
		const deal = deals.find((d) => d.id === moveStageId);
		if (!deal) return;

		const currentIdx = STAGES.findIndex((s) => s.value === deal.stage);
		if (currentIdx === -1 || currentIdx >= STAGES.length - 2) return;

		const nextStage = STAGES[currentIdx + 1];
		try {
			await api.patch(`/crm/deals/${moveStageId}/stage`, {
				stage: nextStage.value,
			});
			toast({ title: `Сделка перемещена на этап "${nextStage.label}"` });
			loadDeals();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось переместить сделку",
				variant: "destructive",
			});
		}
		setMoveStageId(null);
	};

	const getStageBadge = (stage: string) => {
		const stageData = STAGES.find((s) => s.value === stage);
		return (
			<Badge
				className={cn(
					"text-xs",
					stageData?.color || "bg-gray-100 text-gray-800",
				)}
				variant="secondary"
			>
				{stageData?.label || stage}
			</Badge>
		);
	};

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Target className="w-6 h-6 text-blue-600" /> Сделки
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление воронкой продаж
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() =>
							setViewMode(viewMode === "table" ? "kanban" : "table")
						}
						title={viewMode === "table" ? "Канбан вид" : "Табличный вид"}
					>
						{viewMode === "table" ? (
							<LayoutGrid className="w-4 h-4" />
						) : (
							<List className="w-4 h-4" />
						)}
					</Button>
					<Button
						onClick={() => {
							setSelectedDeal(undefined);
							setDialogOpen(true);
						}}
					>
						<Plus className="w-4 h-4 mr-2" /> Создать сделку
					</Button>
				</div>
			</div>

			{/* Filters */}
			<PeriodPicker value={period} onChange={setPeriod} />
			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Поиск по клиенту, объекту..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={stageFilter} onValueChange={setStageFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Все этапы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все этапы</SelectItem>
						{STAGES.map((stage) => (
							<SelectItem key={stage.value} value={stage.value}>
								{stage.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table View */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Клиент</TableHead>
							<TableHead>Объект</TableHead>
							<TableHead>Сумма</TableHead>
							<TableHead>Этап</TableHead>
							<TableHead>Вероятность</TableHead>
							<TableHead>Ожид. закрытие</TableHead>
							<TableHead>Ответственный</TableHead>
							<TableHead className="w-32"></TableHead>
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
						) : !filteredDeals.length ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center py-12">
									<Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Сделки не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filteredDeals.map((deal) => (
								<TableRow key={deal.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{deal.clientName || `Клиент #${deal.clientId}`}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{deal.propertyName ||
											(deal.propertyId ? `Объект #${deal.propertyId}` : "—")}
									</TableCell>
									<TableCell className="font-medium text-gray-900">
										{formatCurrency(deal.amount, deal.currency)}
									</TableCell>
									<TableCell>{getStageBadge(deal.stage)}</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
												<div
													className="bg-blue-600 h-2 rounded-full"
													style={{ width: `${deal.probability}%` }}
												/>
											</div>
											<span className="text-sm text-gray-700">
												{deal.probability}%
											</span>
										</div>
									</TableCell>
									<TableCell className="text-sm text-gray-500">
										{deal.expectedCloseDate
											? new Date(deal.expectedCloseDate).toLocaleDateString(
													"ru-RU",
												)
											: "—"}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{deal.assignedUserName || "—"}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedDeal(deal);
													setDialogOpen(true);
												}}
												title="Редактировать"
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											{!["closed_won", "closed_lost"].includes(deal.stage) && (
												<Button
													variant="ghost"
													size="icon"
													className="text-blue-600 hover:text-blue-700"
													onClick={() => setMoveStageId(deal.id)}
													title="Переместить на следующий этап"
												>
													<ArrowRight className="w-4 h-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(deal.id)}
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

			<DealDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				deal={selectedDeal}
				onSuccess={loadDeals}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Сделка будет удалена из системы.
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

			<AlertDialog
				open={moveStageId !== null}
				onOpenChange={(v) => !v && setMoveStageId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Переместить на следующий этап?</AlertDialogTitle>
						<AlertDialogDescription>
							Сделка будет перемещена на следующий этап воронки продаж.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction onClick={handleMoveStage}>
							Переместить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
