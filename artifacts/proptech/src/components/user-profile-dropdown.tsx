import { useQueryClient } from "@tanstack/react-query";
import {
	Check,
	ChevronDown,
	Eye,
	EyeOff,
	Key,
	LogOut,
	User,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const AVATAR_COLORS = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6"];
function avatarColor(id: number) {
	return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const roleLabels: Record<string, string> = {
	super_admin: "Супер-администратор",
	admin: "Администратор",
	company_admin: "Администратор",
	manager: "Менеджер",
	owner: "Владелец",
	staff: "Сотрудник",
	accountant: "Бухгалтер",
	sales_manager: "Менеджер продаж",
	finance: "Финансист",
	rental_manager: "Менеджер аренды",
};

type Modal = "profile" | "password" | null;

export default function UserProfileDropdown() {
	const { user, logout } = useAuth();
	const [open, setOpen] = useState(false);
	const [modal, setModal] = useState<Modal>(null);
	const [profileForm, setProfileForm] = useState({
		firstName: "",
		lastName: "",
	});
	const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
	const [showPw, setShowPw] = useState(false);
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState("");
	const [error, setError] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const qc = useQueryClient();
	const [, navigate] = useLocation();

	const u = user as any;
	const initials = u
		? `${(u.firstName || "")[0] || ""}${(u.lastName || "")[0] || ""}`.toUpperCase() ||
			"АД"
		: "АД";
	const fullName = u
		? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email
		: "Администратор";
	const roleLabel = u ? roleLabels[u.role] || u.role || "Владелец" : "Владелец";
	const color = u?.id ? avatarColor(u.id) : "#4F46E5";

	useEffect(() => {
		function onClickOut(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			)
				setOpen(false);
		}
		document.addEventListener("mousedown", onClickOut);
		return () => document.removeEventListener("mousedown", onClickOut);
	}, []);

	function openProfile() {
		setProfileForm({
			firstName: u?.firstName || "",
			lastName: u?.lastName || "",
		});
		setError("");
		setSuccess("");
		setModal("profile");
		setOpen(false);
	}
	function openPassword() {
		setPwForm({ password: "", confirm: "" });
		setError("");
		setSuccess("");
		setModal("password");
		setOpen(false);
	}
	function closeModal() {
		setModal(null);
		setError("");
		setSuccess("");
	}

	async function saveProfile() {
		if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
			setError("Заполните имя и фамилию");
			return;
		}
		setSaving(true);
		setError("");
		try {
			await api.patch("/auth/me", {
				firstName: profileForm.firstName.trim(),
				lastName: profileForm.lastName.trim(),
			});
			qc.invalidateQueries({ queryKey: ["me"] });
			setSuccess("Профиль обновлён");
			setTimeout(closeModal, 1200);
		} catch (e: any) {
			setError(e?.response?.data?.error || "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	}

	async function savePassword() {
		if (!pwForm.password || pwForm.password.length < 12) {
			setError("Минимум 12 символов");
			return;
		}
		if (pwForm.password !== pwForm.confirm) {
			setError("Пароли не совпадают");
			return;
		}
		setSaving(true);
		setError("");
		try {
			await api.patch("/auth/me", { password: pwForm.password });
			setSuccess("Пароль изменён");
			setTimeout(closeModal, 1200);
		} catch (e: any) {
			setError(e?.response?.data?.error || "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	}

	async function handleLogout() {
		try {
			await api.post("/auth/logout", {});
		} catch {}
		logout();
		navigate("/login");
	}

	return (
		<>
			<div ref={dropdownRef} className="relative">
				<div
					onClick={() => setOpen((v) => !v)}
					className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded-xl px-2 py-1 transition-colors select-none"
				>
					<div
						className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
						style={{ background: color }}
					>
						{initials}
					</div>
					<div>
						<div className="text-sm font-semibold text-gray-900 leading-none">
							{u?.firstName || "Администратор"}
						</div>
						<div className="text-[10px] text-gray-400 mt-0.5">{roleLabel}</div>
					</div>
					<ChevronDown
						className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</div>

				{open && (
					<div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-[1000] overflow-hidden">
						{/* Header */}
						<div className="px-4 py-3 bg-gray-50 border-b">
							<div className="flex items-center gap-3">
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
									style={{ background: color }}
								>
									{initials}
								</div>
								<div className="min-w-0">
									<p className="font-semibold text-gray-900 text-sm truncate">
										{fullName}
									</p>
									<p className="text-xs text-gray-500 truncate">{u?.email}</p>
									<span className="text-[10px] text-indigo-600 font-medium">
										{roleLabel}
									</span>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="py-1">
							<button
								onClick={openProfile}
								className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
							>
								<User className="w-4 h-4 text-gray-400" />
								Редактировать профиль
							</button>
							<button
								onClick={openPassword}
								className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
							>
								<Key className="w-4 h-4 text-gray-400" />
								Изменить пароль
							</button>
						</div>

						<div className="border-t py-1">
							<button
								onClick={handleLogout}
								className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 text-sm text-rose-600 transition-colors"
							>
								<LogOut className="w-4 h-4" />
								Выйти из системы
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Edit Profile Modal */}
			{modal === "profile" && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<h2 className="font-semibold text-gray-900">
								Редактировать профиль
							</h2>
							<button
								onClick={closeModal}
								className="p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>
						<div className="p-5 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Имя
									</Label>
									<Input
										className="mt-1 h-9"
										value={profileForm.firstName}
										onChange={(e) =>
											setProfileForm((f) => ({
												...f,
												firstName: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Фамилия
									</Label>
									<Input
										className="mt-1 h-9"
										value={profileForm.lastName}
										onChange={(e) =>
											setProfileForm((f) => ({
												...f,
												lastName: e.target.value,
											}))
										}
									/>
								</div>
							</div>
							<div>
								<Label className="text-xs font-medium text-gray-600">
									Email
								</Label>
								<Input
									className="mt-1 h-9 opacity-60"
									value={u?.email || ""}
									disabled
								/>
								<p className="text-[10px] text-gray-400 mt-1">
									Email нельзя изменить
								</p>
							</div>
							{error && (
								<p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
									{error}
								</p>
							)}
							{success && (
								<div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
									<Check className="w-4 h-4" /> {success}
								</div>
							)}
						</div>
						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={closeModal}
								disabled={saving}
							>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={saveProfile}
								disabled={saving}
								className="bg-blue-600 hover:bg-blue-700 min-w-[90px]"
							>
								{saving ? "Сохранение..." : "Сохранить"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Change Password Modal */}
			{modal === "password" && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<h2 className="font-semibold text-gray-900">Изменить пароль</h2>
							<button
								onClick={closeModal}
								className="p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>
						<div className="p-5 space-y-4">
							<div>
								<Label className="text-xs font-medium text-gray-600">
									Новый пароль
								</Label>
								<div className="relative mt-1">
									<Input
										className="h-9 pr-10"
										type={showPw ? "text" : "password"}
										placeholder="Минимум 12 символов"
										value={pwForm.password}
										onChange={(e) =>
											setPwForm((f) => ({ ...f, password: e.target.value }))
										}
									/>
									<button
										type="button"
										onClick={() => setShowPw((v) => !v)}
										className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
									>
										{showPw ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>
							<div>
								<Label className="text-xs font-medium text-gray-600">
									Повторите пароль
								</Label>
								<Input
									className="mt-1 h-9"
									type="password"
									placeholder="Повторите пароль"
									value={pwForm.confirm}
									onChange={(e) =>
										setPwForm((f) => ({ ...f, confirm: e.target.value }))
									}
								/>
							</div>
							{error && (
								<p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
									{error}
								</p>
							)}
							{success && (
								<div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
									<Check className="w-4 h-4" /> {success}
								</div>
							)}
						</div>
						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={closeModal}
								disabled={saving}
							>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={savePassword}
								disabled={saving}
								className="bg-blue-600 hover:bg-blue-700 min-w-[110px]"
							>
								{saving ? "Сохранение..." : "Изменить"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
