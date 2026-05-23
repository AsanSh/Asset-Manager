import {
	AlertTriangle,
	CheckCircle2,
	FileSearch,
	Loader2,
	Upload,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const NORMS = [
	{ id: "snip-3.03.01-87", label: "СНиП 3.03.01-87 — Несущие конструкции" },
	{
		id: "sp-70",
		label: "СП 70.13330.2012 — Несущие конструкции (актуализация)",
	},
	{ id: "snip-21-01-97", label: "СНиП 21-01-97 — Пожарная безопасность" },
	{
		id: "sp-112",
		label: "СП 112.13330.2011 — Пожарная безопасность (актуализация)",
	},
	{
		id: "snip-2.04.01-85",
		label: "СНиП 2.04.01-85 — Внутренний водопровод и канализация",
	},
	{
		id: "sp-30",
		label: "СП 30.13330.2020 — Внутренний водопровод и канализация",
	},
	{ id: "snip-23-01-99", label: "СНиП 23-01-99 — Строительная климатология" },
	{ id: "sp-131", label: "СП 131.13330 — Строительная климатология" },
];

interface CheckItem {
	norm: string;
	status: "ok" | "warning" | "violation";
	description: string;
	detail?: string;
}

interface CheckResult {
	summary: string;
	checks: CheckItem[];
	recommendations: string[];
}

export default function SnipCheck() {
	const [documentText, setDocumentText] = useState("");
	const [selectedNorms, setSelectedNorms] = useState<string[]>([
		"snip-21-01-97",
		"snip-3.03.01-87",
	]);
	const [result, setResult] = useState<CheckResult | null>(null);
	const [loading, setLoading] = useState(false);

	const toggleNorm = (id: string) => {
		setSelectedNorms((prev) =>
			prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
		);
	};

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => setDocumentText(ev.target?.result as string);
		reader.readAsText(file, "utf-8");
	};

	const runCheck = async () => {
		if (!documentText.trim()) {
			toast.error("Вставьте или загрузите текст документа");
			return;
		}
		setLoading(true);
		setResult(null);
		try {
			const norms = selectedNorms.map(
				(id) => NORMS.find((n) => n.id === id)?.label ?? id,
			);
			const { data } = await api.post("/ai/snip-check", {
				documentText,
				norms,
			});
			setResult(data);
		} catch {
			toast.error("Ошибка проверки");
		} finally {
			setLoading(false);
		}
	};

	const statusIcon = (status: CheckItem["status"]) => {
		if (status === "ok")
			return <CheckCircle2 className="w-5 h-5 text-green-500" />;
		if (status === "warning")
			return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
		return <XCircle className="w-5 h-5 text-red-500" />;
	};

	const statusBadge = (status: CheckItem["status"]) => {
		if (status === "ok")
			return (
				<Badge className="bg-green-100 text-green-700 border-green-200">
					Соответствует
				</Badge>
			);
		if (status === "warning")
			return (
				<Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
					Замечание
				</Badge>
			);
		return (
			<Badge className="bg-red-100 text-red-700 border-red-200">
				Нарушение
			</Badge>
		);
	};

	const counts = result
		? {
				ok: result.checks.filter((c) => c.status === "ok").length,
				warning: result.checks.filter((c) => c.status === "warning").length,
				violation: result.checks.filter((c) => c.status === "violation").length,
			}
		: null;

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Проверка по СНиП / СП</h1>
				<p className="text-muted-foreground text-sm mt-1">
					AI анализирует документ и проверяет соответствие выбранным
					строительным нормам
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Документ для проверки</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors">
								<Upload className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									Загрузить файл (.txt)
								</span>
								<input
									type="file"
									className="hidden"
									accept=".txt,.md"
									onChange={handleFile}
								/>
							</label>
							<Textarea
								value={documentText}
								onChange={(e) => setDocumentText(e.target.value)}
								placeholder="Или вставьте текст проектной документации..."
								rows={12}
								className="font-mono text-sm"
							/>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Нормативная база</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{NORMS.map((norm) => (
								<div key={norm.id} className="flex items-start gap-2">
									<Checkbox
										id={norm.id}
										checked={selectedNorms.includes(norm.id)}
										onCheckedChange={() => toggleNorm(norm.id)}
										className="mt-0.5"
									/>
									<Label
										htmlFor={norm.id}
										className="text-xs leading-relaxed cursor-pointer"
									>
										{norm.label}
									</Label>
								</div>
							))}
						</CardContent>
					</Card>

					<Button onClick={runCheck} disabled={loading} className="w-full">
						{loading ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Анализирую...
							</>
						) : (
							<>
								<FileSearch className="w-4 h-4 mr-2" />
								Проверить
							</>
						)}
					</Button>
				</div>
			</div>

			{result && (
				<div className="space-y-4">
					{counts && (
						<div className="grid grid-cols-3 gap-4">
							<Card className="border-green-200 bg-green-50 dark:bg-green-950">
								<CardContent className="pt-4 text-center">
									<p className="text-3xl font-bold text-green-600">
										{counts.ok}
									</p>
									<p className="text-sm text-green-700 mt-1">Соответствует</p>
								</CardContent>
							</Card>
							<Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
								<CardContent className="pt-4 text-center">
									<p className="text-3xl font-bold text-yellow-600">
										{counts.warning}
									</p>
									<p className="text-sm text-yellow-700 mt-1">Замечания</p>
								</CardContent>
							</Card>
							<Card className="border-red-200 bg-red-50 dark:bg-red-950">
								<CardContent className="pt-4 text-center">
									<p className="text-3xl font-bold text-red-600">
										{counts.violation}
									</p>
									<p className="text-sm text-red-700 mt-1">Нарушения</p>
								</CardContent>
							</Card>
						</div>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Резюме</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm">{result.summary}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Результаты проверки</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{result.checks.map((check, i) => (
								<div key={i} className="border rounded-lg p-3 space-y-1">
									<div className="flex items-center gap-2">
										{statusIcon(check.status)}
										<span className="font-medium text-sm">{check.norm}</span>
										<div className="ml-auto">{statusBadge(check.status)}</div>
									</div>
									<p className="text-sm text-muted-foreground pl-7">
										{check.description}
									</p>
									{check.detail && (
										<p className="text-xs text-muted-foreground pl-7 italic">
											{check.detail}
										</p>
									)}
								</div>
							))}
						</CardContent>
					</Card>

					{result.recommendations.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Рекомендации</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2">
									{result.recommendations.map((r, i) => (
										<li key={i} className="flex items-start gap-2 text-sm">
											<span className="text-primary font-bold mt-0.5">
												{i + 1}.
											</span>
											<span>{r}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
