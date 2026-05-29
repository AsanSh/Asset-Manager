import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

const RESEND_SEC = 60;

export default function PortalLogin() {
	const { toast } = useToast();
	const { login } = useAuth();
	const [, navigate] = useLocation();
	const [step, setStep] = useState<"phone" | "code">("phone");
	const [phone, setPhone] = useState("");
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const [devCode, setDevCode] = useState<string | null>(null);

	useEffect(() => {
		if (countdown <= 0) return;
		const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
		return () => clearTimeout(t);
	}, [countdown]);

	const sendCode = async () => {
		const cleaned = phone.trim();
		if (!cleaned) {
			toast({ title: "Введите номер телефона", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post("/auth/send-otp", { phone: cleaned });
			setStep("code");
			setCountdown(RESEND_SEC);
			if (data?.devCode) setDevCode(String(data.devCode));
			toast({ title: "Код отправлен", description: "Введите код, который пришёл в SMS" });
		} catch (e) {
			toast({ title: getApiErrorMessage(e, "Не удалось отправить код"), variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const verify = async () => {
		if (!code.trim()) {
			toast({ title: "Введите код", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post("/auth/verify-otp", { phone, code: code.trim() });
			if (data?.token) {
				login(data.token);
				toast({ title: "Вход выполнен" });
				// Auth провайдер сделает редирект на нужный портал на основе роли
				setTimeout(() => navigate("/"), 100);
			}
		} catch (e) {
			toast({ title: getApiErrorMessage(e, "Неверный код"), variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
				<div className="text-center mb-6">
					<div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">📱</div>
					<h1 className="text-2xl font-bold text-gray-900">Вход в портал</h1>
					<p className="text-sm text-gray-500 mt-1">
						{step === "phone" ? "Введите номер телефона, к которому привязан аккаунт" : "Введите код, отправленный по SMS"}
					</p>
				</div>

				{step === "phone" ? (
					<div className="space-y-4">
						<div>
							<Label className="text-sm">Номер телефона</Label>
							<Input
								className="mt-1 text-base h-11"
								type="tel"
								placeholder="+996 700 123 456"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && sendCode()}
								autoFocus
							/>
						</div>
						<Button
							onClick={sendCode}
							disabled={loading || !phone.trim()}
							className="w-full bg-amber-500 hover:bg-orange-600 h-11"
						>
							{loading ? "Отправляем..." : "Получить код"}
						</Button>
						<button
							type="button"
							onClick={() => navigate("/login")}
							className="block w-full text-center text-xs text-gray-500 hover:text-gray-700"
						>
							Войти как сотрудник (email + пароль)
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<div>
							<Label className="text-sm">Код из SMS</Label>
							<Input
								className="mt-1 text-2xl tracking-widest text-center h-12 font-mono"
								type="text"
								inputMode="numeric"
								maxLength={6}
								placeholder="••••••"
								value={code}
								onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
								onKeyDown={(e) => e.key === "Enter" && verify()}
								autoFocus
							/>
							<p className="text-[11px] text-gray-400 mt-1 text-center">Номер: {phone}</p>
							{devCode && (
								<p className="text-[11px] text-amber-700 mt-2 text-center bg-amber-50 border border-amber-200 rounded px-2 py-1">
									🛠 Тестовый код: <strong>{devCode}</strong>
								</p>
							)}
						</div>
						<Button
							onClick={verify}
							disabled={loading || code.length < 4}
							className="w-full bg-amber-500 hover:bg-orange-600 h-11"
						>
							{loading ? "Проверяем..." : "Войти"}
						</Button>
						<div className="flex items-center justify-between text-xs">
							<button
								type="button"
								onClick={() => { setStep("phone"); setCode(""); setDevCode(null); }}
								className="text-gray-500 hover:text-gray-700"
							>
								← Изменить номер
							</button>
							<button
								type="button"
								onClick={sendCode}
								disabled={countdown > 0 || loading}
								className="text-amber-600 hover:text-amber-700 disabled:text-gray-400"
							>
								{countdown > 0 ? `Повторно через ${countdown}с` : "Отправить ещё раз"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
