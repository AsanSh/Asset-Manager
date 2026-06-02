import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { TaskAttachment } from "../types";
import { fetchTaskAttachments, taskKeys } from "../api";

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

const docTypeBadgeClass: Record<string, string> = {
	pdf: "bg-rose-100 text-rose-700",
	dwg: "bg-indigo-100 text-indigo-700",
	xlsx: "bg-emerald-100 text-emerald-700",
	docx: "bg-amber-100 text-amber-700",
	photo: "bg-blue-100 text-blue-700",
	other: "bg-gray-100 text-gray-700",
};

export function TaskAttachmentsSection({
	taskId,
}: {
	taskId: number;
}) {
	const qc = useQueryClient();
	const { toast } = useToast();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);

	const { data: attachments = [], isLoading } = useQuery({
		queryKey: taskKeys.attachments(taskId),
		queryFn: () => fetchTaskAttachments(taskId),
	});

	const totalSizeKb = useMemo(() => {
		let sum = 0;
		for (const a of attachments) sum += Number(a.fileSize ?? 0);
		return Math.round(sum / 1024);
	}, [attachments]);

	const pick = () => inputRef.current?.click();

	const upload = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		setUploading(true);
		try {
			const selected = Array.from(files).slice(0, 10);
			const payloadFiles = await Promise.all(
				selected.map(async (f) => ({
					fileName: f.name,
					mimeType: f.type || "application/octet-stream",
					base64: await fileToBase64(f),
				})),
			);

			await api.post(`/construction/tasks/${taskId}/attachments`, {
				files: payloadFiles,
			});

			toast({ title: "Вложения загружены" });
			await qc.invalidateQueries({
				queryKey: taskKeys.attachments(taskId),
			});
			if (inputRef.current) inputRef.current.value = "";
		} catch (e) {
			toast({
				title: "Ошибка загрузки вложений",
				description: e instanceof Error ? e.message : undefined,
				variant: "destructive",
			});
		} finally {
			setUploading(false);
		}
	};

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-gray-900">Вложения</h3>
				{isLoading ? (
					<Loader2 className="w-4 h-4 animate-spin text-gray-400" />
				) : (
					<span className="text-xs text-gray-400">
						{attachments.length} шт · {totalSizeKb} КБ
					</span>
				)}
			</div>

			<div className="flex items-center justify-between gap-3">
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="gap-2"
					onClick={pick}
					disabled={uploading}
				>
					<Plus className="w-4 h-4" />
					Добавить файлы
					{uploading && <Loader2 className="w-4 h-4 animate-spin" />}
				</Button>
				<input
					ref={inputRef}
					type="file"
					multiple
					accept=".pdf,.dwg,.xlsx,.xls,.docx,.doc,image/*"
					className="hidden"
					onChange={(e) => {
						void upload(e.target.files);
					}}
				/>
			</div>

			{attachments.length === 0 ? (
				<p className="text-xs text-gray-400">Пока нет вложений</p>
			) : (
				<ul className="space-y-2">
					{attachments.map((a) => (
						<li
							key={a.id}
							className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2"
						>
							<div className="flex items-center gap-2 min-w-0">
								{a.docType === "photo" ? (
									<img
										src={a.fileUrl}
										alt={a.fileName}
										className="w-10 h-10 rounded-md object-cover flex-shrink-0"
									/>
								) : (
									<FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
								)}
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">{a.fileName}</p>
									<Badge
										variant="secondary"
										className={`text-[10px] mt-1 ${docTypeBadgeClass[a.docType] || "bg-gray-100 text-gray-700"}`}
									>
										{a.docType}
									</Badge>
								</div>
							</div>

							<a
								href={a.fileUrl}
								target="_blank"
								rel="noreferrer"
								className="text-xs text-amber-600 hover:underline whitespace-nowrap"
							>
								Открыть
							</a>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

