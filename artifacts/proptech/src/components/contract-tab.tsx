import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { resolveAnnexScheduleForDisplay } from "@/lib/annex-schedule";
import { getApiBase } from "@/lib/api-base";
import { ContractAnnex1Preview } from "./contract-annex1-preview";
import { ContractPreviewDocument } from "./contract-preview-document";

const MONTHS_GENITIVE = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];

export type ContractBuyer = {
	fullName: string;
	fullNameGenitive: string;
	gender: "м" | "ж";
	dateOfBirth: string;
	innPin: string;
	passportSeries: string;
	passportIssuedBy: string;
	passportDate: string;
	address: string;
	phone: string;
};

export type ContractOffice = {
	address: string;
	cadastralCode: string;
	area: string;
	floor: string;
	block: string;
	number: string;
	priceUsd: string;
	priceUsdWords: string;
	initialPayment: string;
	initialPaymentWords: string;
};

type ContractDate = { day: string; month: string; year: string };

export type AnnexScheduleRow = {
	installmentNumber: number;
	dueDate: string;
	amount: number;
};

type Props = {
	salesContractId?: number;
	projectId?: number;
	initialPayload?: {
		buyer: ContractBuyer;
		office: ContractOffice;
		contractDate: ContractDate;
	};
};

function parseIsoToParts(iso: string): ContractDate {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		const now = new Date();
		return {
			day: String(now.getDate()).padStart(2, "0"),
			month: MONTHS_GENITIVE[now.getMonth()],
			year: String(now.getFullYear()),
		};
	}
	return {
		day: String(d.getDate()).padStart(2, "0"),
		month: MONTHS_GENITIVE[d.getMonth()],
		year: String(d.getFullYear()),
	};
}

