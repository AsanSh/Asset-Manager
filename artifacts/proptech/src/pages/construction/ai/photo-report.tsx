import { Camera, Copy, FileDown, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface PhotoFile {
	name: string;
	base64: string;
	mediaType: string;
	preview: string;
}

export default function PhotoReport() {
	const [photos, setPhotos] = useState<PhotoFile[]>([]);
	const [projectName, setProjectName] = useState("");
	const [context, setContext] = useState("");
	const [report, setReport] = useState("");
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const addPhotos = (files: FileList) => {
		const allowed = ["image/jpeg", "image/png", "image/webp"];
		const remaining = 10 - photos.length;
		Array.from(files)
			.slice(0, remaining)
			.forEach((file) => {
				if (!allowed.includes(file.type)) {
					toast.error(`${file.name}: неподдерживаемый формат`);
					return;
				}
				const reader = new FileReader();
				reader.onload = (e) => {
					const dataUrl = e.target?.result as string;
					const base64 = dataUrl.split(",")[1];
					setPhotos((prev) => [
						...prev,
						{ name: file.name, base64, mediaType: file.type, preview: dataUrl },
					]);
				};
				reader.readAsDataURL(file);
			});
	};

	const removePhoto = (i: number) =>
		setPhotos((prev) => prev.filter((_, idx) => idx !== i));

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		addPhotos(e.dataTransfer.files);
	};

	const analyze = async () => {
		if (!photos.length) {
			toast.error("Добавьте хотя бы одно фото");
			return;
		}
		if (!projectName.trim()) {
			toast.error("Укажите название объекта");
			return;
		}
		setLoading(true);
		setReport("");
		try {
			const images = photos.map((p) => ({
				base64: p.base64,
				mediaType: p.mediaType,
				name: p.name,
			}));
			const { data } = await api.post("/ai/analyze-photos", {
				images,
				projectName,
				context,
			});
			setReport(data.report);
		} catch {
			toast.error("Ошибка анализа фото");
		} finally {
			setLoading(false);
		}
	};

	const copy = () => {
		navigator.clipboard.writeText(report);
		toast.success("Скопировано");
	};
	const download = () => {
		const blob = new Blob([report], { type: "text/plain" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `photo-report-${projectName}-${new Date().toLocaleDateString("ru-RU")}.txt`;
		a.click();
	};

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Анализ фото с объекта</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Загрузите фото со стройплощадки — AI составит подробный отчёт о ходе
					работ
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-4">
					{/* Загрузка фото */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Фото с объекта</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div
								className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
								onDrop={handleDrop}
								onDragOver={(e) => e.preventDefault()}
								onClick={() => inputRef.current?.click()}
							>
								<Camera className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
								<p className="text-sm font-medium">
									Перетащите фото или нажмите для выбора
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									JPEG, PNG, WebP — до 10 фото
								</p>
								<input
									ref={inputRef}
									type="file"
									multiple
									accept="image/jpeg,image/png,image/webp"
									className="hidden"
									onChange={(e) => e.target.files && addPhotos(e.target.files)}
								/>
							</div>

							{photos.length > 0 && (
								<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
									{photos.map((p, i) => (
										<div
											key={i}
											className="relative group rounded-lg overflow-hidden aspect-square"
										>
											<img
												src={p.preview}
												alt={p.name}
												className="w-full h-full object-cover"
											/>
											<button
												onClick={() => removePhoto(i)}
												className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<X className="w-3 h-3" />
											</button>
											<div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
												<p className="text-white text-[10px] truncate">
													{p.name}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
							{photos.length > 0 && (
								<div className="flex items-center justify-between">
									<Badge variant="secondary">{photos.length} / 10 фото</Badge>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setPhotos([])}
									>
										Очистить всё
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Параметры */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Параметры</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1">
								<Label>Название объекта *</Label>
								<Input
									value={projectName}
									onChange={(e) => setProjectName(e.target.value)}
									placeholder="ЖК 'Ромашка', корпус 2"
								/>
							</div>
							<div className="space-y-1">
								<Label>Контекст (необязательно)</Label>
								<Textarea
									value={context}
									onChange={(e) => setContext(e.target.value)}
									placeholder="Что сейчас делается, какой этап, что проверяем..."
									rows={4}
								/>
							</div>
						</CardContent>
					</Card>

					<Button
						onClick={analyze}
						disabled={loading || !photos.length}
						className="w-full"
					>
						{loading ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Анализирую...
							</>
						) : (
							<>
								<Camera className="w-4 h-4 mr-2" />
								Создать отчёт
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Результат */}
			{report && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">Отчёт AI-надзора</CardTitle>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={copy}>
									<Copy className="w-3 h-3 mr-1" />
									Копировать
								</Button>
								<Button size="sm" variant="outline" onClick={download}>
									<FileDown className="w-3 h-3 mr-1" />
									Скачать
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<pre className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 p-4 rounded-lg max-h-[600px] overflow-y-auto">
							{report}
						</pre>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
