import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
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

const ROLE_LABELS: Record<string, string> = {
	company_admin: "Админ компании",
	sales_manager: "Менеджер продаж",
	finance: "Финансы",
	rental_manager: "Менеджер аренды",
	staff: "Сотрудник",
};

export default function PlatformAdminCompanyDetail() {
	const [, params] = useRoute("/platform-admin/companies/:id");
	const id = params?.id;
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [saving, setSaving] = useState(false);
	const [resetLink, setResetLink] = useState<string | null>(null);
	const [resetEmail, setResetEmail] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["platform-admin-company", id],
		enabled: !!id,
		queryFn: () =>
			api
				.get<{
					company: {
						id: number;
						name: string;
						legalName?: string | null;
						bin?: string | null;
						phone?: string | null;
						email?: string | null;
						address?: string | null;
						isActive: boolean;
					};
					users: Array<{
						id: number;
						email: string;
						firstName: string;
						lastName: string;
						role: string;
						isActive: boolean;
					}>;
				}>(`/platform-admin/companies/${id}`)
				.then((r) => r.data),
	});

	const [form, setForm] = useState({
		name: "",
		legalName: "",
		bin: "",
		phone: "",
		email: "",
		address: "",
		isActive: true,
	});

	const company = data?.company;

	useEffect(() => {
		if (!company) return;
		setForm({
			name: company.name,
			legalName: company.legalName || "",
			bin: company.bin || "",
			phone: company.phone || "",
			email: company.email || "",
			address: company.address || "",
			isActive: company.isActive,
		});
	}, [company?.id]);

	async function saveCompany() {
		if (!id) return;
		setSaving(true);
		try {
			await api.patch(`/platform-admin/companies/${id}`, form);
			toast({ title: "Данные компании сохранены" });
			queryClient.invalidateQueries({ queryKey: ["platform-admin-company", id] });
			queryClient.invalidateQueries({ queryKey: ["platform-admin-companies"] });
			queryClient.invalidateQueries({ queryKey: ["platform-admin-dashboard"] });
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось сохранить",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}

	async function sendPasswordReset(userId: number, email: string) {
		if (
			!confirm(
				`Отправить ${email} ссылку для сброса пароля?`,
			)
		) {
			return;
		}
		try {
			const { data } = await api.post<{
				message: string;
				emailSent: boolean;
				resetLink: string;
			}>(`/platform-admin/users/${userId}/send-password-reset`);
			setResetEmail(email);
			setResetLink(data.resetLink);
			toast({
				title: data.emailSent ? "Письмо отправлено" : "Ссылка создана",
				description: data.message,
			});
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	async function toggleUser(userId: number, isActive: boolean) {
		try {
			await api.patch(`/platform-admin/users/${userId}`, { isActive });
			queryClient.invalidateQueries({ queryKey: ["platform-admin-company", id] });
			toast({ title: isActive ? "Пользователь активирован" : "Пользователь отключён" });
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	if (isLoading) {
		return <Skeleton className="h-96 w-full" />;
	}

	if (!company) {
		return <p className="text-muted-foreground">Компания не найдена</p>;
	}

	return (
		<div className="space-y-8">
			<Link
				href="/platform-admin/companies"
				className="inline-flex items-center gap-2 text-sm text-violet-600 hover:underline"
			>
				<ArrowLeft className="h-4 w-4" /> К списку компаний
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">{company.name}</h1>
					<p className="text-muted-foreground text-sm mt-1">ID: {company.id}</p>
				</div>
				<Badge variant={company.isActive ? "default" : "secondary"}>
					{company.isActive ? "Активна" : "Отключена"}
				</Badge>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-4 p-6 border rounded-xl bg-white">
					<h2 className="font-semibold">Данные организации</h2>
					<div className="space-y-3">
						<div>
							<Label>Название</Label>
							<Input
								className="mt-1"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Юридическое название</Label>
							<Input
								className="mt-1"
								value={form.legalName}
								onChange={(e) =>
									setForm((f) => ({ ...f, legalName: e.target.value }))
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>БИН</Label>
								<Input
									className="mt-1"
									value={form.bin}
									onChange={(e) => setForm((f) => ({ ...f, bin: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Телефон</Label>
								<Input
									className="mt-1"
									value={form.phone}
									onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
								/>
							</div>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								className="mt-1"
								value={form.email}
								onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Адрес</Label>
							<Input
								className="mt-1"
								value={form.address}
								onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
							/>
						</div>
						<div className="flex items-center gap-3 pt-2">
							<Switch
								checked={form.isActive}
								onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
							/>
							<Label>Компания активна</Label>
						</div>
					</div>
					<Button
						onClick={saveCompany}
						disabled={saving}
						className="bg-violet-600 hover:bg-violet-700"
					>
						{saving ? "Сохранение..." : "Сохранить"}
					</Button>
				</div>

				<div className="border rounded-xl bg-white overflow-hidden">
					<div className="p-4 border-b">
						<h2 className="font-semibold">
							Пользователи ({data?.users?.length ?? 0})
						</h2>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>ФИО</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Роль</TableHead>
								<TableHead>Активен</TableHead>
								<TableHead className="text-right">Действия</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{!data?.users?.length ? (
								<TableRow>
									<TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
										Нет пользователей
									</TableCell>
								</TableRow>
							) : (
								data.users.map((u) => (
									<TableRow key={u.id}>
										<TableCell>
											{u.firstName} {u.lastName}
										</TableCell>
										<TableCell className="text-sm">{u.email}</TableCell>
										<TableCell className="text-sm">
											{ROLE_LABELS[u.role] || u.role}
										</TableCell>
										<TableCell>
											<Switch
												checked={u.isActive}
												onCheckedChange={(v) => toggleUser(u.id, v)}
											/>
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="outline"
												size="sm"
												className="gap-1"
												onClick={() => sendPasswordReset(u.id, u.email)}
											>
												<KeyRound className="h-3.5 w-3.5" />
												Сброс пароля
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			<Dialog open={!!resetLink} onOpenChange={(o) => !o && setResetLink(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ссылка для сброса пароля</DialogTitle>
						<DialogDescription>
							Передайте ссылку пользователю {resetEmail}. Действует 1 час.
						</DialogDescription>
					</DialogHeader>
					<Input readOnly value={resetLink || ""} className="text-xs" />
					<Button
						onClick={() => {
							if (resetLink) navigator.clipboard.writeText(resetLink);
							toast({ title: "Скопировано" });
						}}
					>
						Копировать ссылку
					</Button>
				</DialogContent>
			</Dialog>
		</div>
	);
}
