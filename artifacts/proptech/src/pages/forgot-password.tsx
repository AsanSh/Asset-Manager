import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { PlanalitycLogo } from "@/components/brand/PlanalitycLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";
import { BRAND } from "@/lib/brand";

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const { toast } = useToast();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const base = getApiBase();
			const res = await fetch(`${base}/auth/forgot-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim() }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || "Не удалось отправить запрос");
			}
			setSent(true);
			toast({
				title: "Запрос принят",
				description: data.message,
			});
		} catch (err) {
			toast({
				title: "Ошибка",
				description: err instanceof Error ? err.message : "Ошибка",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen flex items-center justify-center p-6"
			style={{ background: "#f4f6f9" }}
		>
			<div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
				<div className="flex items-center gap-3 mb-6">
					<PlanalitycLogo variant="mark" />
					<div>
						<h1 className="text-xl font-bold text-gray-900">Сброс пароля</h1>
						<p className="text-sm text-gray-500">{BRAND.name}</p>
					</div>
				</div>

				{sent ? (
					<div className="space-y-4 text-center">
						<p className="text-sm text-gray-600 leading-relaxed">
							Если аккаунт с адресом <strong>{email}</strong> зарегистрирован,
							на почту придёт ссылка для установки нового пароля. Ссылка
							действует 1 час.
						</p>
						<p className="text-xs text-gray-400">
							Не пришло письмо? Проверьте папку «Спам» или повторите запрос
							через минуту.
						</p>
						<Link
							href="/login"
							className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:underline"
						>
							<ArrowLeft className="h-4 w-4" />
							На страницу входа
						</Link>
					</div>
				) : (
					<>
						<p className="text-sm text-gray-500 mb-6">
							Введите email, указанный при регистрации. Мы отправим ссылку для
							создания нового пароля.
						</p>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<Label htmlFor="email" className="text-sm font-medium text-gray-700">
									Email
								</Label>
								<Input
									id="email"
									type="email"
									required
									placeholder="name@company.kg"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
								/>
							</div>
							<Button
								type="submit"
								className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
								disabled={loading}
							>
								{loading ? "Отправка..." : "Отправить ссылку"}
							</Button>
						</form>
						<p className="text-center mt-5">
							<Link
								href="/login"
								className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
							>
								<ArrowLeft className="h-4 w-4" />
								Вернуться ко входу
							</Link>
						</p>
					</>
				)}
			</div>
		</div>
	);
}
