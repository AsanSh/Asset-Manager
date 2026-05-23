import { useQuery } from "@tanstack/react-query";
import { Building2, Users, UserCheck, UserX } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface DashboardData {
	stats: {
		companiesTotal: number;
		companiesActive: number;
		companiesInactive: number;
		usersTotal: number;
		avgUsersPerCompany: number;
	};
	recentCompanies: Array<{
		id: number;
		name: string;
		email?: string | null;
		createdAt: string;
		isActive: boolean;
	}>;
}

function StatCard({
	label,
	value,
	icon: Icon,
	sub,
}: {
	label: string;
	value: number | string;
	icon: typeof Building2;
	sub?: string;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{label}
				</CardTitle>
				<Icon className="h-4 w-4 text-violet-600" />
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold">{value}</p>
				{sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
			</CardContent>
		</Card>
	);
}

export default function PlatformAdminDashboard() {
	const { data, isLoading } = useQuery({
		queryKey: ["platform-admin-dashboard"],
		queryFn: () =>
			api.get<DashboardData>("/platform-admin/dashboard").then((r) => r.data),
	});

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28" />
					))}
				</div>
			</div>
		);
	}

	const stats = data?.stats;

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Админ-панель платформы</h1>
				<p className="text-muted-foreground mt-1">
					Управление всеми зарегистрированными компаниями и пользователями
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Компаний зарегистрировано"
					value={stats?.companiesTotal ?? 0}
					icon={Building2}
				/>
				<StatCard
					label="Активных компаний"
					value={stats?.companiesActive ?? 0}
					icon={UserCheck}
					sub={`Неактивных: ${stats?.companiesInactive ?? 0}`}
				/>
				<StatCard
					label="Пользователей"
					value={stats?.usersTotal ?? 0}
					icon={Users}
					sub={`~${stats?.avgUsersPerCompany ?? 0} на компанию`}
				/>
				<StatCard
					label="Неактивных компаний"
					value={stats?.companiesInactive ?? 0}
					icon={UserX}
				/>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Последние регистрации</CardTitle>
					<Link
						href="/platform-admin/companies"
						className="text-sm text-violet-600 hover:underline"
					>
						Все компании →
					</Link>
				</CardHeader>
				<CardContent>
					{!data?.recentCompanies?.length ? (
						<p className="text-muted-foreground text-sm">Пока нет компаний</p>
					) : (
						<ul className="divide-y">
							{data.recentCompanies.map((c) => (
								<li
									key={c.id}
									className="py-3 flex items-center justify-between gap-4"
								>
									<div>
										<Link
											href={`/platform-admin/companies/${c.id}`}
											className="font-medium hover:text-violet-600"
										>
											{c.name}
										</Link>
										<p className="text-xs text-muted-foreground">
											{c.email || "—"} ·{" "}
											{new Date(c.createdAt).toLocaleDateString("ru-RU")}
										</p>
									</div>
									<Badge variant={c.isActive ? "default" : "secondary"}>
										{c.isActive ? "Активна" : "Отключена"}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
