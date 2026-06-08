import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Instagram, RefreshCw, Rss, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { getApiErrorMessage } from "@/lib/api-error";

const CHANNELS = [
	{ value: "instagram", label: "Instagram" },
	{ value: "facebook", label: "Facebook" },
	{ value: "telegram", label: "Telegram" },
	{ value: "whatsapp", label: "WhatsApp" },
	{ value: "tiktok", label: "TikTok" },
	{ value: "other", label: "Другое" },
];

type IntakeSettings = {
	token: string | null;
	webhookUrl: string;
	enabled: boolean;
};

type InstagramSettings = {
	webhookKey?: string;
	verifyToken?: string;
	pageId?: string;
	instagramAccountId?: string;
	accessToken?: string | null;
	appSecret?: string | null;
	defaultProjectId?: number | null;
	webhookUrl?: string | null;
	status: "pending" | "webhook_ready" | "connected";
	hasAccessToken?: boolean;
	hasAppSecret?: boolean;
};

const IG_STATUS: Record<InstagramSettings["status"], { label: string; className: string }> = {
	pending: { label: "Не настроен", className: "bg-gray-100 text-gray-700" },
	webhook_ready: { label: "Webhook готов — добавьте Access Token", className: "bg-amber-100 text-amber-800" },
	connected: { label: "Подключён", className: "bg-emerald-100 text-emerald-800" },
};

