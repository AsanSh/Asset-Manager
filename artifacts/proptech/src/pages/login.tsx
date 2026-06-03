import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@/api-client";
import { PlanalitycLogo } from "@/components/brand/PlanalitycLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

const AUTH_GRADIENT =
	"linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #0e7490 100%)";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { login } = useAuth();
	const [, setLocation] = useLocation();
	const loginMutation = useLogin();
	const { toast } = useToast();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		loginMutation.mutate(
			{ data: { email, password } },
			{
				onSuccess: (data) => {
					login(data.token);
					setLocation(
						data.user.role === "super_admin"
							? "/platform-admin"
							: "/dashboard",
					);
				},
				onError: (error: any) => {
					toast({
						title: "Ошибка входа",
						description: error?.data?.error || "Неверный email или пароль",
						variant: "destructive",
					});
				},
			},
		);
	};

	return (
		<div className="min-h-screen flex" style={{ background: "#f4f6f9" }}>
			<div
				className="hidden lg:flex w-1/2 flex-col justify-between p-12"
				style={{ background: AUTH_GRADIENT }}
			>
				<PlanalitycLogo variant="auth" inverse />

				<div className="space-y-6 max-w-md">
					<h1 className="text-4xl font-bold leading-tight text-white">
						Управляйте недвижимостью&nbsp;эффективно
					</h1>
					<p className="text-indigo-100/90 text-base leading-relaxed">
						{BRAND.tagline}. Стройка, аренда, CRM и финансы в одной
						аналитической платформе.
					</p>
					<div className="flex gap-8 pt-2">
						<div>
							<p className="text-2xl font-bold text-white">KGS</p>
							<p className="text-xs text-cyan-200/80">Кыргызский сом</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-white">НБКР</p>
							<p className="text-xs text-cyan-200/80">Курс валют</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-white">24/7</p>
							<p className="text-xs text-cyan-200/80">Онлайн-доступ</p>
						</div>
					</div>
				</div>

				<p className="text-sm text-indigo-300/70">{BRAND.copyright()}</p>
			</div>

			<div className="w-full lg:w-1/2 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					<div className="lg:hidden mb-8">
						<PlanalitycLogo variant="auth" />
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
						<div className="mb-8">
							<h2 className="text-2xl font-bold text-gray-900">
								Добро пожаловать
							</h2>
							<p className="text-gray-500 text-sm mt-1">
								Войдите в аккаунт {BRAND.name}
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div>
								<Label
									htmlFor="email"
									className="text-sm font-medium text-gray-700"
								>
									Email
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="admin@company.kg"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
								/>
							</div>

							<div>
								<div className="flex items-center justify-between mb-1.5">
									<Label
										htmlFor="password"
										className="text-sm font-medium text-gray-700"
									>
										Пароль
									</Label>
									<Link
										href="/forgot-password"
										className="text-xs text-indigo-600 font-medium hover:underline"
									>
										Забыли пароль?
									</Link>
								</div>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
								/>
							</div>

							<Button
								type="submit"
								className="w-full h-11 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
								disabled={loginMutation.isPending}
							>
								{loginMutation.isPending ? "Вход..." : "Войти"}
							</Button>
						</form>
						<p className="text-center text-sm text-gray-500 mt-5">
							Нет аккаунта?{" "}
							<a
								href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/register`}
								className="text-indigo-600 font-medium hover:underline"
							>
								Зарегистрировать компанию
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
