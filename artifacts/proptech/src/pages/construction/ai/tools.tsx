import {
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	ClipboardList,
	Copy,
	Download,
	FileText,
	Loader2,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

function CopyDownloadBar({ text }: { text: string }) {
	const copy = () => {
		navigator.clipboard.writeText(text);
		toast.success("Скопировано");
	};
	const download = (ext: string) => {
		const blob = new Blob([text], { type: "text/plain" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `result.${ext}`;
		a.click();
	};
	return (
		<div className="flex gap-2 mt-2">
			<Button size="sm" variant="outline" onClick={copy}>
				<Copy className="w-3 h-3 mr-1" />
				Копировать
			</Button>
			<Button size="sm" variant="outline" onClick={() => download("txt")}>
				<Download className="w-3 h-3 mr-1" />
				Скачать .txt
			</Button>
		</div>
	);
}

// ── Генерация ТЗ ─────────────────────────────────────────────────
function GenerateTZ() {
	const [brief, setBrief] = useState("");
	const [projectType, setProjectType] = useState("жилое строительство");
	const [result, setResult] = useState("");
	const [loading, setLoading] = useState(false);

	const run = async () => {
		if (!brief.trim()) {
			toast.error("Заполните бриф");
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post("/ai/generate-tz", {
				brief,
				projectType,
			});
			setResult(data.text);
		} catch {
			toast.error("Ошибка генерации");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Тип проекта</Label>
					<Select value={projectType} onValueChange={setProjectType}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="жилое строительство">
								Жилое строительство
							</SelectItem>
							<SelectItem value="коммерческая недвижимость">
								Коммерческая недвижимость
							</SelectItem>
							<SelectItem value="промышленный объект">
								Промышленный объект
							</SelectItem>
							<SelectItem value="инфраструктура">Инфраструктура</SelectItem>
							<SelectItem value="реконструкция">
								Реконструкция / капремонт
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Бриф от заказчика</Label>
				<Textarea
					value={brief}
					onChange={(e) => setBrief(e.target.value)}
					placeholder="Опишите объект, требования, площадь, этажность, особые условия..."
					rows={6}
				/>
			</div>
			<Button onClick={run} disabled={loading}>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Генерирую...
					</>
				) : (
					<>
						<FileText className="w-4 h-4 mr-2" />
						Сгенерировать ТЗ
					</>
				)}
			</Button>
			{result && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Техническое задание</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
							{result}
						</pre>
						<CopyDownloadBar text={result} />
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ── Анализ сметы ─────────────────────────────────────────────────
function AnalyzeEstimate() {
	const [estimateText, setEstimateText] = useState("");
	const [result, setResult] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const run = async () => {
		if (!estimateText.trim()) {
			toast.error("Вставьте текст сметы");
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post("/ai/analyze-estimate", { estimateText });
			setResult(data);
		} catch {
			toast.error("Ошибка анализа");
		} finally {
			setLoading(false);
		}
	};

	const riskColor = (r: string) =>
		r === "low"
			? "bg-green-100 text-green-700"
			: r === "medium"
				? "bg-yellow-100 text-yellow-700"
				: "bg-red-100 text-red-700";

	const riskLabel = (r: string) =>
		r === "low"
			? "Низкий риск"
			: r === "medium"
				? "Средний риск"
				: "Высокий риск";

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Текст сметы</Label>
				<Textarea
					value={estimateText}
					onChange={(e) => setEstimateText(e.target.value)}
					placeholder="Вставьте содержимое сметы (позиции, объёмы, расценки)..."
					rows={10}
					className="font-mono text-sm"
				/>
			</div>
			<Button onClick={run} disabled={loading}>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Анализирую...
					</>
				) : (
					<>
						<BarChart3 className="w-4 h-4 mr-2" />
						Анализировать смету
					</>
				)}
			</Button>

			{result && (
				<div className="space-y-4">
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						{result.totalAmount && (
							<Card>
								<CardContent className="pt-4">
									<p className="text-xs text-muted-foreground">
										Итого по смете
									</p>
									<p className="text-xl font-bold">
										{Number(result.totalAmount).toLocaleString("ru-RU")} ₽
									</p>
								</CardContent>
							</Card>
						)}
						{result.riskLevel && (
							<Card>
								<CardContent className="pt-4">
									<p className="text-xs text-muted-foreground">Уровень риска</p>
									<Badge className={`mt-1 ${riskColor(result.riskLevel)}`}>
										{riskLabel(result.riskLevel)}
									</Badge>
								</CardContent>
							</Card>
						)}
						{result.issues && (
							<Card>
								<CardContent className="pt-4">
									<p className="text-xs text-muted-foreground">
										Найдено проблем
									</p>
									<p className="text-xl font-bold text-red-600">
										{result.issues.length}
									</p>
								</CardContent>
							</Card>
						)}
					</div>

					{result.summary && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Резюме</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm">{result.summary}</p>
							</CardContent>
						</Card>
					)}

					{result.issues?.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Проблемы</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{result.issues.map((issue: any, i: number) => (
									<div key={i} className="border rounded-lg p-3 space-y-1">
										<div className="flex items-center gap-2">
											<AlertTriangle className="w-4 h-4 text-yellow-500" />
											<span className="font-medium text-sm">
												{issue.position}
											</span>
											<Badge variant="outline" className="ml-auto text-xs">
												{issue.type}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground pl-6">
											{issue.detail}
										</p>
										{issue.impact && (
											<p className="text-xs text-red-600 pl-6">
												Влияние: {Number(issue.impact).toLocaleString("ru-RU")}{" "}
												₽
											</p>
										)}
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}

// ── Генерация КС-2/КС-3 ──────────────────────────────────────────
function GenerateAct() {
	const [actType, setActType] = useState<"КС-2" | "КС-3">("КС-2");
	const [projectName, setProjectName] = useState("");
	const [contractor, setContractor] = useState("");
	const [period, setPeriod] = useState("");
	const [works, setWorks] = useState("");
	const [result, setResult] = useState("");
	const [loading, setLoading] = useState(false);

	const run = async () => {
		if (!projectName || !works) {
			toast.error("Заполните обязательные поля");
			return;
		}
		setLoading(true);
		try {
			const worksData = works
				.split("\n")
				.filter(Boolean)
				.map((line, i) => {
					const parts = line.split("|");
					return {
						no: i + 1,
						name: parts[0]?.trim(),
						unit: parts[1]?.trim() ?? "шт",
						qty: parts[2]?.trim() ?? "1",
						price: parts[3]?.trim() ?? "0",
					};
				});
			const { data } = await api.post("/ai/generate-act", {
				actType,
				projectData: { name: projectName, contractor, period },
				worksData,
			});
			setResult(data.text);
		} catch {
			toast.error("Ошибка генерации акта");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Тип акта</Label>
					<Select value={actType} onValueChange={(v) => setActType(v as any)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="КС-2">
								КС-2 — Акт о приёмке выполненных работ
							</SelectItem>
							<SelectItem value="КС-3">
								КС-3 — Справка о стоимости работ
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Период</Label>
					<Input
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						placeholder="Май 2026"
					/>
				</div>
				<div className="space-y-2">
					<Label>Наименование объекта *</Label>
					<Input
						value={projectName}
						onChange={(e) => setProjectName(e.target.value)}
						placeholder="ЖК 'Ромашка', корпус 1"
					/>
				</div>
				<div className="space-y-2">
					<Label>Подрядчик</Label>
					<Input
						value={contractor}
						onChange={(e) => setContractor(e.target.value)}
						placeholder="ООО 'СтройГрупп'"
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Выполненные работы (одна строка = одна позиция)</Label>
				<p className="text-xs text-muted-foreground">
					Формат: Название | Ед.изм | Кол-во | Цена за ед.
				</p>
				<Textarea
					value={works}
					onChange={(e) => setWorks(e.target.value)}
					placeholder={
						"Кладка кирпича | м² | 250 | 1500\nЗаливка фундамента | м³ | 80 | 8000"
					}
					rows={8}
					className="font-mono text-sm"
				/>
			</div>
			<Button onClick={run} disabled={loading}>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Генерирую...
					</>
				) : (
					<>
						<ClipboardList className="w-4 h-4 mr-2" />
						Сформировать {actType}
					</>
				)}
			</Button>
			{result && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Акт {actType}</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
							{result}
						</pre>
						<CopyDownloadBar text={result} />
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ── Анализ тендера ────────────────────────────────────────────────
function AnalyzeTender() {
	const [tenderText, setTenderText] = useState("");
	const [result, setResult] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const run = async () => {
		if (!tenderText.trim()) {
			toast.error("Вставьте текст тендера");
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post("/ai/analyze-tender", { tenderText });
			setResult(data);
		} catch {
			toast.error("Ошибка анализа тендера");
		} finally {
			setLoading(false);
		}
	};

	const recColor = (r: string) =>
		r === "участвовать"
			? "bg-green-100 text-green-800"
			: r === "не участвовать"
				? "bg-red-100 text-red-800"
				: "bg-yellow-100 text-yellow-800";

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Текст тендерной документации</Label>
				<Textarea
					value={tenderText}
					onChange={(e) => setTenderText(e.target.value)}
					placeholder="Вставьте содержание тендера с zakupki.gov.kg или других площадок..."
					rows={10}
					className="text-sm"
				/>
			</div>
			<Button onClick={run} disabled={loading}>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Анализирую...
					</>
				) : (
					<>
						<TrendingUp className="w-4 h-4 mr-2" />
						Анализировать тендер
					</>
				)}
			</Button>

			{result && (
				<div className="space-y-4">
					<Card>
						<CardContent className="pt-4 space-y-2">
							{result.title && <p className="font-semibold">{result.title}</p>}
							<div className="flex flex-wrap gap-2">
								{result.customer && (
									<Badge variant="outline">{result.customer}</Badge>
								)}
								{result.budget && (
									<Badge variant="outline">
										Бюджет: {Number(result.budget).toLocaleString("ru-RU")} ₽
									</Badge>
								)}
								{result.deadline && (
									<Badge variant="outline">Срок: {result.deadline}</Badge>
								)}
								{result.recommendation && (
									<Badge className={recColor(result.recommendation)}>
										{result.recommendation.toUpperCase()}
									</Badge>
								)}
							</div>
							{result.reasoning && (
								<p className="text-sm text-muted-foreground">
									{result.reasoning}
								</p>
							)}
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{result.risks?.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-sm text-red-600">Риски</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1">
									{result.risks.map((r: string, i: number) => (
										<div key={i} className="flex gap-2 text-sm">
											<AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
											<span>{r}</span>
										</div>
									))}
								</CardContent>
							</Card>
						)}
						{result.advantages?.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-sm text-green-600">
										Преимущества
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1">
									{result.advantages.map((a: string, i: number) => (
										<div key={i} className="flex gap-2 text-sm">
											<CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
											<span>{a}</span>
										</div>
									))}
								</CardContent>
							</Card>
						)}
					</div>

					{result.checklist?.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Чеклист для участия</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{result.checklist.map((item: any, i: number) => (
									<div key={i} className="flex items-start gap-2 text-sm">
										<div className="w-4 h-4 border-2 rounded flex-shrink-0 mt-0.5" />
										<span>{item.item}</span>
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}

// ── Главная страница ──────────────────────────────────────────────
export default function AITools() {
	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">AI-Инструменты</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Генерация документов, анализ смет и тендеров с помощью искусственного
					интеллекта
				</p>
			</div>

			<Tabs defaultValue="tz">
				<TabsList className="grid grid-cols-4 w-full">
					<TabsTrigger value="tz">
						<FileText className="w-3 h-3 mr-1" />
						Генерация ТЗ
					</TabsTrigger>
					<TabsTrigger value="estimate">
						<BarChart3 className="w-3 h-3 mr-1" />
						Анализ сметы
					</TabsTrigger>
					<TabsTrigger value="act">
						<ClipboardList className="w-3 h-3 mr-1" />
						КС-2 / КС-3
					</TabsTrigger>
					<TabsTrigger value="tender">
						<TrendingUp className="w-3 h-3 mr-1" />
						Тендеры
					</TabsTrigger>
				</TabsList>
				<TabsContent value="tz" className="mt-4">
					<GenerateTZ />
				</TabsContent>
				<TabsContent value="estimate" className="mt-4">
					<AnalyzeEstimate />
				</TabsContent>
				<TabsContent value="act" className="mt-4">
					<GenerateAct />
				</TabsContent>
				<TabsContent value="tender" className="mt-4">
					<AnalyzeTender />
				</TabsContent>
			</Tabs>
		</div>
	);
}
