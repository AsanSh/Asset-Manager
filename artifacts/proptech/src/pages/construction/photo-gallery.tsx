import { useQuery } from "@tanstack/react-query";
import {
	Calendar,
	Download,
	Eye,
	Filter,
	Grid3x3,
	List,
	Upload,
	X,
	ZoomIn,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface Photo {
	id: number;
	projectId: number;
	stageId?: number;
	title: string;
	description?: string;
	url: string;
	thumbnailUrl?: string;
	uploadDate: string;
	tags?: string[];
}

interface Project {
	id: number;
	name: string;
}

interface Stage {
	id: number;
	name: string;
	projectId: number;
}

export default function PhotoGallery() {
	const [uploadDialog, setUploadDialog] = useState(false);
	const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [projectFilter, setProjectFilter] = useState<string>("all");
	const [stageFilter, setStageFilter] = useState<string>("all");

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: stages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages"],
		queryFn: () => api.get("/construction/stages").then((r) => r.data),
	});

	// Mock data (в реальном приложении из API)
	const mockPhotos: Photo[] = [
		{
			id: 1,
			projectId: 1,
			stageId: 1,
			title: "Фундамент - начало работ",
			description: "Заливка основания",
			url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800",
			thumbnailUrl:
				"https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
			uploadDate: "2026-01-15",
			tags: ["фундамент", "начало"],
		},
		{
			id: 2,
			projectId: 1,
			stageId: 2,
			title: "Монолитные работы",
			description: "Возведение каркаса",
			url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800",
			thumbnailUrl:
				"https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400",
			uploadDate: "2026-02-20",
			tags: ["монолит", "каркас"],
		},
		{
			id: 3,
			projectId: 1,
			stageId: 3,
			title: "Кровельные работы",
			description: "Монтаж кровли",
			url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
			thumbnailUrl:
				"https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400",
			uploadDate: "2026-03-10",
			tags: ["кровля"],
		},
		{
			id: 4,
			projectId: 1,
			stageId: 4,
			title: "Фасадные работы",
			description: "Утепление и отделка фасада",
			url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
			thumbnailUrl:
				"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400",
			uploadDate: "2026-04-05",
			tags: ["фасад", "утепление"],
		},
	];

	const filteredPhotos = mockPhotos.filter((photo) => {
		if (projectFilter !== "all" && String(photo.projectId) !== projectFilter)
			return false;
		if (stageFilter !== "all" && String(photo.stageId) !== stageFilter)
			return false;
		return true;
	});

	const filteredStages = stages.filter(
		(s: Stage) =>
			projectFilter === "all" || String(s.projectId) === projectFilter,
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-teal-50/20 p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-extrabold text-gray-900">
						Фотогалерея строительства
					</h1>
					<p className="text-gray-600 mt-2 text-lg">
						Визуальный контроль прогресса
					</p>
				</div>
				<Button
					onClick={() => setUploadDialog(true)}
					className="bg-gradient-to-r from-purple-600 to-teal-600 text-white gap-2 hover:shadow-lg transition-shadow h-12 px-6"
				>
					<Upload className="w-5 h-5" />
					Загрузить фото
				</Button>
			</div>

			{/* Filters */}
			<Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
				<div className="flex items-center gap-4 flex-wrap">
					<div className="flex items-center gap-2">
						<Filter className="w-4 h-4 text-gray-500" />
						<span className="text-sm font-medium text-gray-700">Фильтры:</span>
					</div>

					<Select value={projectFilter} onValueChange={setProjectFilter}>
						<SelectTrigger className="w-56">
							<SelectValue placeholder="Проект" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все проекты</SelectItem>
							{Array.isArray(projects) &&
								projects.map((p: Project) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.name}
									</SelectItem>
								))}
						</SelectContent>
					</Select>

					<Select value={stageFilter} onValueChange={setStageFilter}>
						<SelectTrigger className="w-56">
							<SelectValue placeholder="Этап" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все этапы</SelectItem>
							{filteredStages.map((s: Stage) => (
								<SelectItem key={s.id} value={String(s.id)}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="flex-1" />

					<div className="flex gap-2">
						<Button
							variant={viewMode === "grid" ? "default" : "outline"}
							size="sm"
							onClick={() => setViewMode("grid")}
						>
							<Grid3x3 className="w-4 h-4" />
						</Button>
						<Button
							variant={viewMode === "list" ? "default" : "outline"}
							size="sm"
							onClick={() => setViewMode("list")}
						>
							<List className="w-4 h-4" />
						</Button>
					</div>

					<Badge className="bg-blue-100 text-blue-700">
						{filteredPhotos.length} фото
					</Badge>
				</div>
			</Card>

			{/* Gallery */}
			{viewMode === "grid" ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{filteredPhotos.map((photo) => (
						<Card
							key={photo.id}
							className="group relative overflow-hidden rounded-2xl shadow-lg border-0 cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
							onClick={() => setSelectedPhoto(photo)}
						>
							<div className="aspect-square relative overflow-hidden bg-gradient-to-br from-purple-100 to-teal-100">
								<img
									src={photo.thumbnailUrl || photo.url}
									alt={photo.title}
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
									<Button
										size="sm"
										variant="secondary"
										className="rounded-full w-10 h-10 p-0 shadow-lg"
									>
										<ZoomIn className="w-4 h-4" />
									</Button>
								</div>
							</div>
							<div className="p-4">
								<h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
									{photo.title}
								</h3>
								<div className="flex items-center gap-2 text-xs text-gray-500">
									<Calendar className="w-3 h-3" />
									{new Date(photo.uploadDate).toLocaleDateString("ru-RU")}
								</div>
								{photo.tags && photo.tags.length > 0 && (
									<div className="flex gap-1 mt-3 flex-wrap">
										{photo.tags.slice(0, 2).map((tag, idx) => (
											<Badge key={idx} variant="secondary" className="text-xs">
												{tag}
											</Badge>
										))}
									</div>
								)}
							</div>
						</Card>
					))}
				</div>
			) : (
				<div className="space-y-4">
					{filteredPhotos.map((photo) => (
						<Card
							key={photo.id}
							className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur hover:shadow-xl transition-all cursor-pointer"
							onClick={() => setSelectedPhoto(photo)}
						>
							<div className="flex gap-6">
								<div className="w-40 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-teal-100 flex-shrink-0">
									<img
										src={photo.thumbnailUrl || photo.url}
										alt={photo.title}
										className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
									/>
								</div>
								<div className="flex-1">
									<div className="flex items-start justify-between mb-3">
										<div>
											<h3 className="text-xl font-bold text-gray-900 mb-2">
												{photo.title}
											</h3>
											<p className="text-gray-600">{photo.description}</p>
										</div>
										<Button size="sm" variant="outline" className="gap-2">
											<Eye className="w-4 h-4" />
											Открыть
										</Button>
									</div>
									<div className="flex items-center gap-4 text-sm text-gray-500">
										<div className="flex items-center gap-2">
											<Calendar className="w-4 h-4" />
											{new Date(photo.uploadDate).toLocaleDateString("ru-RU", {
												day: "numeric",
												month: "long",
												year: "numeric",
											})}
										</div>
									</div>
									{photo.tags && photo.tags.length > 0 && (
										<div className="flex gap-2 mt-3">
											{photo.tags.map((tag, idx) => (
												<Badge key={idx} variant="secondary">
													{tag}
												</Badge>
											))}
										</div>
									)}
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Lightbox */}
			{selectedPhoto && (
				<Dialog
					open={!!selectedPhoto}
					onOpenChange={() => setSelectedPhoto(null)}
				>
					<DialogContent className="max-w-6xl p-0">
						<div className="relative">
							<img
								src={selectedPhoto.url}
								alt={selectedPhoto.title}
								className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
							/>
							<Button
								size="sm"
								variant="secondary"
								className="absolute top-4 right-4 rounded-full w-10 h-10 p-0 shadow-lg"
								onClick={() => setSelectedPhoto(null)}
							>
								<X className="w-4 h-4" />
							</Button>
						</div>
						<div className="p-6">
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								{selectedPhoto.title}
							</h2>
							{selectedPhoto.description && (
								<p className="text-gray-600 mb-4">
									{selectedPhoto.description}
								</p>
							)}
							<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4" />
									{new Date(selectedPhoto.uploadDate).toLocaleDateString(
										"ru-RU",
										{
											day: "numeric",
											month: "long",
											year: "numeric",
										},
									)}
								</div>
							</div>
							{selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
								<div className="flex gap-2">
									{selectedPhoto.tags.map((tag, idx) => (
										<Badge key={idx} variant="secondary">
											{tag}
										</Badge>
									))}
								</div>
							)}
							<div className="mt-6">
								<Button className="bg-gradient-to-r from-purple-600 to-teal-600 text-white gap-2">
									<Download className="w-4 h-4" />
									Скачать оригинал
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Upload Dialog */}
			<Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Загрузить фото</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Проект *</Label>
							<Select>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Выберите проект" />
								</SelectTrigger>
								<SelectContent>
									{Array.isArray(projects) &&
										projects.map((p: Project) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Этап</Label>
							<Select>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Выберите этап" />
								</SelectTrigger>
								<SelectContent>
									{stages.map((s: Stage) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Название *</Label>
							<Input
								className="mt-1"
								placeholder="Например: Фундамент - начало работ"
							/>
						</div>
						<div>
							<Label>Описание</Label>
							<Input className="mt-1" placeholder="Краткое описание" />
						</div>
						<div>
							<Label>Файл *</Label>
							<div className="mt-1 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
								<Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
								<p className="text-sm text-gray-600">
									Перетащите файл или нажмите для выбора
								</p>
								<p className="text-xs text-gray-400 mt-1">PNG, JPG до 10MB</p>
							</div>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setUploadDialog(false)}>
								Отмена
							</Button>
							<Button className="bg-gradient-to-r from-purple-600 to-teal-600 text-white">
								Загрузить
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
