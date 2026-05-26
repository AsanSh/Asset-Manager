import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import {
	STATUS_COLOR_PRESETS,
	type UnitStatusColorKey,
	type UnitStatusDto,
} from "@/lib/unit-statuses";

const COLOR_KEYS = Object.keys(STATUS_COLOR_PRESETS) as UnitStatusColorKey[];

export function ChessStatusSettingsDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [editing, setEditing] = useState<UnitStatusDto | null>(null);
	const [form, setForm] = useState({
		label: "",
		colorKey: "slate" as UnitStatusColorKey,
		saleMode: "none" as "none" | "reserved" | "sold",
	});

	const { data: statuses = [], isLoading } = useQuery<UnitStatusDto[]>({
		queryKey: ["construction-unit-statuses"],
		queryFn: () => api.get("/construction/unit-statuses").then((r) => r.data),
		enabled: open,
	});

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: ["construction-unit-statuses"] });

	const createMut = useMutation({
		mutationFn: (body: {
			label: string;
			colorKey: string;
			saleMode: string;
		}) => api.post("/construction/unit-statuses", body),
		onSuccess: () => {
			toast({ title: "Статус добавлен" });
			invalidate();
			resetForm();
		},
		onError: (e: unknown) => {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : undefined,
				variant: "destructive",
			});
		},
	});

	const updateMut = useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: number;
			label?: string;
			colorKey?: string;
			saleMode?: string;
		}) => api.patch(`/construction/unit-statuses/${id}`, body),
		onSuccess: () => {
			toast({ title: "Сохранено" });
			invalidate();
			setEditing(null);
			resetForm();
		},
		onError: () => toast({ title: "Ошибка", variant: "destructive" }),
	});

	const deleteMut = useMutation({
		mutationFn: (id: number) => api.delete(`/construction/unit-statuses/${id}`),
		onSuccess: () => {
			toast({ title: "Статус удалён" });
			invalidate();
		},
		onError: (e: unknown) => {
			toast({ title: getApiErrorMessage(e, "Не удалось удалить"), variant: "destructive" });
		},
	});

	const resetForm = () => {
		setForm({ label: "", colorKey: "slate", saleMode: "none" });
		setEditing(null);
	};

	const startEdit = (s: UnitStatusDto) => {
		setEditing(s);
		setForm({
			label: s.label,
			colorKey: (s.colorKey as UnitStatusColorKey) || "slate",
			saleMode: s.saleMode,
		});
	};

	const handleSave = () => {
		if (!form.label.trim()) {
			toast({ title: "Введите название", variant: "destructive" });
			return;
		}
		if (editing) {
			updateMut.mutate({
				id: editing.id,
				label: form.label.trim(),
				colorKey: form.colorKey,
				saleMode: form.saleMode,
			});
		} else {
			createMut.mutate({
				label: form.label.trim(),
				colorKey: form.colorKey,
				saleMode: form.saleMode,
			});
		}
	};

	const preset =
		STATUS_COLOR_PRESETS[form.colorKey] || STATUS_COLOR_PRESETS.slate;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Статусы квартир</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground -mt-2">
					Создавайте свои статусы и цвета. Статусы с режимом «Бронь» или «Продажа»
					открывают оформление покупателя при смене статуса квартиры.
				</p>

				{isLoading ? (
					<p className="text-sm text-gray-400 py-4">Загрузка...</p>
				) : (
					<ul className="space-y-2 border rounded-lg p-2 max-h-48 overflow-y-auto">
						{statuses.map((s) => {
							const c =
								STATUS_COLOR_PRESETS[s.colorKey as UnitStatusColorKey] ||
								STATUS_COLOR_PRESETS.slate;
							return (
								<li
									key={s.id}
									className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded border ${c.border} ${c.bg}`}
								>
									<div className="min-w-0">
										<span className={`text-sm font-medium ${c.text}`}>
											{s.label}
										</span>
										<span className="text-[10px] text-gray-500 ml-2">
											{s.code}
											{s.saleMode !== "none" &&
												` · ${s.saleMode === "reserved" ? "бронь" : "продажа"}`}
										</span>
									</div>
									<div className="flex gap-1 shrink-0">
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="h-7 w-7"
											onClick={() => startEdit(s)}
										>
											<Pencil className="w-3.5 h-3.5" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="h-7 w-7 text-red-600"
											onClick={() => {
												if (
													!confirm(
														`Удалить статус «${s.label}»? Доступно только если ни одна квартира не использует его.`,
													)
												)
													return;
												deleteMut.mutate(s.id);
											}}
										>
											<Trash2 className="w-3.5 h-3.5" />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}

				<div className="space-y-3 border-t pt-3">
					<p className="text-sm font-medium">
						{editing ? "Редактировать" : "Новый статус"}
					</p>
					<div>
						<Label>Название</Label>
						<Input
							className="mt-1"
							value={form.label}
							onChange={(e) =>
								setForm((p) => ({ ...p, label: e.target.value }))
							}
							placeholder="Например: На согласовании"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Цвет</Label>
							<Select
								value={form.colorKey}
								onValueChange={(v) =>
									setForm((p) => ({
										...p,
										colorKey: v as UnitStatusColorKey,
									}))
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{COLOR_KEYS.map((k) => (
										<SelectItem key={k} value={k}>
											{STATUS_COLOR_PRESETS[k].label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Оформление продажи</Label>
							<Select
								value={form.saleMode}
								onValueChange={(v) =>
									setForm((p) => ({
										...p,
										saleMode: v as "none" | "reserved" | "sold",
									}))
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Нет</SelectItem>
									<SelectItem value="reserved">Бронь</SelectItem>
									<SelectItem value="sold">Продажа</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div
						className={`rounded-lg border px-3 py-2 text-sm ${preset.bg} ${preset.border} ${preset.text}`}
					>
						Пример: {form.label || "Статус"}
					</div>
					<div className="flex justify-end gap-2">
						{editing && (
							<Button type="button" variant="outline" onClick={resetForm}>
								Отмена
							</Button>
						)}
						<Button
							type="button"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={createMut.isPending || updateMut.isPending}
							onClick={handleSave}
						>
							{editing ? "Сохранить" : (
								<>
									<Plus className="w-4 h-4 mr-1" /> Добавить
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