export function ContractTab({ salesContractId, projectId, initialPayload }: Props) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [loadingAnnex, setLoadingAnnex] = useState(false);
	const [loadingData, setLoadingData] = useState(!!salesContractId);
	const [buyerId, setBuyerId] = useState<number | null>(null);
	const [savingBuyer, setSavingBuyer] = useState(false);
	const [annexSchedule, setAnnexSchedule] = useState<AnnexScheduleRow[]>([]);
	const [contractMeta, setContractMeta] = useState({
		totalAmount: 0,
		downPayment: 0,
		remainingAmount: 0,
		installmentMonths: 12,
	});
	const [generatingSchedule, setGeneratingSchedule] = useState(false);
	const [contractDateIso, setContractDateIso] = useState(
		new Date().toISOString().slice(0, 10),
	);

	const [buyer, setBuyer] = useState<ContractBuyer>(
		initialPayload?.buyer || {
			fullName: "",
			fullNameGenitive: "",
			gender: "м",
			dateOfBirth: "",
			innPin: "",
			passportSeries: "",
			passportIssuedBy: "",
			passportDate: "",
			address: "",
			phone: "",
		},
	);
	const [office, setOffice] = useState<ContractOffice>(
		initialPayload?.office || {
			address: "",
			cadastralCode: "",
			area: "",
			floor: "",
			block: "",
			number: "",
			priceUsd: "",
			priceUsdWords: "",
			initialPayment: "",
			initialPaymentWords: "",
		},
	);

	const loadContractData = useCallback(async () => {
		if (!salesContractId) return;
		const token = localStorage.getItem("auth_token");
		setLoadingData(true);
		try {
			const r = await fetch(
				`${getApiBase()}/construction/contracts-sales/${salesContractId}/docx-data`,
				{ headers: token ? { Authorization: `Bearer ${token}` } : {} },
			);
			if (!r.ok) throw new Error("Не удалось загрузить данные");
			const data = await r.json();
			if (data.payload) {
				const b = data.payload.buyer || {};
				setBuyer({
					...b,
					fullName: b.fullName || data.buyerName || "",
					phone: b.phone || data.buyerPhone || "",
					address: b.address || "",
					innPin: b.innPin || "",
				});
				setOffice(data.payload.office);
				if (data.contractDate) setContractDateIso(data.contractDate);
			}
			if (data.buyerId != null) setBuyerId(Number(data.buyerId) || null);
			setContractMeta({
				totalAmount: Number(data.totalAmount) || 0,
				downPayment: Number(data.downPayment) || 0,
				remainingAmount: Number(data.remainingAmount) || 0,
				installmentMonths: Number(data.installmentMonths) || 12,
			});
			if (Array.isArray(data.schedule)) {
				setAnnexSchedule(data.schedule);
			}
		} catch (e) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Загрузка",
				variant: "destructive",
			});
		} finally {
			setLoadingData(false);
		}
	}, [salesContractId, toast]);

	useEffect(() => {
		loadContractData();
	}, [loadContractData]);

	const contractDate = useMemo(
		() => parseIsoToParts(contractDateIso),
		[contractDateIso],
	);

	const setBuyerField = (k: keyof ContractBuyer, v: string) =>
		setBuyer((p) => ({ ...p, [k]: v }));
	const setOfficeField = (k: keyof ContractOffice, v: string) =>
		setOffice((p) => ({ ...p, [k]: v }));

	const fmtMoney = (n: number) =>
		new Intl.NumberFormat("ru-RU").format(Math.round(n));

	const displaySchedule = useMemo(
		() =>
			resolveAnnexScheduleForDisplay(
				annexSchedule,
				contractMeta.totalAmount,
				contractMeta.downPayment,
				contractMeta.installmentMonths,
				contractDateIso,
			),
		[annexSchedule, contractMeta, contractDateIso],
	);

	const buyerMetaJson = (b: ContractBuyer) =>
		JSON.stringify({
			gender: b.gender,
			dateOfBirth: b.dateOfBirth || undefined,
			fullNameGenitive: b.fullNameGenitive || undefined,
			passportSeries: b.passportSeries || undefined,
			passportIssuedBy: b.passportIssuedBy || undefined,
			passportDate: b.passportDate || undefined,
			address: b.address || undefined,
			phone: b.phone || undefined,
			innPin: b.innPin || undefined,
		});

	const persistBuyerProfile = useCallback(async () => {
		if (!salesContractId) return;
		setSavingBuyer(true);
		try {
			await api.patch(`/construction/contracts-sales/${salesContractId}`, {
				buyerName: buyer.fullName.trim(),
				buyerPhone: buyer.phone.trim() || null,
				buyerMeta: buyerMetaJson(buyer),
			});
			if (buyerId) {
				await api.patch(`/counterparties/${buyerId}`, {
					fullName: buyer.fullName.trim(),
					phone: buyer.phone.trim() || null,
					address: buyer.address.trim() || null,
					iin: buyer.innPin.trim() || null,
					comment: buyerMetaJson(buyer),
				});
			}
		} catch (e) {
			toast({
				title: "Не удалось сохранить данные покупателя",
				description: e instanceof Error ? e.message : "",
				variant: "destructive",
			});
			throw e;
		} finally {
			setSavingBuyer(false);
		}
	}, [salesContractId, buyer, buyerId, toast]);

	const annexTotal = displaySchedule.reduce((s, r) => s + r.amount, 0);

	const handleGenerateSchedule = async () => {
		if (!salesContractId) return;
		setGeneratingSchedule(true);
		try {
			await api.post(
				`/construction/contracts-sales/${salesContractId}/generate-schedule`,
				{},
			);
			toast({ title: "График начислений создан" });
			await loadContractData();
		} catch (e) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось создать график",
				variant: "destructive",
			});
		} finally {
			setGeneratingSchedule(false);
		}
	};

	const handleDownloadAnnex = async () => {
		if (!buyer.fullName.trim()) {
			toast({ title: "Укажите ФИО покупателя", variant: "destructive" });
			return;
		}
		if (displaySchedule.length === 0) {
			toast({
				title: "Нет графика выплат",
				description:
					"Укажите сумму договора, первый взнос или сформируйте график начислений",
				variant: "destructive",
			});
			return;
		}
		setLoadingAnnex(true);
		try {
			if (salesContractId) await persistBuyerProfile();
			const token = localStorage.getItem("auth_token");
			const response = await fetch(
				`${getApiBase()}/construction/contracts/generate-annex1-docx`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						buyer,
						contractDate,
						schedule: displaySchedule,
					}),
				},
			);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка сервера");
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Приложение_1_${buyer.fullName.replace(/\s+/g, "_")}.docx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			toast({ title: "Приложение №1 скачано" });
		} catch (err) {
			toast({
				title: "Не удалось сгенерировать приложение",
				description: err instanceof Error ? err.message : "",
				variant: "destructive",
			});
		} finally {
			setLoadingAnnex(false);
		}
	};

	const handleDownload = async () => {
		if (!buyer.fullName.trim()) {
			toast({ title: "Укажите ФИО покупателя", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			if (salesContractId) await persistBuyerProfile();
			const token = localStorage.getItem("auth_token");
			const response = await fetch(
				`${getApiBase()}/construction/contracts/generate-docx`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({ buyer, office, contractDate, projectId }),
				},
			);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка сервера");
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Договор_${buyer.fullName.replace(/\s+/g, "_")}_офис${office.number}.docx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			toast({ title: "Договор скачан" });
		} catch (err) {
			toast({
				title: "Не удалось сгенерировать договор",
				description: err instanceof Error ? err.message : "",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	if (loadingData) {
		return (
			<div className="flex items-center justify-center py-16 text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin mr-2" />
				Загрузка данных договора...
			</div>
		);
	}

	const citizenship = buyer.gender === "м" ? "гражданин" : "гражданка";
	const pronoun = buyer.gender === "м" ? "именуемый" : "именуемая";

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h3 className="font-semibold text-lg">Предварительный договор</h3>
					<p className="text-sm text-muted-foreground">
						Предпросмотр и скачивание .docx по шаблону BFT
					</p>
				</div>
				<div className="flex flex-wrap gap-2 items-end">
					<div>
						<Label className="text-xs">Дата договора</Label>
						<Input
							type="date"
							className="mt-1 h-9 w-40"
							value={contractDateIso}
							onChange={(e) => setContractDateIso(e.target.value)}
						/>
					</div>
					<Button
						onClick={handleDownload}
						disabled={loading}
						className="bg-amber-500 hover:bg-orange-600 gap-2"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						Договор .docx
					</Button>
					<Button
						variant="outline"
						onClick={handleDownloadAnnex}
						disabled={loadingAnnex || displaySchedule.length === 0}
						className="gap-2"
					>
						{loadingAnnex ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<FileText className="h-4 w-4" />
						)}
						Приложение 1
					</Button>
				</div>
			</div>

			{displaySchedule.length > 0 && (
				<p className="text-xs text-muted-foreground">
					Первый взнос: {fmtMoney(contractMeta.downPayment)} · остаток:{" "}
					{fmtMoney(contractMeta.remainingAmount)} · в графике:{" "}
					{fmtMoney(annexTotal)} · платежей: {displaySchedule.length}
					{annexSchedule.length === 0 && " (расчёт по договору)"}
				</p>
			)}

			<div className="grid lg:grid-cols-2 gap-6">
				<div className="space-y-4 border rounded-xl p-4 bg-gray-50/50">
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs font-semibold text-gray-500 uppercase">
							Покупатель (для шаблона)
						</p>
						{salesContractId ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-7 text-xs"
								disabled={savingBuyer}
								onClick={async () => {
									try {
										await persistBuyerProfile();
										toast({ title: "Данные покупателя сохранены" });
									} catch {
										/* toast в persistBuyerProfile */
									}
								}}
							>
								{savingBuyer ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : null}
								Сохранить в договор
							</Button>
						) : null}
					</div>
					<p className="text-xs text-muted-foreground -mt-2">
						Подтягиваются из карточки контрагента и полей договора (телефон на
						договоре приоритетнее).
					</p>
					<div className="grid grid-cols-2 gap-2">
						<div className="col-span-2">
							<Label className="text-xs">ФИО</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.fullName}
								onChange={(e) => setBuyerField("fullName", e.target.value)}
							/>
						</div>
						<div className="col-span-2">
							<Label className="text-xs">ФИО (родительный падеж)</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.fullNameGenitive}
								onChange={(e) =>
									setBuyerField("fullNameGenitive", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Пол</Label>
							<Select
								value={buyer.gender}
								onValueChange={(v) => setBuyerField("gender", v)}
							>
								<SelectTrigger className="mt-1 h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="м">Мужской</SelectItem>
									<SelectItem value="ж">Женский</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Дата рождения</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.dateOfBirth}
								onChange={(e) => setBuyerField("dateOfBirth", e.target.value)}
								placeholder="21.03.1988"
							/>
						</div>
						<div className="col-span-2">
							<Label className="text-xs">ИНН / ПИН</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.innPin}
								onChange={(e) => setBuyerField("innPin", e.target.value)}
								placeholder="14 цифр"
							/>
						</div>
						<div>
							<Label className="text-xs">Паспорт</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.passportSeries}
								onChange={(e) =>
									setBuyerField("passportSeries", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Кем выдан</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.passportIssuedBy}
								onChange={(e) =>
									setBuyerField("passportIssuedBy", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Дата выдачи</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.passportDate}
								onChange={(e) => setBuyerField("passportDate", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Телефон</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.phone}
								onChange={(e) => setBuyerField("phone", e.target.value)}
							/>
						</div>
						<div className="col-span-2">
							<Label className="text-xs">Адрес</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={buyer.address}
								onChange={(e) => setBuyerField("address", e.target.value)}
							/>
						</div>
					</div>
				</div>

				<div className="space-y-4 border rounded-xl p-4 bg-gray-50/50">
					<p className="text-xs font-semibold text-gray-500 uppercase">
						Помещение
					</p>
					<div className="grid grid-cols-2 gap-2">
						<div className="col-span-2">
							<Label className="text-xs">Адрес объекта</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.address}
								onChange={(e) => setOfficeField("address", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Кадастровый код</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.cadastralCode}
								onChange={(e) =>
									setOfficeField("cadastralCode", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Площадь (м²)</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.area}
								onChange={(e) => setOfficeField("area", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Этаж</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.floor}
								onChange={(e) => setOfficeField("floor", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Блок</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.block}
								onChange={(e) => setOfficeField("block", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">№ кабинета</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.number}
								onChange={(e) => setOfficeField("number", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Цена (USD)</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.priceUsd}
								onChange={(e) => setOfficeField("priceUsd", e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Цена прописью</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.priceUsdWords}
								onChange={(e) =>
									setOfficeField("priceUsdWords", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Первый взнос</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.initialPayment}
								onChange={(e) =>
									setOfficeField("initialPayment", e.target.value)
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Взнос прописью</Label>
							<Input
								className="mt-1 h-8 text-sm"
								value={office.initialPaymentWords}
								onChange={(e) =>
									setOfficeField("initialPaymentWords", e.target.value)
								}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="overflow-auto bg-gray-200/60 p-6 rounded-xl max-h-[80vh] space-y-6">
				<div
					className="contract-preview bg-white mx-auto shadow-lg"
					style={{
						width: "794px",
						minHeight: "1123px",
						padding: "80px 90px",
						fontFamily: "'Times New Roman', Times, serif",
						fontSize: "14px",
						lineHeight: 1.6,
						color: "#000",
					}}
				>
					<ContractPreviewDocument
						buyer={buyer}
						office={office}
						contractDate={contractDate}
						citizenship={citizenship}
						pronoun={pronoun}
					/>
				</div>

				<div className="max-w-[794px] mx-auto flex flex-wrap items-center justify-between gap-2 px-1">
					<h4 className="font-semibold text-gray-800">
						Приложение №1 — график выплат
					</h4>
					{salesContractId && displaySchedule.length === 0 && (
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5"
							disabled={generatingSchedule}
							onClick={handleGenerateSchedule}
						>
							{generatingSchedule ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<RefreshCw className="w-3.5 h-3.5" />
							)}
							Сформировать график в начислениях
						</Button>
					)}
				</div>

				<div
					className="contract-preview bg-white mx-auto shadow-lg"
					style={{
						width: "794px",
						minHeight: "600px",
						padding: "80px 90px",
						fontFamily: "'Times New Roman', Times, serif",
						fontSize: "14px",
						lineHeight: 1.6,
						color: "#000",
					}}
				>
					<ContractAnnex1Preview
						buyer={buyer}
						contractDate={contractDate}
						schedule={displaySchedule}
					/>
				</div>
			</div>
		</div>
	);
}
