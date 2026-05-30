import {
	AlertCircle,
	CheckCircle2,
	FileSpreadsheet,
	RefreshCw,
	Upload,
	XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { SystemSettingsBar } from "@/components/system-settings-nav";

type ImportType = "counterparties" | "properties" | "contracts";
type Step = "upload" | "preview" | "confirm" | "result";

interface PreviewResult {
	totalRows: number;
	validRows: number;
	errorRows: number;
	errors: Array<{ row: number; field: string | null; message: string }>;
	preview: Record<string, unknown>[];
}

interface ImportJob {
	id: number;
	type: string;
	status: string;
	totalRows: number;
	successRows: number;
	errorRows: number;
	errors: string | null;
	createdAt: string;
}

const typeLabels: Record<ImportType, string> = {
	counterparties: "Контрагенты",
	properties: "Объекты недвижимости",
	contracts: "Договоры",
};

const typeTemplates: Record<ImportType, Record<string, string>> = {
	counterparties: {
		type: "individual | company",
		fullName: "ФИО или наименование",
		iin: "ИНН/ИИН",
		phone: "+996 700 000 000",
		email: "email@example.com",
	},
	properties: {
		projectName: "Название проекта",
		unitNumber: "Номер объекта",
		type: "apartment | commercial | office",
		area: "50.5",
		status: "available | sold | rented",
	},
	contracts: {
		contractNumber: "ДА-2026-001",
		type: "sale | lease | other",
		amount: "1000000",
		currency: "KGS | USD",
		status: "draft | active | completed",
	},
};

async function apiPreview(
	type: string,
	data: Record<string, unknown>[],
): Promise<PreviewResult> {
	const res = await fetch("/api/import/preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ type, data }),
	});
	if (!res.ok) throw new Error("Ошибка предпросмотра");
	return res.json();
}

async function apiCommit(
	type: string,
	data: Record<string, unknown>[],
	onlyValid = true,
): Promise<ImportJob> {
	const res = await fetch("/api/import/commit", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ type, data, onlyValid }),
	});
	if (!res.ok) throw new Error("Ошибка импорта");
	return res.json();
}

async function fetchHistory(): Promise<ImportJob[]> {
	const res = await fetch("/api/import/jobs", { credentials: "include" });
	if (!res.ok) throw new Error("Ошибка получения истории");
	return res.json();
}

const statusColors: Record<string, string> = {
	completed: "bg-emerald-100 text-emerald-800",
	partial: "bg-amber-100 text-amber-800",
	failed: "bg-rose-100 text-rose-800",
	processing: "bg-blue-100 text-blue-800",
};
const statusLabels: Record<string, string> = {
	completed: "Выполнен",
	partial: "Частично",
	failed: "Ошибка",
	processing: "Обработка",
};

