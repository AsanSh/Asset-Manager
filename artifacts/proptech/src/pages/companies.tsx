import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Companies</h2>
					<p className="text-muted-foreground mt-2">
						Manage operating companies and legal entities.
					</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Company
				</Button>
			</div>

			<div className="border rounded-md bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Legal Name</TableHead>
							<TableHead>BIN</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-5 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="h-8 w-8 inline-block" />
									</TableCell>
								</TableRow>
							))
						) : !companies || companies.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									No companies found. Create one to get started.
								</TableCell>
							</TableRow>
						) : (
							(Array.isArray(companies) ? companies : []).map((company) => (
								<TableRow key={company.id}>
									<TableCell className="font-medium">{company.name}</TableCell>
									<TableCell>{company.legalName || "-"}</TableCell>
									<TableCell>{company.bin || "-"}</TableCell>
									<TableCell>
										<Badge variant={company.isActive ? "default" : "secondary"}>
											{company.isActive ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleOpenEdit(company)}
										>
											<Edit2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
						toast({ title: "Company updated" });
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Error",
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
						toast({ title: "Company created" });
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Error",
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
						{isEditing ? "Edit Company" : "Add Company"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-4">
					<div className="grid gap-4">
						<div className="space-y-2">
							<Label htmlFor="name">Display Name *</Label>
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
							<Label htmlFor="legalName">Legal Name</Label>
							<Input
								id="legalName"
								value={formData.legalName}
								onChange={(e) =>
									setFormData({ ...formData, legalName: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="bin">BIN (Business ID)</Label>
								<Input
									id="bin"
									value={formData.bin}
									onChange={(e) =>
										setFormData({ ...formData, bin: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone">Phone</Label>
								<Input
									id="phone"
									value={formData.phone}
									onChange={(e) =>
										setFormData({ ...formData, phone: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
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
							<Label htmlFor="address">Address</Label>
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
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save Company"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
