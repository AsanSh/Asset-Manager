import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	Building2,
	CheckCircle,
	CreditCard,
	Download,
	FileText,
	Home,
	LogOut,
	Printer,
	Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	review: "На утверждении",
	signed: "Подписан",
	cancelled: "Расторгнут",
	completed: "Завершён",
};

export default function BuyerPortal({ previewBuyerId }: { previewBuyerId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const isPreview = !!previewBuyerId;

	const { data, isLoading } = useQuery({
		queryKey: isPreview ? ["portal-buyer-preview", previewBuyerId] : ["portal-buyer-me"],
		queryFn: () => {
			const url = isPreview
				? `/portal/buyer/preview/${previewBuyerId}`
				: "/portal/buyer/me";
			return api.get(url).then((r) => r.data);
		},
	});

	const handleDownloadContract = async (contractId: number) => {
		try {
			const { data: doc } = await api.get(
				`/portal/buyer/contract-document?contractId=${contractId}`,
			);
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
				<div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const buyer = data?.buyer;
	const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
	const accruals = Array.isArray(data?.accruals) ? data.accruals : [];
	const payments = Array.isArray(data?.payments) ? data.payments : [];
	const summary = data?.summary ?? {};
	const reconciliation = data?.reconciliation ?? {};
	const lines = Array.isArray(reconciliation.lines) ? reconciliation.lines : [];
	const currency = summary.currency ?? "KGS";
	const outstanding = parseFloat(String(summary.outstanding ?? 0));

	const userName = isPreview
		? data?.buyer?.fullName || "Покупатель"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Покупатель";

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
							<Home className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">BuildFlow</p>
							<p className="text-[10px] text-gray-400 -mt-0.5">Портал покупателя</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{isPreview && (
							<span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
								👁 Предпросмотр для админа
							</span>
						)}
						<span className="text-sm text-gray-600 font-medium">{userName}</span>
						{!isPreview && (
							<Button
								variant="ghost"
								size="sm"
								onClick={logout}
								className="text-gray-500 gap-1.5"
							>
								<LogOut className="w-4 h-4" /> Выйти
							</Button>
						)}
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
				<div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-2xl p-6 text-white">
					<p className="text-sm opacity-80 mb-1">Добро пожаловать,</p>
					<h1 className="text-2xl font-bold">{buyer?.fullName || userName}</h1>
					<p className="text-sm opacity-70 mt-1">Личный кабинет покупателя</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<KPI
						icon={<Building2 className="w-6 h-6 text-blue-600" />}
						label="Договоров"
						value={`${contracts.length}`}
						sub={`активных: ${summary.activeContracts ?? 0}`}
						color="bg-blue-50"
					/>
					<KPI
						icon={<Wallet className="w-6 h-6 text-emerald-600" />}
						label="Оплачено"
						value={`${fmt(summary.totalPaid)} ${currency}`}
						sub={`${payments.length} платежей`}
						color="bg-emerald-50"
					/>
					<KPI
						icon={<CreditCard className="w-6 h-6 text-amber-600" />}
						label="По графику"
						value={`${fmt(summary.totalCharged)} ${currency}`}
						sub={`${accruals.length} начислений`}
						color="bg-amber-50"
					/>
					<KPI
						icon={
							outstanding > 0 ? (
								<AlertCircle className="w-6 h-6 text-rose-600" />
							) : (
								<CheckCircle className="w-6 h-6 text-emerald-600" />
							)
						}
						label="Задолженность"
						value={`${fmt(Math.abs(outstanding))} ${currency}`}
						sub={outstanding > 0 ? "к оплате" : "нет долга"}
						color={outstanding > 0 ? "bg-rose-50" : "bg-emerald-50"}
					/>
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
						<FileText className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">Мои договоры</h2>
					</div>
					{contracts.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет договоров</p>
						</div>
					) : (
						<div className="divide-y">
							{contracts.map((c: any) => (
								<div key={c.id} className="px-6 py-4 flex items-center gap-4">
									<div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
										<Home className="w-5 h-5 text-sky-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-gray-900 truncate">
											{c.projectName || "Объект"}
											{c.unitNumber ? ` · ${c.unitNumber}` : ""}
										</p>
										<p className="text-xs text-gray-500">
											№{c.contractNumber} · {fmtDate(c.contractDate || "")}
										</p>
										<p className="text-sm font-medium text-gray-800 mt-0.5">
											{fmt(c.totalAmount)} {c.currency || currency}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary" className="text-xs">
											{STATUS_LABELS[c.status] || c.status}
										</Badge>
										{c.contractDocument && (
											<Button
												variant="outline"
												size="sm"
												className="gap-1 text-xs"
												onClick={() => void handleDownloadContract(c.id)}
											>
												<Download className="w-3.5 h-3.5" /> Договор
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
						<CreditCard className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">График платежей</h2>
					</div>
					{accruals.length === 0 ? (
						<div className="py-10 text-center text-gray-400 text-sm">
							График ещё не сформирован
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-6 py-3 font-medium">№</th>
										<th className="px-6 py-3 font-medium">Срок</th>
										<th className="px-6 py-3 font-medium text-right">Сумма</th>
										<th className="px-6 py-3 font-medium text-right">Оплачено</th>
										<th className="px-6 py-3 font-medium">Статус</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{accruals.map((a: any) => (
										<tr key={a.id} className="hover:bg-gray-50">
											<td className="px-6 py-3 text-gray-600">{a.installmentNumber}</td>
											<td className="px-6 py-3 text-gray-600">{fmtDate(a.dueDate)}</td>
											<td className="px-6 py-3 text-right font-medium">
												{fmt(a.amount)} {a.currency || currency}
											</td>
											<td className="px-6 py-3 text-right text-emerald-700">
												{fmt(a.paidAmount)} {a.currency || currency}
											</td>
											<td className="px-6 py-3">
												<Badge variant="secondary" className="text-xs">
													{a.status}
												</Badge>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
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
					<div className="px-6 py-4 border-b bg-gray-50/50 text-sm grid grid-cols-3 gap-4">
						<div>
							<p className="text-gray-500 text-xs">По графику</p>
							<p className="font-semibold">{fmt(summary.totalCharged)} {currency}</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Оплачено</p>
							<p className="font-semibold text-emerald-700">
								{fmt(summary.totalPaid)} {currency}
							</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Остаток</p>
							<p
								className={`font-semibold ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}
							>
								{fmt(outstanding)} {currency}
							</p>
						</div>
					</div>
					{lines.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<p className="text-sm">Нет операций</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-6 py-3 font-medium">Дата</th>
										<th className="px-6 py-3 font-medium">Тип</th>
										<th className="px-6 py-3 font-medium">Описание</th>
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
												{line.type === "charge" ? "График" : "Оплата"}
											</td>
											<td className="px-6 py-3 text-gray-800">{line.description}</td>
											<td className="px-6 py-3 text-right font-medium">
												{fmt(line.charged ?? line.paid)} {line.currency ?? currency}
											</td>
											<td className="px-6 py-3 text-right text-gray-600">
												{fmt(line.balanceAfter)} {currency}
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
