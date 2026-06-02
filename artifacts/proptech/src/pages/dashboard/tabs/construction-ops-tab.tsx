import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRight,
	CheckSquare,
	Flag,
	Map,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
	planning: { label: "Планирование", className: "bg-slate-100 text-slate-700" },
	active: { label: "В работе", className: "bg-emerald-100 text-emerald-800" },
	completed: { label: "Завершён", className: "bg-blue-100 text-blue-800" },
	paused: { label: "Пауза", className: "bg-amber-100 text-amber-800" },
};

export default function ConstructionOpsDashboardTab() {
	const { data: projects = [], isLoading: loadingProjects } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: tasks = [] } = useQuery({
		queryKey: ["construction-tasks"],
		queryFn: () => api.get("/construction/tasks").then((r) => r.data),
	});

	const projectsArray = Array.isArray(projects) ? projects : [];
	const tasksArray = Array.isArray(tasks) ? tasks : [];
	const today = new Date().toISOString().slice(0, 10);
	const tasksOverdue = tasksArray.filter(
		(t: { dueDate?: string; status?: string }) =>
			t.dueDate &&
			t.dueDate.slice(0, 10) < today &&
			t.status !== "done",
	);
	const tasksActive = tasksArray.filter(
		(t: { status?: string }) => t.status === "todo" || t.status === "in_progress",
	);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div className="bg-white rounded-xl border p-4">
					<Map className="w-4 h-4 text-orange-600 mb-2" />
					{loadingProjects ? (
						<Skeleton className="h-7 w-12" />
					) : (
						<p className="text-2xl font-bold">{projectsArray.length}</p>
					)}
					<p className="text-xs text-gray-500">Проектов</p>
				</div>
				<div className="bg-white rounded-xl border p-4">
					<CheckSquare className="w-4 h-4 text-blue-600 mb-2" />
					<p className="text-2xl font-bold">{tasksActive.length}</p>
					<p className="text-xs text-gray-500">Задач в работе</p>
				</div>
				<div className="bg-white rounded-xl border p-4">
					<AlertCircle className="w-4 h-4 text-rose-600 mb-2" />
					<p className="text-2xl font-bold text-rose-600">{tasksOverdue.length}</p>
					<p className="text-xs text-gray-500">Просрочено</p>
				</div>
				<div className="bg-white rounded-xl border p-4">
					<Flag className="w-4 h-4 text-amber-600 mb-2" />
					<Link href="/construction/stages" className="text-sm font-medium text-amber-600 hover:underline">
						План проекта (WBS) →
					</Link>
					<p className="text-xs text-gray-500 mt-2">План / факт</p>
				</div>
			</div>

			{tasksOverdue.length > 0 && (
				<div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
					<p className="text-sm font-semibold text-rose-800 mb-2">Просроченные задачи</p>
					<ul className="space-y-1.5">
						{tasksOverdue.slice(0, 5).map((t: { id: number; title: string }) => (
							<li key={t.id} className="text-sm text-rose-700 flex items-center gap-2">
								<AlertCircle className="w-3.5 h-3.5 shrink-0" />
								<Link href={`/construction/tasks/${t.id}`} className="hover:underline truncate">
									{t.title}
								</Link>
							</li>
						))}
					</ul>
					<Link href="/construction/tasks" className="text-xs text-rose-600 mt-2 inline-flex items-center gap-1">
						Все задачи <ArrowRight className="w-3 h-3" />
					</Link>
				</div>
			)}

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-gray-900">Проекты</h2>
					<Link href="/construction/projects" className="text-xs text-amber-600 hover:underline">
						Все проекты →
					</Link>
				</div>
				{loadingProjects ? (
					<Skeleton className="h-32 rounded-xl" />
				) : projectsArray.length === 0 ? (
					<p className="text-sm text-gray-400 py-6 text-center">Нет проектов</p>
				) : (
					<div className="grid gap-2">
						{projectsArray.slice(0, 8).map((p: { id: number; name: string; status?: string }) => {
							const st =
								PROJECT_STATUS[p.status || ""] || PROJECT_STATUS.planning;
							return (
								<Link key={p.id} href="/construction/projects">
									<div className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:border-amber-200 transition-colors">
										<span className="font-medium text-gray-900 truncate">{p.name}</span>
										<Badge variant="outline" className={`text-[10px] ${st.className}`}>
											{st.label}
										</Badge>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>

			<div className="flex flex-wrap gap-2 text-sm">
				<Link href="/construction/chess" className="text-amber-600 hover:underline">
					Шахматка
				</Link>
				<span className="text-gray-300">·</span>
				<Link href="/construction/contractors" className="text-amber-600 hover:underline">
					Подрядчики
				</Link>
				<span className="text-gray-300">·</span>
				<Link href="/construction/tasks" className="text-amber-600 hover:underline">
					Задачи
				</Link>
			</div>
		</div>
	);
}
