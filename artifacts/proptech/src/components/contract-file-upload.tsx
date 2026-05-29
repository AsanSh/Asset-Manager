import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
	PortalAccountPrompt,
	type PortalEntityType,
} from "@/components/portal-account-prompt";

export type ContractDocumentSummary = {
	fileName: string;
	mimeType: string;
	uploadedAt: string;
};

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.includes(",") ? result.split(",")[1] : result);
		};
		reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
		reader.readAsDataURL(file);
	});
}

function downloadFromMeta(doc: {
	fileName: string;
	mimeType: string;
	dataBase64: string;
}) {
	const bytes = Uint8Array.from(atob(doc.dataBase64), (c) => c.charCodeAt(0));
	const blob = new Blob([bytes], { type: doc.mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = doc.fileName;
	a.click();
	URL.revokeObjectURL(url);
}

interface ContractFileUploadProps {
	entityType: "contractor" | "supplier" | "buyer";
	entityId: number | null;
	contractDocument?: ContractDocumentSummary | null;
	onUploaded?: () => void;
	disabled?: boolean;
	portalPrompt?: {
		entityType: PortalEntityType;
		entityId: number;
		entityName?: string;
		defaultPhone?: string;
		defaultEmail?: string;
	};
}

function documentPath(
	entityType: ContractFileUploadProps["entityType"],
	entityId: number,
) {
	if (entityType === "contractor") {
		return `/construction/contractors/${entityId}/contract-document`;
	}
	if (entityType === "supplier") {
		return `/warehouse/suppliers/${entityId}/contract-document`;
	}
	return `/construction/contracts-sales/${entityId}/contract-document`;
}

export function ContractFileUpload({
	entityType,
	entityId,
	contractDocument,
	onUploaded,
	disabled,
	portalPrompt,
}: ContractFileUploadProps) {
	const { toast } = useToast();
	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [showPortalPrompt, setShowPortalPrompt] = useState(false);

	const handleFile = async (file: File) => {
		if (!entityId) {
			toast({
				title: "Сначала сохраните запись",
				description: "Загрузка договора доступна после создания",
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		try {
			const dataBase64 = await fileToBase64(file);
			await api.post(documentPath(entityType, entityId), {
				fileName: file.name,
				dataBase64,
				mimeType: file.type || "application/octet-stream",
			});
			toast({ title: "Договор загружен" });
			onUploaded?.();
			if (portalPrompt) {
				setShowPortalPrompt(true);
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Не удалось загрузить файл";
			toast({ title: msg, variant: "destructive" });
		} finally {
			setLoading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	const handleDownload = async () => {
		if (!entityId) return;
		setLoading(true);
		try {
			const { data } = await api.get(documentPath(entityType, entityId));
			downloadFromMeta(data);
		} catch {
			toast({ title: "Договор не найден", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!entityId || !confirm("Удалить загруженный договор?")) return;
		setLoading(true);
		try {
			await api.delete(documentPath(entityType, entityId));
			toast({ title: "Договор удалён" });
			onUploaded?.();
		} catch {
			toast({ title: "Ошибка удаления", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<Label>Договор (файл)</Label>
			<div className="mt-1 rounded-lg border border-dashed border-gray-200 p-3 space-y-2">
				{contractDocument ? (
					<div className="flex items-center gap-2 text-sm text-gray-700">
						<FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<p className="font-medium truncate">{contractDocument.fileName}</p>
							<p className="text-xs text-gray-400">
								{new Date(contractDocument.uploadedAt).toLocaleString("ru-KG")}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleDownload}
							disabled={loading || disabled}
						>
							<Download className="w-3.5 h-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleDelete}
							disabled={loading || disabled}
							className="text-rose-600"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</Button>
					</div>
				) : (
					<p className="text-xs text-gray-400">
						{entityId
							? "PDF, DOC, DOCX, JPG или PNG до 5 МБ"
							: "После сохранения можно загрузить договор"}
					</p>
				)}
				<input
					ref={inputRef}
					type="file"
					accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) void handleFile(f);
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => inputRef.current?.click()}
					disabled={loading || disabled || !entityId}
				>
					{loading ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<Upload className="w-3.5 h-3.5" />
					)}
					{contractDocument ? "Заменить файл" : "Загрузить договор"}
				</Button>
			</div>
			{portalPrompt && (
				<PortalAccountPrompt
					open={showPortalPrompt}
					onClose={() => setShowPortalPrompt(false)}
					entityType={portalPrompt.entityType}
					entityId={portalPrompt.entityId}
					entityName={portalPrompt.entityName}
					defaultPhone={portalPrompt.defaultPhone}
					defaultEmail={portalPrompt.defaultEmail}
				/>
			)}
		</div>
	);
}
