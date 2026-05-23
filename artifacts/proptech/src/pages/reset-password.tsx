import { Building2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

export default function ResetPassword() {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const token = params.get("token") || "";
	const [, setLocation] = useLocation();
	const { toast } = useToast();

	const [emailHint, setEmailHint] = useState<string | null>(null);
	const [validating, setValidating] = useState(true);
	const [invalid, setInvalid] = useState(false);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!token) {
			setInvalid(true);
			setValidating(false);
			return;
		}
		const base = getApiBase();
		fetch(`${base}/auth/password-reset/validate?token=${encodeURIComponent(token)}`)
			.then(async (res) => {
				if (!res.ok) throw new Error("invalid");
				const data = await res.json();
				setEmailHint(data.email);
			})
			.catch(() => setInvalid(true))
			.finally(() => setValidating(false));
	}, [token]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirm) {
			toast({
				title: "Пароли не совпадают",
				variant: "destructive",
			});
			return;
		}
		setSubmitting(true);
		try {
			const base = getApiBase();
			const res = await fetch(`${base}/auth/password-reset`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || "Не удалось сменить пароль");
			}
			toast({
				title: "Пароль обновлён",
				description: "Теперь войдите с новым паролем",
			});
			setLocation("/login");
		} catch (err) {
			toast({
				title: "Ошибка",
				description: err instanceof Error ? err.message : "Ошибка",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="min-h-screen flex items-center justify-center p-6"
			style={{ background: "#f4f6f9" }}
		>
			<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
				<div className="flex items-center gap-3 mb-6">
					<div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
						<Building2 className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-bold">Новый пароль</h1>
						<p className="text-sm text-muted-foreground">BuildFlow / Asset Manager</p>
					</div>
				</div>

				{validating ? (
					<p className="text-sm text-muted-foreground text-center py-8">
						Проверка ссылки...
					</p>
				) : invalid ? (
					<div className="text-center space-y-4">
						<p className="text-sm text-destructive">
							Ссылка недействительна или истекла. Запросите новую у администратора.
						</p>
						<Link href="/login" className="text-blue-600 text-sm hover:underline">
							На страницу входа
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{emailHint && (
							<p className="text-sm text-muted-foreground">
								Аккаунт: <strong>{emailHint}</strong>
							</p>
						)}
						<div className="space-y-1.5">
							<Label>Новый пароль</Label>
							<div className="relative">
								<Input
									type={showPassword ? "text" : "password"}
									required
									minLength={12}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Минимум 12 символов"
									className="pr-10"
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							<p className="text-xs text-muted-foreground">
								Буквы верхнего и нижнего регистра, цифра и спецсимвол
							</p>
						</div>
						<div className="space-y-1.5">
							<Label>Повторите пароль</Label>
							<Input
								type={showPassword ? "text" : "password"}
								required
								minLength={12}
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={submitting}>
							{submitting ? "Сохранение..." : "Сохранить пароль"}
						</Button>
					</form>
				)}
			</div>
		</div>
	);
}
