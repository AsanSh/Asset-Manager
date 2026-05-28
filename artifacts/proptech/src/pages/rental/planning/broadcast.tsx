import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Send, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getListTenantsQueryKey, getListLeaseContractsQueryKey } from "@/lib/rental-query-keys";

export default function RentalBroadcast() {
	const { toast } = useToast();
	const [message, setMessage] = useState("");
	const [type, setType] = useState("all");
	const [channel, setChannel] = useState("sms");
	const [sent, setSent] = useState(false);
	const [sending, setSending] = useState(false);

	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: getListTenantsQueryKey(),
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery<any[]>({
		queryKey: ["rental-accruals"],
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];

	const today = new Date().toISOString().split("T")[0];
	const overdueTenantIds = new Set(
		accrualsArray
			.filter(
				(a: any) =>
					parseFloat(a.balance || "0") > 0 && (a.dueDate || "") < today,
			)
			.map(
				(a: any) =>
					contractsArray.find((c: any) => c.id === a.leaseContractId)?.tenantId,
			)
			.filter(Boolean),
	);
	const activeTenantIds = new Set(
		contractsArray
			.filter((c: any) => c.status === "active")
			.map((c: any) => c.tenantId),
	);

	const tenantLabel = (t: any) =>
		t.fullName || t.name || `Арендатор #${t.id}`;

	const recipients = tenantsArray.filter((t: any) => {
		if (type === "all") return activeTenantIds.has(t.id);
		if (type === "overdue") return overdueTenantIds.has(t.id);
		if (type === "active")
			return activeTenantIds.has(t.id) && !overdueTenantIds.has(t.id);
		return false;
	});

	const templates = [
		{
			label: "Напоминание об оплате",
			text: "Уважаемый арендатор, напоминаем, что приближается срок оплаты аренды. Просим произвести оплату своевременно.",
		},
		{
			label: "Уведомление о долге",
			text: "Уважаемый арендатор, обращаем ваше внимание на наличие задолженности по арендной плате. Просим погасить долг в ближайшее время.",
		},
		{
			label: "Плановое обслуживание",
			text: "Уважаемый арендатор, сообщаем о плановом техническом обслуживании здания. Просим отнестись с пониманием к возможным неудобствам.",
		},
		{
			label: "Поздравление",
			text: "Уважаемые арендаторы, поздравляем вас с наступающими праздниками! Желаем вам успехов и процветания.",
		},
	];

	async function handleSend() {
		if (!message.trim()) {
			toast({ title: "Введите текст сообщения", variant: "destructive" });
			return;
		}
		if (recipients.length === 0) {
			toast({ title: "Нет получателей", variant: "destructive" });
			return;
		}
		setSending(true);
		await new Promise((r) => setTimeout(r, 1200));
		setSending(false);
		setSent(true);
		toast({ title: `Отправлено ${recipients.length} получателям` });
	}

	if (sent) {
		return (
			<div>
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-gray-900">
						Массовая рассылка
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Уведомления арендаторам
					</p>
				</div>
				<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-12 text-center">
					<CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-emerald-800 mb-2">
						Сообщение отправлено!
					</h3>
					<p className="text-sm text-emerald-600 mb-6">
						Отправлено {recipients.length} получателям через{" "}
						{channel === "sms"
							? "СМС"
							: channel === "whatsapp"
								? "WhatsApp"
								: "Email"}
					</p>
					<Button
						onClick={() => {
							setSent(false);
							setMessage("");
						}}
					>
						Новая рассылка
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Массовая рассылка</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Отправка уведомлений арендаторам
				</p>
			</div>

			<div className="grid grid-cols-3 gap-6">
				<div className="col-span-2 space-y-5">
					<div className="bg-white border rounded-lg p-5">
						<h3 className="font-semibold text-gray-800 mb-4">Получатели</h3>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-sm font-medium mb-1.5 block">
									Аудитория
								</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Все активные арендаторы</SelectItem>
										<SelectItem value="overdue">Только должники</SelectItem>
										<SelectItem value="active">Без задолженностей</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-sm font-medium mb-1.5 block">
									Канал
								</Label>
								<Select value={channel} onValueChange={setChannel}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="sms">СМС</SelectItem>
										<SelectItem value="whatsapp">WhatsApp</SelectItem>
										<SelectItem value="email">Email</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="mt-3 flex items-center gap-2">
							<Users className="w-4 h-4 text-blue-500" />
							<span className="text-sm text-gray-600">
								Получателей:{" "}
								<strong className="text-gray-900">{recipients.length}</strong>
							</span>
							{type === "overdue" && (
								<Badge className="bg-rose-100 text-rose-700 text-xs">
									только должники
								</Badge>
							)}
						</div>
					</div>

					<div className="bg-white border rounded-lg p-5">
						<h3 className="font-semibold text-gray-800 mb-4">Сообщение</h3>
						<div className="mb-3 flex gap-2 flex-wrap">
							{templates.map((t) => (
								<button
									key={t.label}
									onClick={() => setMessage(t.text)}
									className="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
								>
									{t.label}
								</button>
							))}
						</div>
						<Textarea
							rows={5}
							placeholder="Введите текст сообщения..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							className="resize-none"
						/>
						<div className="flex items-center justify-between mt-2">
							<span className="text-xs text-gray-400">
								{message.length} символов
							</span>
							{channel === "sms" && message.length > 160 && (
								<span className="text-xs text-amber-600">
									{Math.ceil(message.length / 160)} СМС на получателя
								</span>
							)}
						</div>
					</div>

					<Button
						className="w-full gap-2"
						onClick={handleSend}
						disabled={sending}
					>
						<Send className="w-4 h-4" />
						{sending
							? "Отправка..."
							: `Отправить ${recipients.length} получателям`}
					</Button>
				</div>

				<div className="space-y-4">
					<div className="bg-white border rounded-lg p-4">
						<h4 className="text-sm font-semibold text-gray-700 mb-3">
							Список получателей
						</h4>
						{recipients.length === 0 ? (
							<p className="text-xs text-gray-400 text-center py-4">
								Нет получателей
							</p>
						) : (
							<div className="space-y-2 max-h-80 overflow-y-auto">
								{recipients.map((t: any) => {
									const label = tenantLabel(t);
									return (
									<div key={t.id} className="flex items-center gap-2">
										<div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
											{label.charAt(0).toUpperCase()}
										</div>
										<div className="min-w-0">
											<p className="text-xs font-medium text-gray-800 truncate">
												{label}
											</p>
											{t.phone && (
												<p className="text-[10px] text-gray-400 truncate">{t.phone}</p>
											)}
											{overdueTenantIds.has(t.id) && (
												<Badge className="text-[10px] px-1 py-0 bg-rose-100 text-rose-600">
													долг
												</Badge>
											)}
										</div>
									</div>
								);})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
