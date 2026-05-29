import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

export type PortalEntityType = "contractor" | "supplier" | "buyer";

const CREATE_ENDPOINTS: Record<PortalEntityType, string> = {
	contractor: "/portal/create-contractor-account",
	supplier: "/portal/create-supplier-account",
	buyer: "/portal/create-buyer-account",
};

const ID_FIELDS: Record<PortalEntityType, string> = {
	contractor: "contractorId",
	supplier: "supplierId",
	buyer: "buyerId",
};

const LABELS: Record<PortalEntityType, string> = {
	contractor: "подрядчика",
	supplier: "поставщика",
	buyer: "покупателя",
};

function splitName(fullName: string) {
	const parts = fullName.trim().split(/\s+/);
	return {
		firstName: parts[0] || "",
		lastName: parts.slice(1).join(" ") || "",
	};
}

interface PortalAccountPromptProps {
	open: boolean;
	onClose: () => void;
	entityType: PortalEntityType;
	entityId: number;
	entityName?: string;
	defaultPhone?: string;
	defaultEmail?: string;
}

export function PortalAccountPrompt({
	open,
	onClose,
	entityType,
	entityId,
	entityName,
	defaultPhone,
	defaultEmail,
}: PortalAccountPromptProps) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		phone: defaultPhone || "",
		email: defaultEmail || "",
		firstName: "",
		lastName: "",
	});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		const parts = splitName(entityName || "");
		setForm({
			phone: defaultPhone || "",
			email: defaultEmail || "",
			firstName: parts.firstName,
			lastName: parts.lastName,
		});
	}, [open, entityName, defaultPhone, defaultEmail, entityId]);

	const createAccount = async () => {
		if (!form.phone || !form.firstName || !form.lastName) {
			toast({ title: "Заполните телефон, имя и фамилию", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await api.post(CREATE_ENDPOINTS[entityType], {
				[ID_FIELDS[entityType]]: entityId,
				phone: form.phone,
				email: form.email || undefined,
				firstName: form.firstName,
				lastName: form.lastName,
			});
			toast({
				title: "Доступ создан",
				description: "Пользователь сможет войти по номеру телефона и SMS-коду",
			});
			onClose();
		} catch (e: unknown) {
			toast({
				title: getApiErrorMessage(e, "Не удалось создать доступ"),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="w-5 h-5 text-amber-600" />
						Доступ в портал {LABELS[entityType]}
					</DialogTitle>
					<DialogDescription>
						Для {entityName || "контрагента"} будет создан личный кабинет с входом по
						номеру телефона и SMS-коду.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Телефон *</Label>
						<Input
							className="mt-1"
							type="tel"
							placeholder="+996 700 123 456"
							value={form.phone}
							onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
						/>
						<p className="text-[10px] text-gray-400 mt-1">На этот номер придёт SMS-код для входа</p>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Имя *</Label>
							<Input
								className="mt-1"
								value={form.firstName}
								onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Фамилия *</Label>
							<Input
								className="mt-1"
								value={form.lastName}
								onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
							/>
						</div>
					</div>
					<div>
						<Label>Email (необязательно)</Label>
						<Input
							className="mt-1"
							type="email"
							value={form.email}
							onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
						/>
					</div>
					<div className="flex gap-2 pt-1">
						<Button variant="outline" className="flex-1" onClick={onClose}>
							Позже
						</Button>
						<Button
							className="flex-1 bg-amber-500 hover:bg-orange-600"
							onClick={() => void createAccount()}
							disabled={loading}
						>
							{loading ? "..." : "Создать доступ"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
