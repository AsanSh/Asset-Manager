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

function generatePassword() {
	return `${Math.random().toString(36).slice(2, 8)}A1!`;
}

interface PortalAccountPromptProps {
	open: boolean;
	onClose: () => void;
	entityType: PortalEntityType;
	entityId: number;
	entityName?: string;
	defaultEmail?: string;
}

export function PortalAccountPrompt({
	open,
	onClose,
	entityType,
	entityId,
	entityName,
	defaultEmail,
}: PortalAccountPromptProps) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		email: defaultEmail || "",
		firstName: "",
		lastName: "",
		password: generatePassword(),
	});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		const parts = splitName(entityName || "");
		setForm({
			email: defaultEmail || "",
			firstName: parts.firstName,
			lastName: parts.lastName,
			password: generatePassword(),
		});
	}, [open, entityName, defaultEmail, entityId]);

	const createAccount = async () => {
		if (!form.email || !form.firstName || !form.lastName || !form.password) {
			toast({ title: "Заполните все поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await api.post(CREATE_ENDPOINTS[entityType], {
				[ID_FIELDS[entityType]]: entityId,
				email: form.email,
				firstName: form.firstName,
				lastName: form.lastName,
				password: form.password,
			});
			toast({
				title: "Доступ в портал создан",
				description: `Пароль: ${form.password}`,
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
						Договор загружен. Для {entityName || "контрагента"} рекомендуется
						создать личный кабинет.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Email</Label>
						<Input
							className="mt-1"
							type="email"
							value={form.email}
							onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Имя</Label>
							<Input
								className="mt-1"
								value={form.firstName}
								onChange={(e) =>
									setForm((p) => ({ ...p, firstName: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label>Фамилия</Label>
							<Input
								className="mt-1"
								value={form.lastName}
								onChange={(e) =>
									setForm((p) => ({ ...p, lastName: e.target.value }))
								}
							/>
						</div>
					</div>
					<div>
						<Label>Пароль</Label>
						<Input
							className="mt-1"
							value={form.password}
							onChange={(e) =>
								setForm((p) => ({ ...p, password: e.target.value }))
							}
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
