import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle,
	CreditCard,
	Download,
	Factory,
	FileText,
	LogOut,
	Package,
	Printer,
	Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fmt(n: unknown) {
	const num = parseFloat(String(n ?? 0));
	return num.toLocaleString("ru-KG", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function fmtDate(d: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function KPI({
	icon,
	label,
	value,
	sub,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
	color: string;
}) {
	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
			<div
				className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				{icon}
			</div>
			<div>
				<p className="text-xs text-gray-500 font-medium">{label}</p>
				<p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

export default function SupplierPortal() {
	const { user, logout } = useAuth();
	const { toast } = useToast();

	const { data, isLoading } = useQuery({
		queryKey: ["portal-supplier-me"],
		queryFn: () => api.get("/portal/supplier/me").then((r) => r.data),
	});

	const handleDownloadContract = async () => {
		try {
			const { data: doc } = await api.get("/portal/supplier/contract-document");
			const bytes = Uint8Array.from(atob(doc.dataBase64), (c) => c.charCodeAt(0));
			const blob = new Blob([bytes], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = doc.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast({ title: "Договор не загружен", variant: "destructive" });
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const supplier = data?.supplier;
	const summary = data?.summary ?? {};
	const reconciliation = data?.reconciliation ?? {};
	const lines = Array.isArray(reconciliation.lines) ? reconciliation.lines : [];
	const currency = summary.currency ?? "KGS";
	const outstanding = parseFloat(String(summary.outstanding ?? 0));

	const userName =
		[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Поставщик";

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
							<Factory className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">BuildFlow</p>
							<p className="text-[10px] text-gray-400 -mt-0.5">
								Портал поставщика
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-600 font-medium">{userName}</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={logout}
							className="text-gray-500 gap-1.5"
						>
							<LogOut className="w-4 h-4" /> Выйти
						</Button>
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
				<div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
					<p className="text-sm opacity-80 mb-1">Добро пожаловать,</p>
					<h1 className="text-2xl font-bold">
						{supplier?.name || userName}
					</h1>
					<p className="text-sm opacity-70 mt-1">Личный кабинет поставщика</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<KPI
						icon={<FileText className="w-6 h-6 text-emerald-600" />}
						label="Сумма договора"
						value={`${fmt(summary.contractAmount)} ${currency}`}
						sub={summary.contractNumber ? `№ ${summary.contractNumber}` : undefined}
						color="bg-emerald-50"
					/>
					<KPI
						icon={<Wallet className="w-6 h-6 text-blue-600" />}
						label="Получено оплат"
						value={`${fmt(summary.paidAmount)} ${currency}`}
						sub="по данным договора"
						color="bg-blue-50"
					/>
					<KPI
						icon={
							outstanding > 0 ? (
								<AlertCircle className="w-6 h-6 text-amber-600" />
							) : (
								<CheckCircle className="w-6 h-6 text-emerald-600" />
							)
						}
						label="Остаток к оплате"
						value={`${fmt(Math.abs(outstanding))} ${currency}`}
						sub={outstanding > 0 ? "к получению" : outstanding < 0 ? "переплата" : "оплачено полностью"}
						color={outstanding > 0 ? "bg-amber-50" : "bg-emerald-50"}
					/>
					<KPI
						icon={<Package className="w-6 h-6 text-violet-600" />}
						label="Поставлено"
						value={`${fmt(summary.totalSupplied)} ${currency}`}
						sub={`${lines.length} поставок`}
						color="bg-violet-50"
					/>
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
						<div className="flex items-center gap-3">
							<FileText className="w-4 h-4 text-gray-500" />
							<h2 className="font-semibold text-gray-900">Договор</h2>
						</div>
						{supplier?.contractDocument && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleDownloadContract()}
								className="gap-1.5 text-xs"
							>
								<Download className="w-3.5 h-3.5" /> Скачать
							</Button>
						)}
					</div>
					<div className="px-6 py-5">
						{supplier?.contractDocument ? (
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
									<FileText className="w-5 h-5 text-emerald-600" />
								</div>
								<div>
									<p className="font-medium text-gray-900">
										{supplier.contractDocument.fileName}
									</p>
									<p className="text-xs text-gray-400">
										Загружен {fmtDate(supplier.contractDocument.uploadedAt)}
									</p>
								</div>
							</div>
						) : (
							<p className="text-sm text-gray-400 text-center py-6">
								Договор ещё не загружен заказчиком
							</p>
						)}
					</div>
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none">
					<div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
						<div className="flex items-center gap-3">
							<CreditCard className="w-4 h-4 text-gray-500" />
							<h2 className="font-semibold text-gray-900">Акт сверки</h2>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.print()}
							className="gap-1.5 text-xs print:hidden"
						>
							<Printer className="w-3.5 h-3.5" /> Распечатать
						</Button>
					</div>
					<div className="px-6 py-4 border-b bg-gray-50/50 text-sm grid grid-cols-4 gap-4">
						<div>
							<p className="text-gray-500 text-xs">Договор</p>
							<p className="font-semibold">{fmt(summary.contractAmount)} {currency}</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Оплачено</p>
							<p className="font-semibold text-emerald-700">{fmt(summary.paidAmount)} {currency}</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Остаток</p>
							<p className={`font-semibold ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
								{fmt(outstanding)} {currency}
							</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Поставлено</p>
							<p className="font-semibold text-violet-700">{fmt(summary.totalSupplied)} {currency}</p>
						</div>
					</div>
					{lines.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет операций</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-6 py-3 font-medium">Дата</th>
										<th className="px-6 py-3 font-medium">Тип</th>
										<th className="px-6 py-3 font-medium">Операция</th>
										<th className="px-6 py-3 font-medium text-right">Сумма</th>
										<th className="px-6 py-3 font-medium text-right">Баланс</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{lines.map((line: any, i: number) => (
										<tr key={i} className="hover:bg-gray-50">
											<td className="px-6 py-3 text-gray-600 whitespace-nowrap">
												{fmtDate(line.date)}
											</td>
											<td className="px-6 py-3 text-gray-600">
												{line.type === "payment" ? "Оплата" : "Поставка"}
											</td>
											<td className="px-6 py-3 text-gray-800">{line.description}</td>
											<td
												className={`px-6 py-3 text-right font-medium ${line.type === "payment" ? "text-emerald-700" : "text-violet-700"}`}
											>
												{fmt(line.amount)} {line.currency ?? currency}
											</td>
											<td className="px-6 py-3 text-right text-gray-600">
												{line.type === "payment"
													? `${fmt(line.balanceAfter ?? 0)} ${currency}`
													: `${fmt(line.suppliedTotal ?? 0)} ${currency}`}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