export default function CrmLeadIntake() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [testForm, setTestForm] = useState({
		fullName: "",
		phone: "",
		channel: "instagram",
		externalId: "",
		notes: "",
	});
	const [igForm, setIgForm] = useState({
		verifyToken: "",
		pageId: "",
		instagramAccountId: "",
		accessToken: "",
		appSecret: "",
		defaultProjectId: "",
	});

	const { data: settings, isLoading } = useQuery({
		queryKey: ["crm-intake-settings"],
		queryFn: () => api.get("/crm/settings/intake").then((r) => r.data as IntakeSettings),
	});

	const { data: igSettings, isLoading: igLoading } = useQuery({
		queryKey: ["crm-instagram-settings"],
		queryFn: () => api.get("/crm/settings/instagram").then((r) => r.data as InstagramSettings),
	});

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	useEffect(() => {
		if (!igSettings || igLoading) return;
		setIgForm({
			verifyToken: igSettings.verifyToken ?? "",
			pageId: igSettings.pageId ?? "",
			instagramAccountId: igSettings.instagramAccountId ?? "",
			accessToken: "",
			appSecret: "",
			defaultProjectId: igSettings.defaultProjectId ? String(igSettings.defaultProjectId) : "",
		});
	}, [igSettings, igLoading]);

	const saveTokenMut = useMutation({
		mutationFn: (regenerate: boolean) =>
			api.put("/crm/settings/intake", { regenerate }).then((r) => r.data as IntakeSettings),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["crm-intake-settings"] });
			toast({ title: "Токен intake обновлён" });
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось сохранить настройки"),
				variant: "destructive",
			}),
	});

	const saveInstagramMut = useMutation({
		mutationFn: (opts?: { regenerateWebhook?: boolean; regenerateVerifyToken?: boolean }) =>
			api
				.put("/crm/settings/instagram", {
					verifyToken: igForm.verifyToken || undefined,
					pageId: igForm.pageId || undefined,
					instagramAccountId: igForm.instagramAccountId || undefined,
					accessToken: igForm.accessToken || undefined,
					appSecret: igForm.appSecret || undefined,
					defaultProjectId: igForm.defaultProjectId || undefined,
					regenerateWebhook: opts?.regenerateWebhook,
					regenerateVerifyToken: opts?.regenerateVerifyToken,
				})
				.then((r) => r.data as InstagramSettings),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["crm-instagram-settings"] });
			setIgForm((f) => ({ ...f, accessToken: "", appSecret: "" }));
			toast({ title: "Настройки Instagram сохранены" });
		},
		onError: (err) =>
			toast({
				title: getApiErrorMessage(err, "Не удалось сохранить Instagram"),
				variant: "destructive",
			}),
	});

	const copy = (text: string, label: string) => {
		void navigator.clipboard.writeText(text);
		toast({ title: `${label} скопирован` });
	};

	const webhookUrl = settings?.webhookUrl ?? `${getApiBase()}/crm/leads/intake`;
	const igWebhookUrl =
		igSettings?.webhookUrl ??
		(igSettings?.webhookKey
			? `${getApiBase()}/crm/webhooks/instagram/${igSettings.webhookKey}`
			: null);
	const igStatus = igSettings?.status ?? "pending";

	const testIntake = async () => {
		if (!settings?.token) {
			toast({ title: "Сначала сгенерируйте токен", variant: "destructive" });
			return;
		}
		if (!testForm.fullName.trim()) {
			toast({ title: "Укажите имя для теста", variant: "destructive" });
			return;
		}
		try {
			const res = await fetch(webhookUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Crm-Intake-Token": settings.token,
				},
				body: JSON.stringify({
					fullName: testForm.fullName,
					phone: testForm.phone || undefined,
					channel: testForm.channel,
					externalId: testForm.externalId || `test-${Date.now()}`,
					notes: testForm.notes || undefined,
					source: "social",
				}),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Intake failed");
			toast({
				title: body.deduplicated ? "Лид уже был (дедуп)" : "Тестовый лид принят",
			});
		} catch (err) {
			toast({
				title: getApiErrorMessage(err, "Ошибка тестового intake"),
				variant: "destructive",
			});
		}
	};

	return (
		<div className="space-y-6 max-w-3xl">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
					<Rss className="w-6 h-6 text-blue-600" />
					Приём лидов из соцсетей
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					Универсальный webhook или нативная интеграция Instagram (Meta). Access Token добавите позже — webhook уже можно настроить.
				</p>
			</div>

			<Tabs defaultValue="instagram">
				<TabsList>
					<TabsTrigger value="instagram" className="gap-1.5">
						<Instagram className="w-4 h-4" /> Instagram
					</TabsTrigger>
					<TabsTrigger value="generic">Универсальный webhook</TabsTrigger>
				</TabsList>

				<TabsContent value="instagram" className="space-y-4 mt-4">
					<div className="bg-white rounded-xl border p-5 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="font-semibold flex items-center gap-2">
								<Instagram className="w-4 h-4 text-pink-600" />
								Instagram / Meta Webhooks
							</h2>
							<Badge className={IG_STATUS[igStatus].className}>{IG_STATUS[igStatus].label}</Badge>
						</div>

						{!igWebhookUrl ? (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground">
									Нажмите «Инициализировать», чтобы получить URL webhook и Verify Token для Meta Developer Console.
								</p>
								<Button
									disabled={saveInstagramMut.isPending}
									onClick={() => saveInstagramMut.mutate({ regenerateWebhook: true, regenerateVerifyToken: true })}
								>
									Инициализировать Instagram
								</Button>
							</div>
						) : (
							<>
								<div className="space-y-2">
									<Label>Callback URL (Meta → Webhooks)</Label>
									<div className="flex gap-2">
										<Input readOnly value={igWebhookUrl} className="font-mono text-xs" />
										<Button type="button" variant="outline" size="icon" onClick={() => copy(igWebhookUrl, "Callback URL")}>
											<Copy className="w-4 h-4" />
										</Button>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Verify Token</Label>
									<div className="flex gap-2">
										<Input
											value={igForm.verifyToken}
											onChange={(e) => setIgForm((f) => ({ ...f, verifyToken: e.target.value }))}
											className="font-mono text-xs"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => igForm.verifyToken && copy(igForm.verifyToken, "Verify Token")}
										>
											<Copy className="w-4 h-4" />
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => saveInstagramMut.mutate({ regenerateVerifyToken: true })}
											disabled={saveInstagramMut.isPending}
										>
											<RefreshCw className="w-4 h-4" />
										</Button>
									</div>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									<div className="flex flex-col">
										<Label className="mb-1.5 leading-tight">Page ID</Label>
										<Input
											className="mt-auto font-mono text-xs"
											placeholder="Из Meta Business"
											value={igForm.pageId}
											onChange={(e) => setIgForm((f) => ({ ...f, pageId: e.target.value }))}
										/>
									</div>
									<div className="flex flex-col">
										<Label className="mb-1.5 leading-tight">Instagram Account ID</Label>
										<Input
											className="mt-auto font-mono text-xs"
											value={igForm.instagramAccountId}
											onChange={(e) => setIgForm((f) => ({ ...f, instagramAccountId: e.target.value }))}
										/>
									</div>
									<div className="flex flex-col col-span-2">
										<Label className="mb-1.5 leading-tight">Page Access Token</Label>
										<Input
											type="password"
											className="mt-auto font-mono text-xs"
											placeholder={igSettings?.hasAccessToken ? "•••••••• (оставьте пустым, чтобы не менять)" : "Добавите позже — для Lead Ads и профилей"}
											value={igForm.accessToken}
											onChange={(e) => setIgForm((f) => ({ ...f, accessToken: e.target.value }))}
										/>
									</div>
									<div className="flex flex-col col-span-2">
										<Label className="mb-1.5 leading-tight">App Secret (подпись webhook)</Label>
										<Input
											type="password"
											className="mt-auto font-mono text-xs"
											placeholder={igSettings?.hasAppSecret ? "••••••••" : "Из Meta App Dashboard — опционально до prod"}
											value={igForm.appSecret}
											onChange={(e) => setIgForm((f) => ({ ...f, appSecret: e.target.value }))}
										/>
									</div>
									<div className="flex flex-col col-span-2">
										<Label className="mb-1.5 leading-tight">Проект по умолчанию</Label>
										<Select
											value={igForm.defaultProjectId || "none"}
											onValueChange={(v) =>
												setIgForm((f) => ({ ...f, defaultProjectId: v === "none" ? "" : v }))
											}
										>
											<SelectTrigger className="mt-auto">
												<SelectValue placeholder="—" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">—</SelectItem>
												{projects.map((p: { id: number; name: string }) => (
													<SelectItem key={p.id} value={String(p.id)}>
														{p.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

									<Button onClick={() => saveInstagramMut.mutate(undefined)} disabled={saveInstagramMut.isPending}>
									Сохранить настройки
								</Button>

								<div className="rounded-lg bg-gray-50 p-4 text-sm space-y-2">
									<p className="font-medium">Настройка в Meta Developer Console</p>
									<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
										<li>Создайте App → добавьте продукты <strong>Instagram</strong> и <strong>Webhooks</strong></li>
										<li>Callback URL — скопируйте выше; Verify Token — тот же, что в поле</li>
										<li>Подпишитесь на <strong>messages</strong> (Instagram DM) и <strong>leadgen</strong> (Lead Ads)</li>
										<li>После выдачи доступов — вставьте Page Access Token и App Secret, сохраните</li>
									</ol>
									<p className="text-xs text-muted-foreground pt-1">
										Без Access Token DM всё равно создают лиды (текст + телефон из сообщения). Lead Ads подтянут поля формы после токена.
									</p>
								</div>
							</>
						)}
					</div>
				</TabsContent>

				<TabsContent value="generic" className="space-y-4 mt-4">
					<div className="bg-white rounded-xl border p-5 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="font-semibold flex items-center gap-2">
								<Webhook className="w-4 h-4" />
								Универсальный webhook
							</h2>
							{settings?.enabled ? (
								<Badge className="bg-emerald-100 text-emerald-800">Активен</Badge>
							) : (
								<Badge variant="outline">Не настроен</Badge>
							)}
						</div>

						<div className="space-y-2">
							<Label>URL</Label>
							<div className="flex gap-2">
								<Input readOnly value={webhookUrl} className="font-mono text-xs" />
								<Button type="button" variant="outline" size="icon" onClick={() => copy(webhookUrl, "URL")}>
									<Copy className="w-4 h-4" />
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Токен (X-Crm-Intake-Token)</Label>
							<div className="flex gap-2">
								<Input
									readOnly
									value={isLoading ? "…" : settings?.token ?? "—"}
									className="font-mono text-xs"
									type="password"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									disabled={!settings?.token}
									onClick={() => settings?.token && copy(settings.token, "Токен")}
								>
									<Copy className="w-4 h-4" />
								</Button>
								<Button
									type="button"
									variant="outline"
									className="gap-1"
									disabled={saveTokenMut.isPending}
									onClick={() => saveTokenMut.mutate(!settings?.token)}
								>
									<RefreshCw className="w-4 h-4" />
									{settings?.token ? "Перегенерировать" : "Сгенерировать"}
								</Button>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl border p-5 space-y-4">
						<h2 className="font-semibold">Тестовая отправка</h2>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col col-span-2">
								<Label className="mb-1.5 leading-tight">ФИО *</Label>
								<Input className="mt-auto" value={testForm.fullName} onChange={(e) => setTestForm((f) => ({ ...f, fullName: e.target.value }))} />
							</div>
							<div className="flex flex-col">
								<Label className="mb-1.5 leading-tight">Телефон</Label>
								<Input className="mt-auto" value={testForm.phone} onChange={(e) => setTestForm((f) => ({ ...f, phone: e.target.value }))} />
							</div>
							<div className="flex flex-col">
								<Label className="mb-1.5 leading-tight">Канал</Label>
								<Select value={testForm.channel} onValueChange={(v) => setTestForm((f) => ({ ...f, channel: v }))}>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CHANNELS.map((c) => (
											<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col col-span-2">
								<Label className="mb-1.5 leading-tight">External ID</Label>
								<Input className="mt-auto" placeholder="msg_12345" value={testForm.externalId} onChange={(e) => setTestForm((f) => ({ ...f, externalId: e.target.value }))} />
							</div>
							<div className="flex flex-col col-span-2">
								<Label className="mb-1.5 leading-tight">Заметка</Label>
								<Textarea className="mt-auto" value={testForm.notes} onChange={(e) => setTestForm((f) => ({ ...f, notes: e.target.value }))} />
							</div>
						</div>
						<Button onClick={testIntake}>Отправить тест</Button>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
