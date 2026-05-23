import { ArrowRight, Building2, Lock, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ClientLogin() {
	const [, setLocation] = useLocation();
	const { toast } = useToast();
	const [form, setForm] = useState({ login: "", password: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Mock authentication
			if (form.login && form.password) {
				localStorage.setItem("client_token", "mock-client-token");
				localStorage.setItem("client_id", "1");
				toast({ title: "Добро пожаловать!" });
				setLocation("/portal/client/dashboard");
			} else {
				toast({ title: "Заполните все поля", variant: "destructive" });
			}
		} catch (_error) {
			toast({ title: "Ошибка входа", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-teal-600 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Logo */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg mb-4 shadow-xl">
						<Building2 className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-4xl font-extrabold text-white mb-2">
						Клиентский портал
					</h1>
					<p className="text-purple-100 text-lg">
						Управление вашей недвижимостью
					</p>
				</div>

				{/* Login Card */}
				<Card className="p-8 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<Label htmlFor="login" className="text-gray-700 font-semibold">
								Логин или телефон
							</Label>
							<div className="relative mt-2">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<Input
									id="login"
									type="text"
									value={form.login}
									onChange={(e) => setForm({ ...form, login: e.target.value })}
									className="pl-11 h-12 text-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
									placeholder="Введите логин"
									required
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="password" className="text-gray-700 font-semibold">
								Пароль
							</Label>
							<div className="relative mt-2">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<Input
									id="password"
									type="password"
									value={form.password}
									onChange={(e) =>
										setForm({ ...form, password: e.target.value })
									}
									className="pl-11 h-12 text-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
									placeholder="Введите пароль"
									required
								/>
							</div>
						</div>

						<Button
							type="submit"
							disabled={loading}
							className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200"
						>
							{loading ? (
								"Вход..."
							) : (
								<>
									Войти
									<ArrowRight className="w-5 h-5 ml-2" />
								</>
							)}
						</Button>

						<div className="text-center space-y-2">
							<button
								type="button"
								className="text-sm text-blue-600 hover:text-blue-700 font-medium"
							>
								Забыли пароль?
							</button>
							<p className="text-xs text-gray-500">
								Нужна помощь? Свяжитесь с отделом продаж
							</p>
						</div>
					</form>
				</Card>

				{/* Footer */}
				<div className="mt-8 text-center text-purple-100 text-sm">
					<p>© 2026 PropTech Platform. Все права защищены.</p>
				</div>
			</div>
		</div>
	);
}
