import { FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { pdfFirstPageToJpeg } from "@/lib/pdf-to-image";

export type ParsedProjectDocument = {
	name?: string;
	address?: string;
	region?: string;
	totalFloors?: number | null;
	totalUnits?: number | null;
	totalArea?: number | null;
	buildingType?: string;
	constructionType?: string;
	currency?: string;
	costPerSqm?: number | null;
	startDate?: string | null;
	plannedEndDate?: string | null;
	description?: string;
	documentMeta?: Record<string, unknown>;
	confidence?: string;
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

async function prepareUploadPayload(file: File): Promise<{
	base64: string;
	mimeType: string;
	fileName: string;
}> {
	const isPdf =
		file.type === "application/pdf" ||
		file.name.toLowerCase().endsWith(".pdf");

	if (isPdf) {
		const { base64, mimeType } = await pdfFirstPageToJpeg(file);
		return {
			base64,
			mimeType,
			fileName: file.name.replace(/\.pdf$/i, ".jpg"),
		};
	}

	return {
		base64: await fileToBase64(file),
		mimeType: file.type || "image/jpeg",
		fileName: file.name,
	};
}

async function parseDocument(file: File): Promise<ParsedProjectDocument> {
	const payload = await prepareUploadPayload(file);
	const { data } = await api.post<ParsedProjectDocument>(
		"/construction/projects/parse-document",
		payload,
	);
	return data;
}

const META_LABELS: Record<string, string> = {
	stage: "Стадия",
	sections: "Раздел",
	client: "Заказчик",
	director: "Директор",
	chiefArchitect: "ГАП",
	contractorCompany: "Организация",
	license: "Лицензия",
	documentYear: "Год",
	city: "Город",
	projectTitle: "Титул",
};

export function ProjectDocumentUploadDialog({
	open,
	onClose,
	onParsed,
}: {
	open: boolean;
	onClose: () => void;
	onParsed: (data: ParsedProjectDocument, fileName: string) => void;
}) {
	const { toast } = useToast();
	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [preview, setPreview] = useState<ParsedProjectDocument | null>(null);
	const [fileName, setFileName] = useState("");

	const handleFile = async (file: File) => {
		const ok =
			file.type.startsWith("image/") ||
			file.type === "application/pdf" ||
			file.name.toLowerCase().endsWith(".pdf");
		if (!ok) {
			toast({
				title: "Формат не поддерживается",
				description: "Загрузите PDF или изображение (PNG, JPG)",
				variant: "destructive",
			});
			return;
		}
		const isPdf =
			file.type === "application/pdf" ||
			file.name.toLowerCase().endsWith(".pdf");
		const maxMb = isPdf ? 25 : 12;
		if (file.size > maxMb * 1024 * 1024) {
			toast({
				title: `Файл больше ${maxMb} МБ`,
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		setPreview(null);
		setFileName(file.name);
		try {
			const parsed = await parseDocument(file);
			setPreview(parsed);
			toast({ title: "Документ распознан" });
		} catch (e) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось распознать",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const reset = () => {
		setPreview(null);
		setFileName("");
		if (inputRef.current) inputRef.current.value = "";
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) {
					reset();
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-amber-500" />
						Загрузить проект из документа
					</DialogTitle>
					<DialogDescription>
						Титульный лист, паспорт проекта (PDF или фото). Система заполнит
						название, адрес, этажи, заказчика и другие поля автоматически.
					</DialogDescription>
				</DialogHeader>

				<div
					className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition-colors"
					onClick={() => !loading && inputRef.current?.click()}
					onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
					role="button"
					tabIndex={0}
				>
					{loading ? (
						<Loader2 className="w-10 h-10 mx-auto text-amber-500 animate-spin" />
					) : (
						<Upload className="w-10 h-10 mx-auto text-amber-500 mb-2" />
					)}
					<p className="text-sm font-medium text-gray-700">
						{loading ? "Распознавание..." : "Нажмите или перетащите файл"}
					</p>
					<p className="text-xs text-gray-500 mt-1">
						PDF (первая страница), PNG, JPG. PDF до 25 МБ, фото до 12 МБ
					</p>
					<input
						ref={inputRef}
						type="file"
						accept=".pdf,image/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) handleFile(f);
						}}
					/>
				</div>

				{fileName && (
					<p className="text-xs text-gray-500 flex items-center gap-1">
						<FileText className="w-3.5 h-3.5" />
						{fileName}
						{preview?.confidence && (
							<Badge variant="secondary" className="ml-2 text-[10px]">
								{preview.confidence === "high"
									? "Высокая точность"
									: preview.confidence === "medium"
										? "Средняя точность"
										: "Проверьте данные"}
							</Badge>
						)}
					</p>
				)}

				{preview && (
					<div className="space-y-3 text-sm border rounded-lg p-3 bg-gray-50">
						{preview.name && (
							<div>
								<span className="text-gray-500">Название: </span>
								<span className="font-medium">{preview.name}</span>
							</div>
						)}
						{preview.address && (
							<div>
								<span className="text-gray-500">Адрес: </span>
								{preview.address}
							</div>
						)}
						<div className="flex flex-wrap gap-2">
							{preview.totalFloors != null && (
								<Badge variant="outline">{preview.totalFloors} эт.</Badge>
							)}
							{preview.region && (
								<Badge variant="outline">{preview.region}</Badge>
							)}
							{preview.buildingType && (
								<Badge variant="outline">{preview.buildingType}</Badge>
							)}
						</div>
						{preview.documentMeta &&
							Object.entries(preview.documentMeta).some(([, v]) => v) && (
								<div className="pt-2 border-t space-y-1">
									{Object.entries(preview.documentMeta).map(([k, v]) =>
										v ? (
											<p key={k} className="text-xs">
												<span className="text-gray-500">
													{META_LABELS[k] || k}:{" "}
												</span>
												{String(v)}
											</p>
										) : null,
									)}
								</div>
							)}
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Отмена
					</Button>
					<Button
						type="button"
						className="bg-amber-500 hover:bg-orange-600"
						disabled={!preview}
						onClick={() => {
							if (preview) {
								onParsed(preview, fileName);
								reset();
								onClose();
							}
						}}
					>
						Применить к форме проекта
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Применить распознанные поля к форме проекта */
export function applyParsedToProjectForm(
	parsed: ParsedProjectDocument,
) {
	const bt = parsed.buildingType || "commercial";
	const ct = parsed.constructionType || "monolith";
	return {
		name: parsed.name || "",
		address: parsed.address || "",
		region: parsed.region || parsed.documentMeta?.city?.toString() || "",
		status: "planning",
		buildingType: bt,
		constructionType: ct,
		totalFloors:
			parsed.totalFloors != null ? String(parsed.totalFloors) : "",
		totalUnits:
			parsed.totalUnits != null ? String(parsed.totalUnits) : "",
		totalArea: parsed.totalArea != null ? String(parsed.totalArea) : "",
		costPerSqm:
			parsed.costPerSqm != null ? String(parsed.costPerSqm) : "",
		currency: parsed.currency || "KGS",
		exchangeRateSource: "nbkr",
		exchangeRate: "1",
		startDate: parsed.startDate || "",
		plannedEndDate: parsed.plannedEndDate || "",
		description: parsed.description || "",
		documentMeta: parsed.documentMeta,
	};
}
