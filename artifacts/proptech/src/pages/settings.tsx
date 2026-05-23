import { useQueryClient } from "@tanstack/react-query";
import {
	BarChart3,
	Bell,
	Building2,
	CheckCircle2,
	Eye,
	EyeOff,
	FileText,
	Home,
	KeyRound,
	LayoutGrid,
	Loader2,
	Save,
	Shield,
	TrendingUp,
	User,
	Users,
	Wrench,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const BASE = getApiBase();

async function apiFetch(path: string, options?: RequestInit) {
	const token = localStorage.getItem("auth_token");
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Ошибка запроса");
	return data;
}

interface Company {
	id: number;
	name: string;
	legalName: string | null;
	bin: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
}

interface Module {
	key: string;
	name: string;
	description: string;
	icon: string;
	category: string;
	isEnabled: boolean;
	enabledAt: string | null;
}

const ICON_MAP: Record<string, React.ElementType> = {
	Home,
	BarChart3,
	Bell,
	Users,
	Wrench,
	TrendingUp,
	FileText,
	Building2: Building2,
	BarChart2: BarChart3,
};

const CATEGORY_LABELS: Record<string, string> = {
	core: "Основные",
	analytics: "Аналитика",
	communication: "Коммуникация",
	operations: "Операции",
};

export default function Settings() {
	const { user } = useAuth();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);
	const [activeTab, setActiveTab] = useState<"org" | "profile" | "modules">(
		"org",
	);
	const userRole = user?.role;
	const isAdmin =
		userRole === "super_admin" || userRole === "company_admin";

	// Debug: log user role for troubleshooting
	useEffect(() => {
		console.log("Settings page - full user object:", user);
		console.log("Settings page - user role:", userRole, "isAdmin:", isAdmin);
	}, [user, userRole, isAdmin]);

	const [org, setOrg] = useState<Company | null>(null);
	const [form, setForm] = useState({
		name: "",
		legalName: "",
		bin: "",
		phone: "",
		email: "",
		address: "",
	});
	const [modules, setModules] = useState<Module[]>([]);
	const [modulesLoading, setModulesLoading] = useState(true);
	const [modulesError, setModulesError] = useState(false);
	const [togglingModule, setTogglingModule] = useState<string | null>(null);

	const [profileForm, setProfileForm] = useState({
		firstName: "",
		lastName: "",
	});
	const [passwordForm, setPasswordForm] = useState({
		current: "",
		next: "",
		confirm: "",
	});
	const [showPasswords, setShowPasswords] = useState(false);

	useEffect(() => {
		// Verify user role by checking API directly
		apiFetch("/auth/me")
			.then((data: any) => {
				console.log("Settings - User from API:", data);
				console.log("Settings - User role from API:", data.role);
			})
			.catch((err) => console.error("Failed to fetch user:", err));

		apiFetch("/companies/my")
			.then((data: Company) => {
				setOrg(data);
				setForm({
					name: data.name || "",
					legalName: data.legalName || "",
					bin: data.bin || "",
					phone: data.phone || "",
					email: data.email || "",
					address: data.address || "",
				});
			})
			.catch(() =>
				toast({
					title: "Ошибка",
					description: "Не удалось загрузить данные организации",
					variant: "destructive",
				}),
			)
			.finally(() => setLoading(false));

		apiFetch("/modules")
			.then((data) => {
				setModules(data);
				setModulesError(false);
			})
			.catch(() => setModulesError(true))
			.finally(() => setModulesLoading(false));
	}, [toast]);

	useEffect(() => {
		if (user) {
			setProfileForm({
				firstName: (user as any).firstName || "",
				lastName: (user as any).lastName || "",
			});
		}
	}, [user]);

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
			toast({
				title: "Ошибка",
				description: "Имя и фамилия обязательны",
				variant: "destructive",
			});
			return;
		}
		setSavingProfile(true);
		try {
			await apiFetch("/auth/me", {
				method: "PATCH",
				body: JSON.stringify({
					firstName: profileForm.firstName,
					lastName: profileForm.lastName,
				}),
			});
			await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
			toast({ title: "Сохранено", description: "Данные профиля обновлены" });
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setSavingProfile(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!passwordForm.next) {
			toast({
				title: "Ошибка",
				description: "Введите новый пароль",
				variant: "destructive",
			});
			return;
		}
		if (passwordForm.next.length < 6) {
			toast({
				title: "Ошибка",
				description: "Пароль должен быть не менее 6 символов",
				variant: "destructive",
			});
			return;
		}
		if (passwordForm.next !== passwordForm.confirm) {
			toast({
				title: "Ошибка",
				description: "Пароли не совпадают",
				variant: "destructive",
			});
			return;
		}
		setSavingProfile(true);
		try {
			await apiFetch("/auth/me", {
				method: "PATCH",
				body: JSON.stringify({ password: passwordForm.next }),
			});
			setPasswordForm({ current: "", next: "", confirm: "" });
			toast({ title: "Готово", description: "Пароль успешно изменён" });
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setSavingProfile(false);
		}
	};

	const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm((f) => ({ ...f, [field]: e.target.value }));

	const handleSaveOrg = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name) {
			toast({
				title: "Ошибка",
				description: "Название организации обязательно",
				variant: "destructive",
			});
			return;
		}
		setSaving(true);
		try {
			await apiFetch("/companies/my", {
				method: "PATCH",
				body: JSON.stringify(form),
			});
			toast({
				title: "Сохранено",
				description: "Данные организации обновлены",
			});
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleToggleModule = async (key: string) => {
		if (key === "rental") {
			toast({
				title: "Нельзя отключить",
				description: "Модуль аренды всегда активен",
				variant: "destructive",
			});
			return;
		}
		setTogglingModule(key);
		try {
			const result = await apiFetch(`/modules/${key}/toggle`, {
				method: "POST",
			});
			setModules((prev) =>
				prev.map((m) =>
					m.key === key
						? { ...m, isEnabled: result.isEnabled, enabledAt: result.enabledAt }
						: m,
				),
			);
			const mod = modules.find((m) => m.key === key);
			toast({
				title: result.isEnabled ? "Модуль включён" : "Модуль выключен",
				description: mod?.name,
			});
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setTogglingModule(null);
		}
	};

	const groupedModules = modules.reduce(
		(acc, m) => {
			const cat = m.category || "other";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(m);
			return acc;
		},
		{} as Record<string, Module[]>,
	);

	const tabs = [
		{ id: "org", label: "Организация", icon: Building2 },
		{ id: "profile", label: "Мой профиль", icon: User },
		{ id: "modules", label: "Модули", icon: LayoutGrid },
	];

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
				<p className="text-gray-500 text-sm mt-1">
					Управление организацией, аккаунтом и модулями системы
				</p>
			</div>

			{/* Tabs */}
			<div className="flex border-b border-gray-200 gap-0">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id as any)}
						className={cn(
							"flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
							activeTab === tab.id
								? "border-blue-600 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700",
						)}
					>
						<tab.icon className="h-4 w-4" />
						{tab.label}
					</button>
				))}
			</div>

			{/* Org tab */}
			{activeTab === "org" && (
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-blue-500" />
						</div>
					) : (
						<>
							<div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
								<div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center">
									<Building2 className="h-6 w-6 text-blue-600" />
								</div>
								<div>
									<h2 className="font-semibold text-gray-900">
										{org?.name || "Организация"}
									</h2>
									<div className="flex items-center gap-1.5 mt-0.5">
										<Shield className="h-3.5 w-3.5 text-blue-500" />
										<span className="text-xs text-blue-600 font-medium">
											{isAdmin ? "Администратор" : "Сотрудник"}
										</span>
									</div>
								</div>
							</div>
							{isAdmin ? (
								<form onSubmit={handleSaveOrg} className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Название компании *
										</Label>
										<Input
											value={form.name}
											onChange={set("name")}
											required
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Юридическое название
										</Label>
										<Input
											value={form.legalName}
											onChange={set("legalName")}
											placeholder="Полное юридическое наименование"
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label className="text-sm font-medium text-gray-700">
												ИНН / ИНО
											</Label>
											<Input
												value={form.bin}
												onChange={set("bin")}
												placeholder="12345678901234"
												className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
											/>
										</div>
										<div>
											<Label className="text-sm font-medium text-gray-700">
												Телефон
											</Label>
											<Input
												value={form.phone}
												onChange={set("phone")}
												placeholder="+996 700 000 000"
												className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
											/>
										</div>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Email организации
										</Label>
										<Input
											type="email"
											value={form.email}
											onChange={set("email")}
											placeholder="info@company.kg"
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Юридический адрес
										</Label>
										<Input
											value={form.address}
											onChange={set("address")}
											placeholder="г. Бишкек, ул. Манаса 72"
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<div className="pt-2">
										<Button
											type="submit"
											disabled={saving}
											className="h-11 px-6 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700"
										>
											{saving ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Сохранение...
												</>
											) : (
												<>
													<Save className="h-4 w-4 mr-2" />
													Сохранить изменения
												</>
											)}
										</Button>
									</div>
								</form>
							) : (
								<div className="space-y-4">
									{[
										{ label: "Название", value: org?.name },
										{ label: "Юридическое название", value: org?.legalName },
										{ label: "ИНН / ИНО", value: org?.bin },
										{ label: "Телефон", value: org?.phone },
										{ label: "Email", value: org?.email },
										{ label: "Адрес", value: org?.address },
									].map(({ label, value }) => (
										<div
											key={label}
											className="flex py-2 border-b border-gray-50 last:border-0"
										>
											<span className="w-48 text-sm text-gray-500 flex-shrink-0">
												{label}
											</span>
											<span className="text-sm text-gray-900 font-medium">
												{value || "—"}
											</span>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			)}

			{/* Profile tab */}
			{activeTab === "profile" && (
				<div className="space-y-5">
					{/* Header card */}
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
						<div className="flex items-center gap-4">
							<div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 flex-shrink-0">
								{profileForm.firstName?.[0]}
								{profileForm.lastName?.[0]}
							</div>
							<div>
								<p className="font-semibold text-gray-900 text-lg">
									{profileForm.firstName} {profileForm.lastName}
								</p>
								<p className="text-sm text-gray-500">{(user as any)?.email}</p>
								<span
									className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${isAdmin ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"}`}
								>
									<Shield className="h-3 w-3" />
									{isAdmin ? "Администратор" : "Сотрудник"}
								</span>
							</div>
						</div>
					</div>

					{/* Edit profile form */}
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
						<h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
							<User className="w-4 h-4 text-blue-500" />
							Личные данные
						</h3>
						<form onSubmit={handleSaveProfile} className="space-y-4">
							<div>
								<Label className="text-sm font-medium text-gray-700">
									Email
								</Label>
								<Input
									value={(user as any)?.email || ""}
									disabled
									className="mt-1.5 h-11 rounded-xl bg-gray-50 border-gray-200 text-gray-400"
								/>
								<p className="text-xs text-gray-400 mt-1">
									Email изменить нельзя
								</p>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-sm font-medium text-gray-700">
										Имя *
									</Label>
									<Input
										value={profileForm.firstName}
										onChange={(e) =>
											setProfileForm((f) => ({
												...f,
												firstName: e.target.value,
											}))
										}
										required
										placeholder="Иван"
										className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
									/>
								</div>
								<div>
									<Label className="text-sm font-medium text-gray-700">
										Фамилия *
									</Label>
									<Input
										value={profileForm.lastName}
										onChange={(e) =>
											setProfileForm((f) => ({
												...f,
												lastName: e.target.value,
											}))
										}
										required
										placeholder="Иванов"
										className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
									/>
								</div>
							</div>
							<div className="pt-1">
								<Button
									type="submit"
									disabled={savingProfile}
									className="h-11 px-6 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700"
								>
									{savingProfile ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Сохранение...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Сохранить
										</>
									)}
								</Button>
							</div>
						</form>
					</div>

					{/* Change password form */}
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
						<h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
							<KeyRound className="w-4 h-4 text-blue-500" />
							Изменить пароль
						</h3>
						<form onSubmit={handleChangePassword} className="space-y-4">
							<div>
								<Label className="text-sm font-medium text-gray-700">
									Новый пароль *
								</Label>
								<div className="relative mt-1.5">
									<Input
										type={showPasswords ? "text" : "password"}
										value={passwordForm.next}
										onChange={(e) =>
											setPasswordForm((f) => ({ ...f, next: e.target.value }))
										}
										placeholder="Минимум 6 символов"
										className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowPasswords((v) => !v)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{showPasswords ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-700">
									Подтвердите пароль *
								</Label>
								<Input
									type={showPasswords ? "text" : "password"}
									value={passwordForm.confirm}
									onChange={(e) =>
										setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
									}
									placeholder="Повторите новый пароль"
									className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
								/>
								{passwordForm.confirm &&
									passwordForm.next !== passwordForm.confirm && (
										<p className="text-xs text-rose-600 mt-1">
											Пароли не совпадают
										</p>
									)}
							</div>
							<div className="pt-1">
								<Button
									type="submit"
									disabled={savingProfile}
									variant="outline"
									className="h-11 px-6 rounded-xl text-sm font-semibold border-gray-200"
								>
									{savingProfile ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Сохранение...
										</>
									) : (
										<>
											<KeyRound className="h-4 w-4 mr-2" />
											Сменить пароль
										</>
									)}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modules tab */}
			{activeTab === "modules" && (
				<div className="space-y-5">
					<div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
						<p className="font-medium mb-0.5">Управление модулями системы</p>
						<p className="text-blue-600 text-xs">
							Включайте только нужные функции. Данные сохраняются при отключении
							модуля.
						</p>
					</div>
					{!isAdmin && (
						<div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
							<p className="font-medium">
								Управление модулями доступно только администраторам.
							</p>
							<p className="text-xs mt-1 text-amber-500">
								Ваша текущая роль: {userRole || "не определена"}. Обратитесь к
								администратору для изменения роли.
							</p>
						</div>
					)}
					{modulesLoading ? (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 animate-pulse"
								>
									<div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
									<div className="flex-1 space-y-2">
										<div className="h-4 bg-gray-200 rounded w-32" />
										<div className="h-3 bg-gray-100 rounded w-48" />
									</div>
									<div className="h-6 w-11 bg-gray-200 rounded-full" />
								</div>
							))}
						</div>
					) : modulesError ? (
						<div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 text-sm text-rose-800">
							<p className="font-medium">Не удалось загрузить модули</p>
							<p className="text-rose-600 text-xs mt-1">
								Попробуйте обновить страницу.
							</p>
						</div>
					) : modules.length === 0 ? (
						<div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-500">
							Модули недоступны
						</div>
					) : null}
					{!modulesLoading &&
						!modulesError &&
						Object.entries(groupedModules).map(([category, mods]) => (
							<div
								key={category}
								className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
							>
								<div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
									<p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
										{CATEGORY_LABELS[category] || category}
									</p>
								</div>
								<div className="divide-y divide-gray-50">
									{mods.map((m) => {
										const IconComp = ICON_MAP[m.icon] || LayoutGrid;
										const isCore = m.key === "rental";
										const isToggling = togglingModule === m.key;
										return (
											<div
												key={m.key}
												className="flex items-center gap-4 px-5 py-4"
											>
												<div
													className={cn(
														"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
														m.isEnabled ? "bg-blue-50" : "bg-gray-100",
													)}
												>
													<IconComp
														className={cn(
															"w-5 h-5",
															m.isEnabled ? "text-blue-600" : "text-gray-400",
														)}
													/>
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="text-sm font-semibold text-gray-900">
															{m.name}
														</p>
														{isCore && (
															<span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
																Core
															</span>
														)}
													</div>
													<p className="text-xs text-gray-500 mt-0.5">
														{m.description}
													</p>
												</div>
												<div className="flex items-center gap-3 flex-shrink-0">
													{m.isEnabled ? (
														<span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
															<CheckCircle2 className="w-3.5 h-3.5" /> Включён
														</span>
													) : (
														<span className="flex items-center gap-1 text-xs text-gray-400">
															<XCircle className="w-3.5 h-3.5" /> Выключен
														</span>
													)}
													{isAdmin && (
														<button
															onClick={() => handleToggleModule(m.key)}
															disabled={isCore || isToggling}
															className={cn(
																"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
																m.isEnabled ? "bg-blue-600" : "bg-gray-200",
															)}
														>
															<span
																className={cn(
																	"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
																	m.isEnabled
																		? "translate-x-6"
																		: "translate-x-1",
																)}
															/>
														</button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						))}
				</div>
			)}
		</div>
	);
}
