import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

export const SYSTEM_ROLE_LABELS: Record<string, string> = {
	admin: "Администратор",
	super_admin: "Супер-Админ",
	company_admin: "Администратор компании",
	sales_manager: "Менеджер продаж",
	rental_manager: "Менеджер аренды",
	finance: "Финансы",
	staff: "Сотрудник",
	pto: "ПТО (управление площадями)",
	engineer: "Инженер ПТО",
};

export interface CompanyRole {
	id: number;
	name: string;
	isActive: boolean;
}

export function customRoleValue(id: number): string {
	return `custom_${id}`;
}

export function parseCustomRoleId(role: string): number | null {
	const match = /^custom_(\d+)$/.exec(role);
	return match ? parseInt(match[1], 10) : null;
}

export function resolveRoleLabel(
	role: string,
	customRoles?: CompanyRole[],
): string {
	if (SYSTEM_ROLE_LABELS[role]) return SYSTEM_ROLE_LABELS[role];
	const id = parseCustomRoleId(role);
	if (id && customRoles) {
		const found = customRoles.find((r) => r.id === id);
		if (found) return found.name;
	}
	return role;
}

export function useCompanyRoles() {
	return useQuery<CompanyRole[]>({
		queryKey: ["company-roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
	});
}

export function RoleSelect({
	value,
	onValueChange,
	className,
}: {
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}) {
	const { data: customRoles = [] } = useCompanyRoles();
	const activeCustom = customRoles.filter((r) => r.isActive !== false);

	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder="Выберите роль" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="company_admin">Администратор компании</SelectItem>
				<SelectItem value="sales_manager">Менеджер продаж</SelectItem>
				<SelectItem value="rental_manager">Менеджер аренды</SelectItem>
				<SelectItem value="finance">Финансы</SelectItem>
				<SelectItem value="pto">ПТО (управление площадями)</SelectItem>
				<SelectItem value="engineer">Инженер ПТО</SelectItem>
				<SelectItem value="staff">Сотрудник</SelectItem>
				{activeCustom.length > 0 && (
					<>
						{activeCustom.map((role) => (
							<SelectItem key={role.id} value={customRoleValue(role.id)}>
								{role.name}
							</SelectItem>
						))}
					</>
				)}
			</SelectContent>
		</Select>
	);
}
