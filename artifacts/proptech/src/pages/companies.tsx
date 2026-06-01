import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	type Company,
	getListCompaniesQueryKey,
	useCreateCompany,
	useListCompanies,
	useUpdateCompany,
} from "@/api-client";
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
import { useToast } from "@/hooks/use-toast";

export default function Companies() {
	const { data: companies, isLoading } = useListCompanies();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingCompany, setEditingCompany] = useState<Company | null>(null);

	const handleOpenCreate = () => {
		setEditingCompany(null);
		setIsDialogOpen(true);
	};

	const handleOpenEdit = (company: Company) => {
		setEditingCompany(company);
		setIsDialogOpen(true);
	};

	const rows = Array.isArray(companies) ? companies : [];

	const columns = useMemo<ColumnDef<Company, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Название",
				size: 180,
				minSize: 120,
				maxSize: 320,
				accessorKey: "name",
				meta: { exportLabel: "Название", grow: true },
				cell: ({ row }) => (
					<span className="font-medium truncate block" title={row.original.name}>
						{row.original.name}
					</span>
				),
			},
			{
				id: "legalName",
				header: "Юр. название",
				size: 200,
				minSize: 140,
				maxSize: 360,
				accessorFn: (row) => row.legalName || "",
				meta: { exportLabel: "Юр. название", grow: true },
				cell: ({ row }) => row.original.legalName || "—",
			},
			{
				id: "bin",
				header: "ИНН",
				size: 120,
				accessorFn: (row) => row.bin || "",
				meta: { exportLabel: "ИНН" },
				cell: ({ row }) => row.original.bin || "—",
			},
			{
				id: "status",
				header: "Статус",
				size: 100,
				accessorFn: (row) => (row.isActive ? "active" : "inactive"),
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge variant={row.original.isActive ? "default" : "secondary"}>
						{row.original.isActive ? "Активна" : "Неактивна"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 56,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "right" },
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleOpenEdit(row.original)}
					>
						<Edit2 className="h-4 w-4" />
					</Button>
				),
			},
		],
		[],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Компании</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Операционные компании и юридические лица
					</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Добавить компанию
				</Button>
			</div>

			<DataTable
				tableId="directory-companies"
				columns={columns}
				data={rows}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по названию…"
				initialSorting={[{ id: "name", desc: false }]}
				emptyState={
					<p className="py-8 text-center text-muted-foreground">
						Компаний пока нет. Создайте первую.
					</p>
				}
			/>

			<CompanyDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				company={editingCompany}
			/>
		</div>
	);
}

function CompanyDialog({
	open,
	onOpenChange,
	company,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	company: Company | null;
}) {
	const isEditing = !!company;
	const createMutation = useCreateCompany();
	const updateMutation = useUpdateCompany();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		legalName: "",
		bin: "",
		phone: "",
		email: "",
		address: "",
	});

	useEffect(() => {
		if (company && open) {
			setFormData({
				name: company.name,
				legalName: company.legalName || "",
				bin: company.bin || "",
				phone: company.phone || "",
				email: company.email || "",
				address: company.address || "",
			});
		} else if (!company && open) {
			setFormData({
				name: "",
				legalName: "",
				bin: "",
				phone: "",
				email: "",
				address: "",
			});
		}
	}, [company, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isEditing && company) {
			updateMutation.mutate(
				{ id: company.id, data: formData },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListCompaniesQueryKey(),
						});
						toast({ title: "Компания обновлена" });
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Ошибка",
							description: error.message,
							variant: "destructive",
						});
					},
				},
			);
		} else {
			createMutation.mutate(
				{ data: formData },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListCompaniesQueryKey(),
						});
						toast({ title: "Компания создана" });
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Ошибка",
							description: error.message,
							variant: "destructive",
						});
					},
				},
			);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Редактировать компанию" : "Добавить компанию"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-4">
					<div className="grid gap-4">
						<div className="space-y-2">
							<Label htmlFor="name">Отображаемое название *</Label>
							<Input
								id="name"
								required
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="legalName">Юридическое название</Label>
							<Input
								id="legalName"
								value={formData.legalName}
								onChange={(e) =>
									setFormData({ ...formData, legalName: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="bin">ИНН</Label>
								<Input
									className="mt-auto"
									id="bin"
									value={formData.bin}
									onChange={(e) =>
										setFormData({ ...formData, bin: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="phone">Телефон</Label>
								<Input
									className="mt-auto"
									id="phone"
									value={formData.phone}
									onChange={(e) =>
										setFormData({ ...formData, phone: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Почта</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="address">Адрес</Label>
							<Input
								id="address"
								value={formData.address}
								onChange={(e) =>
									setFormData({ ...formData, address: e.target.value })
								}
							/>
						</div>
					</div>
					<div className="flex justify-end pt-4">
						<Button
							type="button"
							variant="outline"
							className="mr-2"
							onClick={() => onOpenChange(false)}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Сохранение…" : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
