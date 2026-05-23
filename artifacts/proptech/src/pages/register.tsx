import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

			console.log("Registration successful:", data);

			// Set new token
			login(data.token);

			toast({
				title: "Регистрация завершена",
				description: `Добро пожаловать, ${form.firstName}!`,
			});

			// Navigate after a short delay to allow auth state to update
			setTimeout(() => {
				setLocation("/dashboard");
			}, 500);
		} catch (err: any) {
			console.error("Registration error details:", err);
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
		<div className="min-h-screen flex" style={{ background: "#f4f6f9" }}>
			{/* Branding panel */}
			<div
				className="hidden lg:flex w-1/2 flex-col justify-between p-12"
				style={{
					background: "linear-gradient(160deg, #1e3a5f 0%, #0d1f3c 100%)",
				}}
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
						<Building2 className="h-6 w-6 text-white" />
					</div>
					<div>
						<p className="text-xl font-bold text-white leading-tight">
							BuildFlow
						</p>
						<p className="text-xs text-blue-300">Платформа управления</p>
					</div>
				</div>

				<div className="space-y-6 max-w-md">
					<h1 className="text-4xl font-bold leading-tight text-white">
						Начните бесплатный период прямо сейчас
					</h1>
					<p className="text-blue-200 text-base leading-relaxed">
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
								<CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
								<span className="text-blue-100 text-sm">{f}</span>
							</div>
						))}
					</div>
				</div>

				<p className="text-sm text-blue-400">
					© {new Date().getFullYear()} BuildFlow. Все права защищены.
				</p>
			</div>

			{/* Form panel */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					{/* Mobile logo */}
					<div className="flex items-center gap-3 lg:hidden mb-8">
						<div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center">
							<Building2 className="h-5 w-5 text-white" />
						</div>
						<span className="text-xl font-bold text-gray-900">BuildFlow</span>
					</div>

					{/* Step indicator */}
					<div className="flex items-center gap-3 mb-6">
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === "company" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"}`}
						>
							1
						</div>
						<div className="flex-1 h-px bg-gray-200" />
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === "admin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
						>
							2
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
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
											placeholder="Общество с ограниченной ответственностью «СтройИнвест»"
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
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
											Email организации *
										</Label>
										<Input
											type="email"
											value={form.email}
											onChange={set("email")}
											placeholder="info@company.kg"
											required
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
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
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>
									<Button
										type="submit"
										className="w-full h-11 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-2"
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
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label className="text-sm font-medium text-gray-700">
												Имя *
											</Label>
											<Input
												value={form.firstName}
												onChange={set("firstName")}
												placeholder="Айбек"
												required
												className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
											/>
										</div>
										<div>
											<Label className="text-sm font-medium text-gray-700">
												Фамилия *
											</Label>
											<Input
												value={form.lastName}
												onChange={set("lastName")}
												placeholder="Асанов"
												required
												className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
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
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-100 text-gray-500"
										/>
										<p className="text-xs text-gray-400 mt-1">
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
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
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
											className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
										/>
									</div>

									<Button
										type="submit"
										className="w-full h-11 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-2"
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
								className="text-blue-600 font-medium hover:underline"
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
