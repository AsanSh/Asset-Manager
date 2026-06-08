import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { PlanalitycLogo } from "@/components/brand/PlanalitycLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

const AUTH_GRADIENT =
	"linear-gradient(155deg, #06111f 0%, #0b1f2f 46%, #0e7490 100%)";

type SignupModule = "construction" | "finance" | "rental" | "warehouse" | "crm";

const SIGNUP_MODULES: Array<{
	key: SignupModule;
	title: string;
	description: string;
}> = [
	{
		key: "construction",
		title: "Строительство",
		description: "проекты, этапы, задачи, шахматка",
	},
	{
		key: "finance",
		title: "Финансы",
		description: "операции, счета, бюджет, ОДДС и ОПУ",
	},
	{
		key: "rental",
		title: "Аренда",
		description: "объекты, арендаторы, платежи, отчеты",
	},
	{
		key: "warehouse",
		title: "Закуп",
		description: "заявки, поставщики, склад, списания",
	},
	{
		key: "crm",
		title: "CRM",
		description: "лиды, клиенты, портал и объявления",
	},
];

async function registerOrg(body: Record<string, string>) {
	const { data } = await api.post("/auth/register", body);
	return data;
}

export default function Register() {
	const { login } = useAuth();
	const [, setLocation] = useLocation();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState<"company" | "admin">("company");
	const [selectedModules, setSelectedModules] = useState<SignupModule[]>([
		"construction",
	]);

	const [form, setForm] = useState({
		companyName: "",
		legalName: "",
		bin: "",
		phone: "",
		email: "",
		address: "",
		firstName: "",
		lastName: "",
		password: "",
		confirmPassword: "",
	});

	const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm((f) => ({ ...f, [field]: e.target.value }));

	const toggleModule = (key: SignupModule) => {
		setSelectedModules((current) => {
			if (current.includes(key)) {
				return current.length === 1 ? current : current.filter((m) => m !== key);
			}
			return [...current, key];
		});
	};

	const handleNext = (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.companyName) {
			toast({
				title: "Ошибка",
				description: "Введите название организации",
				variant: "destructive",
			});
			return;
		}
		if (!form.email?.includes("@")) {
			toast({
				title: "Ошибка",
				description: "Введите корректный email",
				variant: "destructive",
			});
			return;
		}
		setStep("admin");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.firstName || !form.lastName) {
			toast({
				title: "Ошибка",
				description: "Введите имя и фамилию",
				variant: "destructive",
			});
			return;
		}

		// Валидация пароля
		if (form.password.length < 12) {
			toast({
				title: "Ошибка",
				description: "Пароль должен быть не менее 12 символов",
				variant: "destructive",
			});
			return;
		}
		if (!/[A-Z]/.test(form.password)) {
			toast({
				title: "Ошибка",
				description: "Пароль должен содержать заглавную букву",
				variant: "destructive",
			});
			return;
		}
		if (!/[a-z]/.test(form.password)) {
			toast({
				title: "Ошибка",
				description: "Пароль должен содержать строчную букву",
				variant: "destructive",
			});
			return;
		}
		if (!/[0-9]/.test(form.password)) {
			toast({
				title: "Ошибка",
				description: "Пароль должен содержать цифру",
				variant: "destructive",
			});
			return;
		}
		if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password)) {
			toast({
				title: "Ошибка",
				description: "Пароль должен содержать спецсимвол",
				variant: "destructive",
			});
			return;
		}

		if (form.password !== form.confirmPassword) {
			toast({
				title: "Ошибка",
				description: "Пароли не совпадают",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		try {
			// First clear any existing token
			localStorage.removeItem("auth_token");

			const data = await registerOrg({
				companyName: form.companyName,
				legalName: form.legalName,
				bin: form.bin,
				phone: form.phone,
				email: form.email,
				address: form.address,
				firstName: form.firstName,
				lastName: form.lastName,
				password: form.password,
			});

			// Set new token
			localStorage.setItem("auth_token", data.token);
			login(data.token);
			localStorage.setItem(
				"planalityc_signup_modules",
				JSON.stringify(selectedModules),
			);
			try {
				await api.post("/modules/configure", { modules: selectedModules });
			} catch {
				// Настройка модулей не должна ломать регистрацию. Администратор
				// сможет включить модули позже в настройках системы.
			}

			toast({
				title: "Регистрация завершена",
				description: `Добро пожаловать, ${form.firstName}!`,
			});

			// Navigate after a short delay to allow auth state to update
			setTimeout(() => {
				setLocation("/dashboard");
			}, 500);
		} catch (err: any) {
			toast({
				title: "Ошибка регистрации",
				description: err.message || "Неизвестная ошибка",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen flex"
			style={{ background: "linear-gradient(180deg, #f8fbfc 0%, #eef4f6 100%)" }}
		>
			{/* Branding panel */}
			<div
				className="hidden lg:flex w-1/2 flex-col justify-between p-12"
				style={{ background: AUTH_GRADIENT }}
			>
				<PlanalitycLogo variant="auth" inverse />

				<div className="space-y-6 max-w-md">
					<h1 className="text-4xl font-bold leading-tight text-white">
						Начните бесплатный период прямо сейчас
					</h1>
					<p className="text-slate-100/85 text-base leading-relaxed">
						Зарегистрируйте вашу строительную компанию или девелоперский бизнес
						и получите полный доступ к управлению объектами, арендой и
						финансами.
					</p>

					<div className="space-y-3 pt-2">
						{[
							"Изоляция данных по компании",
							"Управление пользователями и ролями",
							"Финансовая отчётность в KGS",
							"Импорт данных из Excel",
						].map((f) => (
							<div key={f} className="flex items-center gap-2.5">
								<CheckCircle2 className="h-4 w-4 text-cyan-300 flex-shrink-0" />
								<span className="text-cyan-50/85 text-sm">{f}</span>
							</div>
						))}
					</div>
				</div>

				<p className="text-sm text-cyan-100/55">{BRAND.copyright()}</p>
			</div>

			{/* Form panel */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					{/* Mobile logo */}
					<div className="lg:hidden mb-8">
						<PlanalitycLogo variant="auth" />
					</div>

					{/* Step indicator */}
					<div className="flex items-center gap-3 mb-6">
						<div
							className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${step === "company" ? "bg-cyan-700 text-white" : "bg-cyan-50 text-cyan-700"}`}
						>
							1
						</div>
						<div className="flex-1 h-px bg-gray-200" />
						<div
							className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${step === "admin" ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700"}`}
						>
							2
						</div>
					</div>

					<div className="bg-white/95 rounded-xl shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] border border-slate-200/80 p-8">
						{step === "company" ? (
							<>
								<div className="mb-6">
									<h2 className="text-2xl font-bold text-gray-900">
										Данные организации
									</h2>
									<p className="text-gray-500 text-sm mt-1">
										Шаг 1 из 2 — информация о вашей компании
									</p>
								</div>
								<form onSubmit={handleNext} className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Название компании *
										</Label>
										<Input
											value={form.companyName}
											onChange={set("companyName")}
											placeholder="ООО «СтройИнвест»"
											required
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Юридическое название
										</Label>
										<Input
											value={form.legalName}
											onChange={set("legalName")}
											placeholder="Общество с ограниченной ответственностью «СтройИнвест»"
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="flex flex-col">
											<Label className="text-sm font-medium text-gray-700 leading-tight mb-1.5">
												ИНН / ИНО
											</Label>
											<Input
												value={form.bin}
												onChange={set("bin")}
												placeholder="12345678901234"
												className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
											/>
										</div>
										<div className="flex flex-col">
											<Label className="text-sm font-medium text-gray-700 leading-tight mb-1.5">
												Телефон
											</Label>
											<Input
												value={form.phone}
												onChange={set("phone")}
												placeholder="+996 700 000 000"
												className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
											/>
										</div>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Email организации *
										</Label>
										<Input
											type="email"
											value={form.email}
											onChange={set("email")}
											placeholder="info@company.kg"
											required
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Адрес
										</Label>
										<Input
											value={form.address}
											onChange={set("address")}
											placeholder="г. Бишкек, ул. Манаса 72"
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-700">
											Какие модули нужны компании? *
										</Label>
										<div className="mt-2 grid gap-2 sm:grid-cols-2">
											{SIGNUP_MODULES.map((module) => {
												const active = selectedModules.includes(module.key);
												return (
													<button
														key={module.key}
														type="button"
														aria-pressed={active}
														onClick={() => toggleModule(module.key)}
														className={`rounded-2xl border p-3 text-left transition-all ${
															active
																? "border-cyan-300 bg-cyan-50 shadow-sm shadow-cyan-900/5"
																: "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
														}`}
													>
														<div className="flex items-center justify-between gap-3">
															<p className="text-sm font-semibold text-slate-950">
																{module.title}
															</p>
															<span
																className={`h-4 w-4 rounded-full border ${
																	active
																		? "border-cyan-700 bg-cyan-700"
																		: "border-slate-300 bg-white"
																}`}
															/>
														</div>
														<p className="mt-1 text-xs leading-5 text-slate-500">
															{module.description}
														</p>
													</button>
												);
											})}
										</div>
										<p className="mt-2 text-xs leading-5 text-slate-500">
											Позже администратор сможет подключить дополнительные модули
											в настройках системы.
										</p>
									</div>
									<Button
										type="submit"
										className="w-full h-11 rounded-lg text-sm font-semibold bg-cyan-700 hover:bg-cyan-800 text-white mt-2 shadow-sm shadow-cyan-900/10"
									>
										Далее →
									</Button>
								</form>
							</>
						) : (
							<>
								<div className="mb-6">
									<button
										onClick={() => setStep("company")}
										className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
									>
										<ArrowLeft className="h-4 w-4" />
										Назад
									</button>
									<h2 className="text-2xl font-bold text-gray-900">
										Данные администратора
									</h2>
									<p className="text-gray-500 text-sm mt-1">
										Шаг 2 из 2 — создание аккаунта администратора
									</p>
								</div>
								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="flex flex-col">
											<Label className="text-sm font-medium text-gray-700 leading-tight mb-1.5">
												Имя *
											</Label>
											<Input
												value={form.firstName}
												onChange={set("firstName")}
												placeholder="Айбек"
												required
												className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
											/>
										</div>
										<div className="flex flex-col">
											<Label className="text-sm font-medium text-gray-700 leading-tight mb-1.5">
												Фамилия *
											</Label>
											<Input
												value={form.lastName}
												onChange={set("lastName")}
												placeholder="Асанов"
												required
												className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
											/>
										</div>
									</div>

									<div>
										<Label className="text-sm font-medium text-gray-700">
											Email для входа *
										</Label>
										<Input
											type="email"
											value={form.email}
											readOnly
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-100 text-slate-500"
										/>
										<p className="text-xs text-gray-600 mt-1">
											Используется email организации
										</p>
									</div>

									<div>
										<Label className="text-sm font-medium text-gray-700">
											Пароль *
										</Label>
										<Input
											type="password"
											value={form.password}
											onChange={set("password")}
											placeholder="Минимум 12 символов"
											required
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
										<p className="text-xs text-gray-500 mt-1">
											Требования: 12+ символов, заглавная, строчная, цифра,
											спецсимвол
										</p>
									</div>

									<div>
										<Label className="text-sm font-medium text-gray-700">
											Подтвердите пароль *
										</Label>
										<Input
											type="password"
											value={form.confirmPassword}
											onChange={set("confirmPassword")}
											placeholder="Повторите пароль"
											required
											className="mt-1.5 h-11 rounded-lg border-slate-200 bg-slate-50/80 focus:bg-white focus-visible:ring-cyan-600/20"
										/>
									</div>

									<Button
										type="submit"
										className="w-full h-11 rounded-lg text-sm font-semibold bg-cyan-700 hover:bg-cyan-800 text-white mt-2 shadow-sm shadow-cyan-900/10"
										disabled={loading}
									>
										{loading ? "Создание аккаунта..." : "Зарегистрироваться"}
									</Button>
								</form>
							</>
						)}

						<p className="text-center text-sm text-gray-500 mt-5">
							Уже зарегистрированы?{" "}
							<a
								href="/login"
								className="text-cyan-700 font-medium hover:underline"
							>
								Войти в систему
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
