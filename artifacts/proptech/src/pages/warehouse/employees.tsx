import { useQuery } from "@tanstack/react-query";
import { Briefcase, LockKeyhole, Mail, Plus, Search, ShieldCheck, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type CompanyUser = {
	id: number;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	role?: string | null;
	isActive?: boolean | null;
	modules?: string[] | null;
};

const ROLE_LABELS: Record<string, string> = {
	admin: "Администратор",
	company_admin: "Администратор компании",
	manager: "Менеджер",
	accountant: "Бухгалтер",
	employee: "Сотрудник",
};

function userName(user: CompanyUser) {
	const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return full || user.email || `Пользователь #${user.id}`;
}

function hasWarehouseAccess(user: CompanyUser) {
	if (user.role === "admin" || user.role === "company_admin") return true;
	return Array.isArray(user.modules) && user.modules.includes("warehouse");
}

export default function WarehouseEmployees() {
	const [search, setSearch] = useState("");

	const { data: rawUsers = [], isLoading } = useQuery<CompanyUser[]>({
		queryKey: ["users"],
		queryFn: () => api.get("/users").then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
	});

	const users = useMemo(
		() =>
			rawUsers
				.filter(hasWarehouseAccess)
				.filter((user) => {
					const haystack = `${userName(user)} ${user.email ?? ""} ${user.role ?? ""}`.toLowerCase();
					return haystack.includes(search.toLowerCase());
				}),
		[rawUsers, search],
	);

	const activeCount = users.filter((user) => user.isActive !== false).length;
	const adminsCount = users.filter((user) => user.role === "admin" || user.role === "company_admin").length;

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
							Доступ снабжения
						</div>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
							Сотрудники склада
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-slate-500">
							Список строится из реальных пользователей компании с доступом к модулю
							снабжения. Новые сотрудники создаются в общем разделе пользователей.
						</p>
					</div>
					<Link href="/users">
						<Button className="gap-2 bg-slate-950 hover:bg-slate-800">
							<Plus className="h-4 w-4" />
							Открыть пользователей
						</Button>
					</Link>
				</div>
			</section>

			<div className="grid gap-4 md:grid-cols-3">
				{[
					{ label: "С доступом", value: users.length, icon: ShieldCheck, tone: "bg-cyan-50 text-cyan-700" },
					{ label: "Активные", value: activeCount, icon: UserCircle, tone: "bg-emerald-50 text-emerald-700" },
					{ label: "Администраторы", value: adminsCount, icon: LockKeyhole, tone: "bg-blue-50 text-blue-700" },
				].map((metric) => (
					<Card key={metric.label} className="rounded-3xl border-slate-200 shadow-sm">
						<CardContent className="p-5">
							<div className="flex items-start justify-between">
								<div>
									<div className="text-sm text-slate-500">{metric.label}</div>
									{isLoading ? (
										<Skeleton className="mt-3 h-8 w-20" />
									) : (
										<div className="mt-2 text-3xl font-black text-slate-950">{metric.value}</div>
									)}
								</div>
								<div className={`rounded-2xl p-3 ${metric.tone}`}>
									<metric.icon className="h-5 w-5" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="rounded-3xl border-slate-200 shadow-sm">
				<CardContent className="p-5">
					<div className="relative max-w-xl">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input
							placeholder="Поиск по имени, email или роли..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{isLoading &&
					Array.from({ length: 6 }).map((_, index) => (
						<Skeleton key={index} className="h-48 rounded-3xl" />
					))}
				{!isLoading &&
					users.map((user) => (
						<Card key={user.id} className="rounded-3xl border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
							<CardContent className="p-5">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-700 text-white">
										<UserCircle className="h-7 w-7" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate text-lg font-bold text-slate-950">{userName(user)}</div>
										<div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
											<Mail className="h-4 w-4" />
											<span className="truncate">{user.email || "email не указан"}</span>
										</div>
									</div>
									<Badge className={user.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>
										{user.isActive === false ? "Отключен" : "Активен"}
									</Badge>
								</div>
								<div className="mt-5 rounded-2xl bg-slate-50 p-4">
									<div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
										<Briefcase className="h-4 w-4" />
										Роль
									</div>
									<div className="font-semibold text-slate-900">
										{ROLE_LABELS[user.role || ""] || user.role || "Не назначена"}
									</div>
								</div>
								<div className="mt-4 flex gap-2">
									<Link href="/users" className="flex-1">
										<Button variant="outline" className="w-full">Редактировать</Button>
									</Link>
									<Link href="/users" className="flex-1">
										<Button variant="outline" className="w-full">Права доступа</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}
			</div>

			{!isLoading && users.length === 0 && (
				<Card className="rounded-3xl border-dashed border-slate-200 shadow-sm">
					<CardContent className="flex flex-col items-center gap-3 p-10 text-center">
						<UserCircle className="h-10 w-10 text-slate-300" />
						<div className="text-lg font-bold text-slate-950">Нет пользователей с доступом к складу</div>
						<p className="max-w-md text-sm text-slate-500">
							Откройте пользователей, назначьте роль или модуль снабжения, и сотрудник появится здесь.
						</p>
						<Link href="/users">
							<Button className="mt-2">Настроить доступ</Button>
						</Link>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
