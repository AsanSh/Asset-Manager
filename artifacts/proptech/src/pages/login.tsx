import { Building2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

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
			{/* Left branding panel */}
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
						Управляйте недвижимостью&nbsp;эффективно
					</h1>
					<p className="text-blue-200 text-base leading-relaxed">
						Комплексная PropTech-платформа для строительных компаний и
						девелоперов Кыргызстана. Управление портфелем, арендой, договорами и
						финансами в одном месте.
					</p>
					<div className="flex gap-8 pt-2">
						<div>
							<p className="text-2xl font-bold text-white">KGS</p>
							<p className="text-xs text-blue-300">Кыргызский сом</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-white">НБКР</p>
							<p className="text-xs text-blue-300">Курс валют</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-white">24/7</p>
							<p className="text-xs text-blue-300">Онлайн-доступ</p>
						</div>
					</div>
				</div>

				<p className="text-sm text-blue-400">
					© {new Date().getFullYear()} BuildFlow. Все права защищены.
				</p>
			</div>

			{/* Right login form */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					{/* Mobile logo */}
					<div className="flex items-center gap-3 lg:hidden mb-8">
						<div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center">
							<Building2 className="h-5 w-5 text-white" />
						</div>
						<span className="text-xl font-bold text-gray-900">BuildFlow</span>
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
						<div className="mb-8">
							<h2 className="text-2xl font-bold text-gray-900">
								Добро пожаловать
							</h2>
							<p className="text-gray-500 text-sm mt-1">
								Войдите в свой аккаунт BuildFlow
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
								className="w-full h-11 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-2"
								disabled={loginMutation.isPending}
							>
								{loginMutation.isPending ? "Вход..." : "Войти"}
							</Button>
						</form>
						<p className="text-center text-sm text-gray-500 mt-5">
							Нет аккаунта?{" "}
							<a
								href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/register`}
								className="text-blue-600 font-medium hover:underline"
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
