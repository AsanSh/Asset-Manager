import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CheckSquare, Clock, ExternalLink, ShieldCheck, User, XCircle } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

type SupplyRequest = {
	id: number;
	projectId?: number | null;
	status: string;
	priority?: string | null;
	neededByDate?: string | null;
	notes?: string | null;
	createdAt?: string | null;
	requestedByName?: string | null;
	items?: Array<{
		id: number;
		customName?: string | null;
		productName?: string | null;
		quantity?: string | number | null;
		unit?: string | null;
	}>;
};

type Project = { id: number; name: string };

const STATUS_LABELS: Record<string, string> = {
	pending: "На согласовании",
	approved: "Согласовано",
	rejected: "Отклонено",
	ordered: "В заказе",
	cancelled: "Отменено",
};

const STATUS_CLASS: Record<string, string> = {
	pending: "bg-amber-100 text-amber-700 border-amber-200",
	approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
	rejected: "bg-rose-100 text-rose-700 border-rose-200",
	ordered: "bg-blue-100 text-blue-700 border-blue-200",
	cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDate(date?: string | null) {
	return date ? new Date(date).toLocaleDateString("ru-RU") : "—";
}

function requestTitle(request: SupplyRequest) {
	const firstItem = request.items?.[0];
	const firstName = firstItem?.productName || firstItem?.customName;
	if (firstName) {
		const suffix = request.items && request.items.length > 1 ? ` +${request.items.length - 1}` : "";
		return `${firstName}${suffix}`;
	}
	return request.notes?.trim() || `Заявка #${request.id}`;
}

function routeSteps(status: string) {
	if (status === "approved" || status === "ordered") return 2;
	if (status === "rejected") return 1;
	return 1;
}

export default function ConstructionApprovals() {
	const { toast } = useToast();
	const qc = useQueryClient();

	const { data: requests = [], isLoading } = useQuery<SupplyRequest[]>({
		queryKey: ["supply-requests"],
		queryFn: () => api.get("/supply/requests").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-for-planning-approvals"],
		queryFn: async () => {
			const { data } = await api.get<any>("/construction/projects");
			return Array.isArray(data) ? data : data?.items ?? [];
		},
	});

	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((project) => [Number(project.id), project.name])),
		[projects],
	);

	const approvalMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
			api.post(`/supply/requests/${id}/approvals`, { status }),
		onSuccess: () => {
			toast({ title: "Решение сохранено" });
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
			qc.invalidateQueries({ queryKey: ["supply-requests-approvals"] });
		},
		onError: (error) =>
			toast({
				title: "Не удалось сохранить решение",
				description: getApiErrorMessage(error),
				variant: "destructive",
			}),
	});

	const pending = requests.filter((request) => request.status === "pending");
	const approved = requests.filter((request) => request.status === "approved" || request.status === "ordered");
	const rejected = requests.filter((request) => request.status === "rejected");

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
							Контроль решений
						</div>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
							Согласование заявок
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-slate-500">
							Рабочий реестр заявок снабжения: прораб создает потребность, финансы
							согласуют, снабжение переводит в заказ.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link href="/warehouse/requests">
							<Button className="gap-2 bg-amber-500 hover:bg-orange-600">
								<CheckSquare className="h-4 w-4" />
								Новая заявка
							</Button>
						</Link>
						<Link href="/warehouse/approvals">
							<Button variant="outline" className="gap-2">
								<ExternalLink className="h-4 w-4" />
								Детальный журнал
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<div className="grid gap-4 sm:grid-cols-3">
				{[
					{ label: "На согласовании", value: pending.length, tone: "text-amber-700 bg-amber-50", icon: Clock },
					{ label: "Согласовано", value: approved.length, tone: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
					{ label: "Отклонено", value: rejected.length, tone: "text-rose-700 bg-rose-50", icon: XCircle },
				].map((metric) => (
					<Card key={metric.label} className="rounded-3xl border-slate-200 shadow-sm">
						<CardContent className="p-5">
							<div className="flex items-start justify-between">
								<div>
									<div className="text-sm text-slate-500">{metric.label}</div>
									{isLoading ? (
										<Skeleton className="mt-3 h-8 w-16" />
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

			<div className="space-y-3">
				{isLoading &&
					Array.from({ length: 3 }).map((_, index) => (
						<Skeleton key={index} className="h-36 rounded-3xl" />
					))}

				{!isLoading && requests.length === 0 && (
					<Card className="rounded-3xl border-dashed border-slate-200 shadow-sm">
						<CardContent className="flex flex-col items-center gap-3 p-10 text-center">
							<ShieldCheck className="h-10 w-10 text-slate-300" />
							<div className="text-lg font-bold text-slate-950">Заявок на согласование нет</div>
							<p className="max-w-md text-sm text-slate-500">
								Создайте заявку снабжения из задач, материалов или раздела заявок.
							</p>
							<Link href="/warehouse/requests">
								<Button>Создать заявку</Button>
							</Link>
						</CardContent>
					</Card>
				)}

				{!isLoading &&
					requests.map((request) => {
						const step = routeSteps(request.status);
						const steps = ["Прораб", "Финансы", "Снабжение"];
						return (
							<Card key={request.id} className="rounded-3xl border-slate-200 shadow-sm">
								<CardContent className="p-5">
									<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
										<div className="min-w-0">
											<div className="text-lg font-bold text-slate-950">{requestTitle(request)}</div>
											<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
												<User className="h-4 w-4" />
												{request.requestedByName || "Инициатор не указан"}
												<span>·</span>
												{projectMap[Number(request.projectId)] || "Проект не указан"}
												<span>·</span>
												{formatDate(request.createdAt)}
											</div>
										</div>
										<Badge variant="outline" className={STATUS_CLASS[request.status] || STATUS_CLASS.cancelled}>
											{STATUS_LABELS[request.status] || request.status}
										</Badge>
									</div>

									<div className="mt-5 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
										{steps.map((label, index) => {
											const isRejected = request.status === "rejected" && index === step;
											const isDone = index < step && request.status !== "rejected";
											const isCurrent = request.status === "pending" && index === step;
											return (
												<div key={label} className="contents">
													<div
														className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
															isRejected
																? "border-rose-200 bg-rose-50 text-rose-700"
																: isDone
																	? "border-emerald-200 bg-emerald-50 text-emerald-700"
																	: isCurrent
																		? "border-amber-200 bg-amber-50 text-amber-700"
																		: "border-slate-200 bg-slate-50 text-slate-500"
														}`}
													>
														{label}
													</div>
													{index < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-slate-300 lg:block" />}
												</div>
											);
										})}
									</div>

									{request.status === "pending" && (
										<div className="mt-5 flex justify-end gap-2">
											<Button
												variant="outline"
												className="border-rose-200 text-rose-600 hover:bg-rose-50"
												disabled={approvalMut.isPending}
												onClick={() => approvalMut.mutate({ id: request.id, status: "rejected" })}
											>
												Отклонить
											</Button>
											<Button
												className="bg-emerald-600 hover:bg-emerald-700"
												disabled={approvalMut.isPending}
												onClick={() => approvalMut.mutate({ id: request.id, status: "approved" })}
											>
												Согласовать
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})}
			</div>
		</div>
	);
}
