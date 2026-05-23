import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
	downloadUnitsTemplate,
	parseUnitsFile,
	type UnitImportRow,
} from "@/lib/chess-units-xlsx";

export function ChessUnitsImportDialog({
	open,
	projectId,
	projectName,
	onClose,
	onImported,
}: {
	open: boolean;
	projectId: number;
	projectName: string;
	onClose: () => void;
	onImported: () => void;
}) {
	const { toast } = useToast();
	const inputRef = useRef<HTMLInputElement>(null);
	const [rows, setRows] = useState<UnitImportRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		created: number;
		updated: number;
		errors: { row: number; message: string }[];
	} | null>(null);

	const handleFile = async (file: File) => {
		try {
			const parsed = await parseUnitsFile(file);
			setRows(parsed);
			setResult(null);
			if (parsed.length === 0) {
				toast({
					title: "Файл пуст",
					description: "Добавьте строки с колонкой «Номер»",
					variant: "destructive",
				});
			}
		} catch {
			toast({ title: "Ошибка чтения Excel", variant: "destructive" });
		}
	};

	const handleImport = async () => {
		if (rows.length === 0) return;
		setLoading(true);
		try {
			const { data } = await api.post<{
				created: number;
				updated: number;
				errors: { row: number; message: string }[];
			}>("/construction/units/import", { projectId, rows });
			setResult(data);
			toast({
				title: "Импорт завершён",
				description: `Создано: ${data.created}, обновлено: ${data.updated}`,
			});
			onImported();
		} catch {
			toast({ title: "Ошибка импорта", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const reset = () => {
		setRows([]);
		setResult(null);
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
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Импорт квартир из Excel</DialogTitle>
					<DialogDescription>
						Проект: {projectName}. Скачайте шаблон, заполните и загрузите файл.
						Существующие квартиры с тем же номером будут обновлены.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => downloadUnitsTemplate(projectName)}
					>
						<FileSpreadsheet className="w-4 h-4" />
						Скачать шаблон
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => inputRef.current?.click()}
					>
						<Upload className="w-4 h-4" />
						Выбрать файл
					</Button>
					<input
						ref={inputRef}
						type="file"
						accept=".xlsx,.xls"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) handleFile(f);
						}}
					/>
				</div>

				{rows.length > 0 && !result && (
					<div className="border rounded-lg overflow-auto max-h-48">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Номер</TableHead>
									<TableHead>Этаж</TableHead>
									<TableHead>Площадь</TableHead>
									<TableHead>Статус</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.slice(0, 8).map((r, i) => (
									<TableRow key={i}>
										<TableCell>{String(r["Номер"] ?? r.unitNumber)}</TableCell>
										<TableCell>{String(r["Этаж"] ?? r.floor ?? "")}</TableCell>
										<TableCell>
											{String(r["Площадь м²"] ?? r.area ?? "")}
										</TableCell>
										<TableCell>{String(r["Статус"] ?? r.status ?? "")}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						{rows.length > 8 && (
							<p className="text-xs text-muted-foreground p-2">
								…и ещё {rows.length - 8} строк
							</p>
						)}
					</div>
				)}

				{result && result.errors.length > 0 && (
					<div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
						<p className="font-medium text-rose-800 flex items-center gap-1">
							<AlertCircle className="w-4 h-4" />
							Ошибки ({result.errors.length})
						</p>
						<ul className="mt-1 text-rose-700 text-xs space-y-0.5">
							{result.errors.slice(0, 5).map((e, i) => (
								<li key={i}>
									Строка {e.row}: {e.message}
								</li>
							))}
						</ul>
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						{result ? "Закрыть" : "Отмена"}
					</Button>
					{!result && (
						<Button
							onClick={handleImport}
							disabled={loading || rows.length === 0}
							className="bg-amber-500 hover:bg-orange-600"
						>
							{loading ? "Импорт..." : `Импортировать ${rows.length} строк`}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
