import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

interface PlatformCompany {
	id: number;
	name: string;
	legalName?: string | null;
	bin?: string | null;
	email?: string | null;
	phone?: string | null;
	isActive: boolean;
	createdAt: string;
	usersCount: number;
}

export default function PlatformAdminCompanies() {
	const [search, setSearch] = useState("");
	const { data: companies = [], isLoading } = useQuery({
		queryKey: ["platform-admin-companies"],
		queryFn: () =>
			api
				.get<PlatformCompany[]>("/platform-admin/companies")
				.then((r) => r.data),
	});

	const filtered = companies.filter(
		(c) =>
			!search ||
			c.name.toLowerCase().includes(search.toLowerCase()) ||
			c.email?.toLowerCase().includes(search.toLowerCase()) ||
			c.bin?.includes(search),
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Зарегистрированные компании
					</h1>
					<p className="text-muted-foreground mt-1">
						Всего: <strong>{companies.length}</strong>
						{search && ` · показано: ${filtered.length}`}
					</p>
				</div>
			</div>

			<div className="relative max-w-md">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					className="pl-9"
					placeholder="Поиск по названию, email, БИН..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			<div className="border rounded-xl bg-white overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Компания</TableHead>
							<TableHead>БИН</TableHead>
							<TableHead>Контакты</TableHead>
							<TableHead>Сотрудников</TableHead>
							<TableHead>Регистрация</TableHead>
							<TableHead>Статус</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={6}>
										<Skeleton className="h-8 w-full" />
									</TableCell>
								</TableRow>
							))
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center py-12 text-muted-foreground"
								>
									<Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
									Компании не найдены
								</TableCell>
							</TableRow>
						) : (
							filtered.map((c) => (
								<TableRow key={c.id}>
									<TableCell>
										<Link
											href={`/platform-admin/companies/${c.id}`}
											className="font-medium text-violet-700 hover:underline"
										>
											{c.name}
										</Link>
										{c.legalName && (
											<p className="text-xs text-muted-foreground">
												{c.legalName}
											</p>
										)}
									</TableCell>
									<TableCell>{c.bin || "—"}</TableCell>
									<TableCell className="text-sm">
										{c.email || "—"}
										{c.phone && (
											<p className="text-xs text-muted-foreground">{c.phone}</p>
										)}
									</TableCell>
									<TableCell>{c.usersCount}</TableCell>
									<TableCell className="text-sm">
										{new Date(c.createdAt).toLocaleDateString("ru-RU")}
									</TableCell>
									<TableCell>
										<Badge variant={c.isActive ? "default" : "secondary"}>
											{c.isActive ? "Активна" : "Отключена"}
										</Badge>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
