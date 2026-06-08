import { useQuery } from "@tanstack/react-query";
import { Bot, Camera, ClipboardList, Filter, Images, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type Project = { id: number; name: string };
type Stage = { id: number; name: string; projectId: number };
type Task = {
	id: number;
	title: string;
	projectId?: number | null;
	stageId?: number | null;
	status?: string | null;
	photoCount?: number | null;
	photosCount?: number | null;
};

function unwrap<T>(payload: unknown): T[] {
	if (Array.isArray(payload)) return payload as T[];
	if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) {
		return (payload as any).data;
	}
	if (payload && typeof payload === "object" && Array.isArray((payload as any).items)) {
		return (payload as any).items;
	}
	return [];
}

export default function PhotoGallery() {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const initialProject = params.get("projectId") || "all";
	const [projectFilter, setProjectFilter] = useState<string>(initialProject);
	const [stageFilter, setStageFilter] = useState<string>("all");

	const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => unwrap<Project>(r.data)),
	});

	const { data: stages = [], isLoading: stagesLoading } = useQuery<Stage[]>({
		queryKey: ["construction-stages"],
		queryFn: () => api.get("/construction/stages").then((r) => unwrap<Stage>(r.data)),
	});

	const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
		queryKey: ["construction-tasks-for-photo-gallery", projectFilter, stageFilter],
		queryFn: async () => {
			const query = new URLSearchParams();
			if (projectFilter !== "all") query.set("projectId", projectFilter);
			if (stageFilter !== "all") query.set("stageId", stageFilter);
			const suffix = query.toString() ? `?${query.toString()}` : "";
			const { data } = await api.get(`/construction/tasks${suffix}`);
			return unwrap<Task>(data);
		},
	});

	const filteredStages = useMemo(
		() => stages.filter((stage) => projectFilter === "all" || String(stage.projectId) === projectFilter),
		[stages, projectFilter],
	);

	const tasksWithPhotos = tasks.filter((task) => Number(task.photoCount ?? task.photosCount ?? 0) > 0);
	const isLoading = projectsLoading || stagesLoading || tasksLoading;

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
							Фотофиксация
						</div>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
							Фотоотчёты строительства
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-slate-500">
							Фото хранятся внутри задач: так снимок сразу связан с этапом WBS,
							ответственным и сроком.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link href="/construction/tasks">
							<Button className="gap-2 bg-slate-950 hover:bg-slate-800">
								<UploadCloud className="h-4 w-4" />
								Загрузить в задаче
							</Button>
						</Link>
						<Link href="/construction/ai/photo-report">
							<Button variant="outline" className="gap-2">
								<Bot className="h-4 w-4" />
								AI-анализ фото
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<Card className="rounded-3xl border-slate-200 shadow-sm">
				<CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center">
					<div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
						<Filter className="h-4 w-4" />
						Фильтр
					</div>
					<Select value={projectFilter} onValueChange={(value) => {
						setProjectFilter(value);
						setStageFilter("all");
					}}>
						<SelectTrigger className="w-full xl:w-72">
							<SelectValue placeholder="Проект" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все проекты</SelectItem>
							{projects.map((project) => (
								<SelectItem key={project.id} value={String(project.id)}>
									{project.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={stageFilter} onValueChange={setStageFilter}>
						<SelectTrigger className="w-full xl:w-72">
							<SelectValue placeholder="Этап" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все этапы</SelectItem>
							{filteredStages.map((stage) => (
								<SelectItem key={stage.id} value={String(stage.id)}>
									{stage.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Badge variant="outline" className="xl:ml-auto">
						{tasksWithPhotos.length} задач с фото
					</Badge>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-3">
				{[
					{ label: "Задач в выборке", value: tasks.length, icon: ClipboardList },
					{ label: "С фотоотчётами", value: tasksWithPhotos.length, icon: Images },
					{ label: "Без фото", value: Math.max(0, tasks.length - tasksWithPhotos.length), icon: Camera },
				].map((metric) => (
					<Card key={metric.label} className="rounded-3xl border-slate-200 shadow-sm">
						<CardContent className="flex items-start justify-between p-5">
							<div>
								<div className="text-sm text-slate-500">{metric.label}</div>
								{isLoading ? (
									<Skeleton className="mt-3 h-8 w-16" />
								) : (
									<div className="mt-2 text-3xl font-black text-slate-950">{metric.value}</div>
								)}
							</div>
							<div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
								<metric.icon className="h-5 w-5" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="rounded-3xl border-slate-200 shadow-sm">
				<CardContent className="p-5">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-lg font-bold text-slate-950">Задачи с фото</h2>
							<p className="text-sm text-slate-500">Откройте задачу, чтобы добавить или посмотреть фотографии.</p>
						</div>
					</div>
					<div className="space-y-3">
						{isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)}
						{!isLoading && tasksWithPhotos.length === 0 && (
							<div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
								<Camera className="mx-auto h-10 w-10 text-slate-300" />
								<div className="mt-3 text-lg font-bold text-slate-950">Фотоотчётов пока нет</div>
								<p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
									Откройте строительную задачу и добавьте фото в карточку задачи. Так фото не потеряется и будет связано с WBS.
								</p>
								<Link href="/construction/tasks">
									<Button className="mt-4">Перейти к задачам</Button>
								</Link>
							</div>
						)}
						{!isLoading && tasksWithPhotos.map((task) => (
							<Link key={task.id} href={`/construction/tasks/${task.id}`}>
								<div className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40">
									<div>
										<div className="font-semibold text-slate-950">{task.title}</div>
										<div className="text-sm text-slate-500">Статус: {task.status || "не указан"}</div>
									</div>
									<Badge className="bg-cyan-100 text-cyan-700">
										{Number(task.photoCount ?? task.photosCount ?? 0)} фото
									</Badge>
								</div>
							</Link>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
