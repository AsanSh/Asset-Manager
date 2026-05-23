import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getListPropertiesQueryKey,
	type Property,
	type PropertyStatus,
	type PropertyType,
	useCreateProperty,
	useDeleteProperty,
	useListProperties,
	useUpdateProperty,
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

export default function Properties() {
	const { data: properties, isLoading } = useListProperties({});
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingProperty, setEditingProperty] = useState<Property | null>(null);
	const deleteMutation = useDeleteProperty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	// Безопасное преобразование в массив
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const handleOpenCreate = () => {
		setEditingProperty(null);
		setIsDialogOpen(true);
	};

	const handleOpenEdit = (property: Property) => {
		setEditingProperty(property);
		setIsDialogOpen(true);
	};

	const handleDelete = (id: number) => {
		if (confirm("Are you sure you want to delete this property?")) {
			deleteMutation.mutate(
				{ id },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Property deleted" });
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Properties</h2>
					<p className="text-muted-foreground mt-2">
						Manage property registry.
					</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Property
				</Button>
			</div>

			<div className="border rounded-md bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Project</TableHead>
							<TableHead>Unit Number</TableHead>
							<TableHead>Type</TableHead>
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
										<Skeleton className="h-5 w-24" />
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
						) : propertiesArray.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									No properties found.
								</TableCell>
							</TableRow>
						) : (
							propertiesArray.map((property) => (
								<TableRow key={property.id}>
									<TableCell className="font-medium">
										{property.projectName}
									</TableCell>
									<TableCell>{property.unitNumber}</TableCell>
									<TableCell className="capitalize">{property.type}</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{property.status}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleOpenEdit(property)}
										>
											<Edit2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(property.id)}
											className="text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<PropertyDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				property={editingProperty}
			/>
		</div>
	);
}

function PropertyDialog({
	open,
	onOpenChange,
	property,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	property: Property | null;
}) {
	const isEditing = !!property;
	const createMutation = useCreateProperty();
	const updateMutation = useUpdateProperty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		projectName: "",
		unitNumber: "",
		type: "apartment" as PropertyType,
		status: "available" as PropertyStatus,
		block: "",
		floor: "",
		area: "",
		comment: "",
	});

	useEffect(() => {
		if (property && open) {
			setFormData({
				projectName: property.projectName,
				unitNumber: property.unitNumber,
				type: property.type as PropertyType,
				status: property.status as PropertyStatus,
				block: property.block || "",
				floor: property.floor?.toString() || "",
				area: property.area?.toString() || "",
				comment: property.comment || "",
			});
		} else if (!property && open) {
			setFormData({
				projectName: "",
				unitNumber: "",
				type: "apartment" as PropertyType,
				status: "available" as PropertyStatus,
				block: "",
				floor: "",
				area: "",
				comment: "",
			});
		}
	}, [property, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const payload = {
			...formData,
			floor: formData.floor ? parseInt(formData.floor, 10) : undefined,
			area: formData.area ? parseFloat(formData.area) : undefined,
		};

		if (isEditing && property) {
			updateMutation.mutate(
				{ id: property.id, data: payload },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Property updated" });
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
				{ data: payload },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Property created" });
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
						{isEditing ? "Edit Property" : "Add Property"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-4">
					<div className="grid gap-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="projectName">Project Name *</Label>
								<Input
									id="projectName"
									required
									value={formData.projectName}
									onChange={(e) =>
										setFormData({ ...formData, projectName: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="unitNumber">Unit Number *</Label>
								<Input
									id="unitNumber"
									required
									value={formData.unitNumber}
									onChange={(e) =>
										setFormData({ ...formData, unitNumber: e.target.value })
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="type">Type *</Label>
								<Select
									value={formData.type}
									onValueChange={(val: any) =>
										setFormData({ ...formData, type: val })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="apartment">Apartment</SelectItem>
										<SelectItem value="office">Office</SelectItem>
										<SelectItem value="commercial">Commercial</SelectItem>
										<SelectItem value="parking">Parking</SelectItem>
										<SelectItem value="storage">Storage</SelectItem>
										<SelectItem value="house">House</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="status">Status *</Label>
								<Select
									value={formData.status}
									onValueChange={(val: any) =>
										setFormData({ ...formData, status: val })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Available</SelectItem>
										<SelectItem value="sold">Sold</SelectItem>
										<SelectItem value="reserved">Reserved</SelectItem>
										<SelectItem value="rented">Rented</SelectItem>
										<SelectItem value="on_lease">On Lease</SelectItem>
										<SelectItem value="archived">Archived</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="block">Block</Label>
								<Input
									id="block"
									value={formData.block}
									onChange={(e) =>
										setFormData({ ...formData, block: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="floor">Floor</Label>
								<Input
									id="floor"
									type="number"
									value={formData.floor}
									onChange={(e) =>
										setFormData({ ...formData, floor: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="area">Area (sqm)</Label>
								<Input
									id="area"
									type="number"
									step="0.01"
									value={formData.area}
									onChange={(e) =>
										setFormData({ ...formData, area: e.target.value })
									}
								/>
							</div>
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
							{isPending ? "Saving..." : "Save Property"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
