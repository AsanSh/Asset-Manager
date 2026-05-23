import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus, Search, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface LegalEntity {
	id: number;
	name: string;
	fullLegalName?: string;
	inn?: string;
	address?: string;
	phone?: string;
	email?: string;
	directorName?: string;
	accountant?: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

interface LegalEntityDialogProps {
	open: boolean;
	onClose: () => void;
	entity?: LegalEntity;
}

function LegalEntityDialog({ open, onClose, entity }: LegalEntityDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		fullLegalName: "",
		inn: "",
		address: "",
		phone: "",
		email: "",
		directorName: "",
		accountant: "",
		isActive: true,
	});

	useEffect(() => {
		if (entity && open) {
			setFormData({
				name: entity.name,
				fullLegalName: entity.fullLegalName || "",
				inn: entity.inn || "",
				address: entity.address || "",
				phone: entity.phone || "",
				email: entity.email || "",
				directorName: entity.directorName || "",
				accountant: entity.accountant || "",
				isActive: entity.isActive,
			});
		} else if (!entity && open) {
			setFormData({
				name: "",
				fullLegalName: "",
				inn: "",
				address: "",
				phone: "",
				email: "",
				directorName: "",
				accountant: "",
				isActive: true,
			});
		}
	}, [entity, open]);

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/legal-entities", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо создано" });
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
		mutationFn: (data: any) => api.patch(`/legal-entities/${entity?.id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо обновлено" });
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
			...formData,
			fullLegalName: formData.fullLegalName || null,
			inn: formData.inn || null,
			address: formData.address || null,
			phone: formData.phone || null,
			email: formData.email || null,
			directorName: formData.directorName || null,
			accountant: formData.accountant || null,
		};

		if (entity) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{entity
							? "Редактировать юридическое лицо"
							: "Добавить юридическое лицо"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Название *</Label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="ОсОО Компания"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Полное наименование</Label>
							<Input
								value={formData.fullLegalName}
								onChange={(e) =>
									setFormData({ ...formData, fullLegalName: e.target.value })
								}
								placeholder="Общество с ограниченной ответственностью..."
								className="mt-1"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>ИНН/ИНО</Label>
							<Input
								value={formData.inn}
								onChange={(e) =>
									setFormData({ ...formData, inn: e.target.value })
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
							placeholder="info@company.kg"
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
							placeholder="г. Бишкек, ул. Советская 1"
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Директор</Label>
							<Input
								value={formData.directorName}
								onChange={(e) =>
									setFormData({ ...formData, directorName: e.target.value })
								}
								placeholder="Иванов И.И."
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Главный бухгалтер</Label>
							<Input
								value={formData.accountant}
								onChange={(e) =>
									setFormData({ ...formData, accountant: e.target.value })
								}
								placeholder="Петрова П.П."
								className="mt-1"
							/>
						</div>
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

export default function LegalEntities() {
	const [search, setSearch] = useState("");
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: entities, isLoading } = useQuery({
		queryKey: ["legal-entities", search],
		queryFn: () =>
			api
				.get("/legal-entities", { params: { search: search || undefined } })
				.then((r) => r.data),
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedEntity, setSelectedEntity] = useState<
		LegalEntity | undefined
	>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/legal-entities/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо удалено" });
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

	const entitiesArray = Array.isArray(entities) ? entities : [];
	const filtered = entitiesArray.filter((entity: LegalEntity) => {
		if (!search) return true;
		const searchLower = search.toLowerCase();
		return (
			entity.name.toLowerCase().includes(searchLower) ||
			entity.fullLegalName?.toLowerCase().includes(searchLower) ||
			entity.inn?.toLowerCase().includes(searchLower) ||
			entity.phone?.toLowerCase().includes(searchLower) ||
			entity.email?.toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Building2 className="w-6 h-6 text-blue-600" /> Юридические лица
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление юридическими лицами организации
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedEntity(undefined);
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
						placeholder="Поиск по названию, ИНН, телефону, email..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Название</TableHead>
							<TableHead>Полное наименование</TableHead>
							<TableHead>ИНН</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
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
									<Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Юридические лица не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((entity: LegalEntity) => (
								<TableRow key={entity.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{entity.name}
									</TableCell>
									<TableCell className="text-gray-600 text-sm">
										{entity.fullLegalName || "—"}
									</TableCell>
									<TableCell className="text-gray-500">
										{entity.inn || "—"}
									</TableCell>
									<TableCell className="text-gray-600">
										{entity.phone || "—"}
									</TableCell>
									<TableCell className="text-gray-500 text-sm">
										{entity.email || "—"}
									</TableCell>
									<TableCell>
										<Badge variant={entity.isActive ? "default" : "secondary"}>
											{entity.isActive ? "Активен" : "Неактивен"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedEntity(entity);
													setDialogOpen(true);
												}}
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(entity.id)}
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

			<LegalEntityDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				entity={selectedEntity}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить юридическое лицо?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Юридическое лицо будет удалено из
							системы.
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