export default function ImportCenter() {
	const { toast } = useToast();
	const fileRef = useRef<HTMLInputElement>(null);
	const [step, setStep] = useState<Step>("upload");
	const [importType, setImportType] = useState<ImportType>("counterparties");
	const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
	const [preview, setPreview] = useState<PreviewResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [resultJob, setResultJob] = useState<ImportJob | null>(null);
	const [history, setHistory] = useState<ImportJob[]>([]);
	const [historyLoaded, setHistoryLoaded] = useState(false);
	const [activeTab, setActiveTab] = useState<"import" | "history">("import");

	const loadHistory = async () => {
		try {
			const jobs = await fetchHistory();
			setHistory(jobs.reverse());
			setHistoryLoaded(true);
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось загрузить историю",
				variant: "destructive",
			});
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const buf = await file.arrayBuffer();
			const wb = XLSX.read(buf, { type: "array" });
			const ws = wb.Sheets[wb.SheetNames[0]];
			const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

			if (!data.length) {
				toast({
					title: "Файл пуст",
					description: "В файле нет данных для импорта",
					variant: "destructive",
				});
				return;
			}

			setRawData(data);
			setIsLoading(true);

			const result = await apiPreview(importType, data);
			setPreview(result);
			setStep("preview");
		} catch (err: any) {
			toast({
				title: "Ошибка чтения файла",
				description: err?.message || "Проверьте формат .xlsx",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	};

	const handleCommit = async () => {
		if (!preview) return;
		setIsLoading(true);
		try {
			const job = await apiCommit(importType, rawData, true);
			setResultJob(job);
			setStep("result");
			setHistoryLoaded(false);
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось выполнить импорт",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const reset = () => {
		setStep("upload");
		setPreview(null);
		setRawData([]);
		setResultJob(null);
	};

	const columns = preview?.preview?.length
		? Object.keys(preview.preview[0])
		: [];
	const errorsArray = Array.isArray(preview?.errors) ? preview.errors : [];
	const errorRowNumbers = new Set(errorsArray.map((e) => e.row));

	return (
		<div className="space-y-4">
			<SystemSettingsBar />
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Центр импорта</h1>
				<p className="text-sm text-gray-500 mt-1">
					Загрузка данных из Excel / CSV файлов
				</p>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
				{(["import", "history"] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => {
							setActiveTab(tab);
							if (tab === "history" && !historyLoaded) loadHistory();
						}}
						className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
							activeTab === tab
								? "bg-white shadow-sm text-gray-900"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						{tab === "import" ? "Импорт" : "История"}
					</button>
				))}
			</div>

			{activeTab === "history" ? (
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
						<h2 className="font-semibold text-gray-900 text-sm">
							История импортов
						</h2>
						<button
							onClick={loadHistory}
							className="text-gray-400 hover:text-gray-600"
						>
							<RefreshCw className="w-4 h-4" />
						</button>
					</div>
					{history.length === 0 ? (
						<div className="py-12 text-center text-gray-400 text-sm">
							История импортов пуста
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Тип</TableHead>
									<TableHead>Дата</TableHead>
									<TableHead>Всего строк</TableHead>
									<TableHead>Успешно</TableHead>
									<TableHead>Ошибок</TableHead>
									<TableHead>Статус</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((job) => (
									<TableRow key={job.id}>
										<TableCell>
											{typeLabels[job.type as ImportType] || job.type}
										</TableCell>
										<TableCell className="text-sm text-gray-500">
											{new Date(job.createdAt).toLocaleString("ru-KG")}
										</TableCell>
										<TableCell>{job.totalRows}</TableCell>
										<TableCell className="text-emerald-600 font-medium">
											{job.successRows}
										</TableCell>
										<TableCell
											className={
												job.errorRows > 0
													? "text-rose-600 font-medium"
													: "text-gray-400"
											}
										>
											{job.errorRows}
										</TableCell>
										<TableCell>
											<Badge
												className={statusColors[job.status] || ""}
												variant="secondary"
											>
												{statusLabels[job.status] || job.status}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			) : (
				<div className="space-y-4">
					{/* Step indicator */}
					<div className="flex items-center gap-2 text-sm">
						{(["upload", "preview", "confirm", "result"] as Step[]).map(
							(s, i, arr) => (
								<div key={s} className="flex items-center gap-2">
									<div
										className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
											step === s
												? "bg-blue-600 text-white"
												: arr.indexOf(step) > i
													? "bg-emerald-600 text-white"
													: "bg-gray-200 text-white"
										}`}
									>
										{arr.indexOf(step) > i ? "✓" : i + 1}
									</div>
									<span
										className={
											step === s ? "text-blue-600 font-medium" : "text-gray-400"
										}
									>
										{
											[
												"Загрузка",
												"Предпросмотр",
												"Подтверждение",
												"Результат",
											][i]
										}
									</span>
									{i < arr.length - 1 && (
										<span className="text-gray-300 mx-1">→</span>
									)}
								</div>
							),
						)}
					</div>

					{/* Step 1: Upload */}
					{step === "upload" && (
						<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Тип данных
								</label>
								<Select
									value={importType}
									onValueChange={(v) => setImportType(v as ImportType)}
								>
									<SelectTrigger className="w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="counterparties">Контрагенты</SelectItem>
										<SelectItem value="properties">
											Объекты недвижимости
										</SelectItem>
										<SelectItem value="contracts">Договоры</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Template hint */}
							<div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
								<p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
									<FileSpreadsheet className="w-3.5 h-3.5" /> Ожидаемые колонки
									для «{typeLabels[importType]}»
								</p>
								<div className="flex flex-wrap gap-2">
									{Object.entries(typeTemplates[importType]).map(
										([key, hint]) => (
											<span
												key={key}
												className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs text-blue-700"
											>
												<strong>{key}</strong>{" "}
												<span className="text-blue-400">— {hint}</span>
											</span>
										),
									)}
								</div>
							</div>

							{/* Drop zone */}
							<div
								onClick={() => fileRef.current?.click()}
								className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
							>
								<Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
								<p className="text-gray-600 font-medium">
									Нажмите для выбора файла
								</p>
								<p className="text-sm text-gray-400 mt-1">
									Поддерживается .xlsx и .xls формат
								</p>
								{isLoading && (
									<p className="text-blue-600 text-sm mt-2">
										Обработка файла...
									</p>
								)}
							</div>
							<input
								ref={fileRef}
								type="file"
								accept=".xlsx,.xls,.csv"
								className="hidden"
								onChange={handleFileChange}
							/>
						</div>
					)}

					{/* Step 2: Preview */}
					{step === "preview" && preview && (
						<div className="space-y-4">
							{/* Summary */}
							<div className="grid grid-cols-3 gap-4">
								<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
									<p className="text-2xl font-bold text-gray-900">
										{preview.totalRows}
									</p>
									<p className="text-xs text-gray-500 mt-1">Всего строк</p>
								</div>
								<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
									<p className="text-2xl font-bold text-emerald-600">
										{preview.validRows}
									</p>
									<p className="text-xs text-gray-500 mt-1">Корректных</p>
								</div>
								<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
									<p className="text-2xl font-bold text-rose-600">
										{preview.errorRows}
									</p>
									<p className="text-xs text-gray-500 mt-1">С ошибками</p>
								</div>
							</div>

							{/* Errors */}
							{preview.errors.length > 0 && (
								<div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
									<p className="text-sm font-semibold text-rose-800 mb-2 flex items-center gap-1.5">
										<AlertCircle className="w-4 h-4" /> Ошибки валидации
									</p>
									<ul className="space-y-1">
										{preview.errors.slice(0, 10).map((e, i) => (
											<li key={i} className="text-xs text-rose-700">
												Строка {e.row}: {e.field && <strong>{e.field}</strong>}{" "}
												— {e.message}
											</li>
										))}
										{preview.errors.length > 10 && (
											<li className="text-xs text-rose-600">
												... и ещё {preview.errors.length - 10} ошибок
											</li>
										)}
									</ul>
								</div>
							)}

							{/* Preview Table */}
							<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
								<div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
									<p className="text-sm font-semibold text-gray-700">
										Предпросмотр (первые {preview.preview.length} строк)
									</p>
								</div>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-10">#</TableHead>
												{columns.map((col) => (
													<TableHead key={col}>{col}</TableHead>
												))}
												<TableHead className="w-10"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{preview.preview.map((row, idx) => (
												<TableRow
													key={idx}
													className={
														errorRowNumbers.has(idx + 1) ? "bg-rose-50" : ""
													}
												>
													<TableCell className="text-gray-400 text-xs">
														{idx + 1}
													</TableCell>
													{columns.map((col) => (
														<TableCell
															key={col}
															className="text-sm max-w-40 truncate"
														>
															{String(row[col] ?? "")}
														</TableCell>
													))}
													<TableCell>
														{errorRowNumbers.has(idx + 1) ? (
															<XCircle className="w-4 h-4 text-rose-600" />
														) : (
															<CheckCircle2 className="w-4 h-4 text-emerald-600" />
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>

							<div className="flex gap-3">
								<Button variant="outline" onClick={reset}>
									← Назад
								</Button>
								{preview.validRows > 0 && (
									<Button
										onClick={() => setStep("confirm")}
										className="bg-blue-600 hover:bg-blue-700 text-white"
									>
										Далее — Подтвердить импорт
									</Button>
								)}
							</div>
						</div>
					)}

					{/* Step 3: Confirm */}
					{step === "confirm" && preview && (
						<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6 max-w-lg">
							<div className="text-center space-y-3">
								<div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
									<Upload className="w-7 h-7 text-blue-600" />
								</div>
								<h2 className="text-lg font-bold text-gray-900">
									Подтвердите импорт
								</h2>
								<p className="text-gray-500 text-sm">
									Будет импортировано{" "}
									<strong className="text-emerald-600">
										{preview.validRows}
									</strong>{" "}
									корректных строк из {preview.totalRows} общих.
									{preview.errorRows > 0 && (
										<span className="text-rose-600">
											{" "}
											Строки с ошибками ({preview.errorRows}) будут пропущены.
										</span>
									)}
								</p>
								<p className="text-xs text-gray-400">
									Тип данных: <strong>{typeLabels[importType]}</strong>
								</p>
							</div>
							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => setStep("preview")}
								>
									← Назад
								</Button>
								<Button
									className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
									onClick={handleCommit}
									disabled={isLoading}
								>
									{isLoading ? "Импорт..." : "Импортировать"}
								</Button>
							</div>
						</div>
					)}

					{/* Step 4: Result */}
					{step === "result" && resultJob && (
						<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-5 max-w-md mx-auto">
							{resultJob.status === "completed" ? (
								<CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
							) : resultJob.status === "partial" ? (
								<AlertCircle className="w-14 h-14 text-amber-600 mx-auto" />
							) : (
								<XCircle className="w-14 h-14 text-rose-600 mx-auto" />
							)}
							<div>
								<h2 className="text-lg font-bold text-gray-900 mb-1">
									{resultJob.status === "completed"
										? "Импорт завершён!"
										: resultJob.status === "partial"
											? "Импорт выполнен частично"
											: "Импорт не выполнен"}
								</h2>
								<p className="text-gray-500 text-sm">
									Импортировано:{" "}
									<strong className="text-emerald-600">
										{resultJob.successRows}
									</strong>{" "}
									из {resultJob.totalRows} строк
									{resultJob.errorRows > 0 && (
										<span className="text-rose-600">
											{" "}
											({resultJob.errorRows} пропущено)
										</span>
									)}
								</p>
							</div>
							<Button
								onClick={reset}
								className="bg-blue-600 hover:bg-blue-700 text-white"
							>
								Новый импорт
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
