import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { TaskPhoto, TaskPhotoType } from "../types";
import { taskKeys, fetchTaskPhotos } from "../api";

const PHOTO_TYPE_LABELS: Record<TaskPhotoType, string> = {
	before: "Фото до",
	progress: "Фото процесса",
	after: "Фото после",
};

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			const base64 = result.includes(",") ? result.split(",")[1] : result;
			resolve(base64);
		};
		reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
		reader.readAsDataURL(file);
	});
}

async function fileListToUploadPayload(files: FileList): Promise<
	Array<{ fileName: string; mimeType: string; base64: string }>
> {
	const arr = Array.from(files);
	return Promise.all(
		arr.map(async (f) => ({
			fileName: f.name,
			mimeType: f.type || "image/jpeg",
			base64: await fileToBase64(f),
		})),
	);
}

export function TaskPhotosSection({ taskId }: { taskId: number }) {
	const qc = useQueryClient();
	const { toast } = useToast();
	const inputRefs = {
		before: useRef<HTMLInputElement | null>(null),
		progress: useRef<HTMLInputElement | null>(null),
		after: useRef<HTMLInputElement | null>(null),
	} as const;

	const [uploadingType, setUploadingType] = useState<TaskPhotoType | null>(
		null,
	);

	const { data: photos = [], isLoading } = useQuery({
		queryKey: taskKeys.photos(taskId),
		queryFn: () => fetchTaskPhotos(taskId),
	});

	const grouped = useMemo(() => {
		const g: Record<TaskPhotoType, TaskPhoto[]> = {
			before: [],
			progress: [],
			after: [],
		};
		for (const p of photos) {
			g[p.photoType].push(p);
		}
		return g;
	}, [photos]);

	const triggerPick = (type: TaskPhotoType) => inputRefs[type].current?.click();

	const onPick = async (type: TaskPhotoType, files: FileList | null) => {
		if (!files || files.length === 0) return;
		setUploadingType(type);
		try {
			// Ограничение UI: до 10 фото за раз
			const selected = Array.from(files).slice(0, 10);
			const payloadFiles = await Promise.all(
				selected.map(async (f) => ({
					fileName: f.name,
					mimeType: f.type || "image/jpeg",
					base64: await fileToBase64(f),
				})),
			);

			await api.post(`/construction/tasks/${taskId}/photos`, {
				photoType: type,
				photos: payloadFiles,
			});

			toast({ title: "Фото загружены" });
			await qc.invalidateQueries({ queryKey: taskKeys.photos(taskId) });
		} catch (e) {
			toast({
				title: "Ошибка загрузки фото",
				description: e instanceof Error ? e.message : undefined,
				variant: "destructive",
			});
		} finally {
			setUploadingType(null);
			if (inputRefs[type].current) inputRefs[type].current.value = "";
		}
	};

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-gray-900">Фотоотчёт</h3>
				{isLoading ? (
					<Loader2 className="w-4 h-4 animate-spin text-gray-600" />
				) : (
					<span className="text-xs text-gray-600">
						{photos.length} фото
					</span>
				)}
			</div>

			<div className="space-y-4">
				{(["before", "progress", "after"] as TaskPhotoType[]).map((t) => (
					<div key={t} className="space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Badge variant="outline">{PHOTO_TYPE_LABELS[t]}</Badge>
								<span className="text-xs text-gray-600">
									{grouped[t].length}
								</span>
							</div>

							<Button
								type="button"
								size="sm"
								variant="outline"
								className="gap-2"
								onClick={() => triggerPick(t)}
								disabled={uploadingType === t}
							>
								<Plus className="w-4 h-4" />
								Добавить
								{uploadingType === t && (
									<Loader2 className="w-4 h-4 animate-spin" />
								)}
							</Button>

							<input
								ref={inputRefs[t]}
								type="file"
								multiple
								accept="image/jpeg,image/png,image/webp"
								className="hidden"
								onChange={(e) => {
									void onPick(t, e.target.files);
								}}
							/>
						</div>

						{grouped[t].length === 0 ? (
							<p className="text-xs text-gray-600">Пока нет фото</p>
						) : (
							<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
								{grouped[t].slice(0, 12).map((p) => (
									<div
										key={p.id}
										className="rounded-lg border border-gray-100 overflow-hidden bg-gray-50"
									>
										<img
											src={p.photoUrl}
											alt={p.caption || p.photoType}
											className="w-full aspect-square object-cover"
										/>
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>

			<p className="text-xs text-gray-600">
				Загружаемые фото используются для контроля прогресса работ (Фаза 1).
			</p>
		</section>
	);
}

