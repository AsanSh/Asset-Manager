import {
	Check,
	CheckCircle2,
	ChevronRight,
	FileEdit,
	PenLine,
	Send,
	UserCircle,
	XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const CONTRACT_PIPELINE = [
	{
		key: "draft",
		label: "Черновик",
		short: "Черновик",
		hint: "Договор создан, можно править сумму и покупателя",
		icon: FileEdit,
	},
	{
		key: "review",
		label: "На утверждение",
		short: "Утверждение",
		hint: "Отправлен на согласование (руководитель / юрист)",
		icon: Send,
	},
	{
		key: "signed",
		label: "Подписан",
		short: "Подписан",
		hint: "Покупатель подписал договор, можно формировать график",
		icon: PenLine,
	},
	{
		key: "completed",
		label: "Завершён",
		short: "Завершён",
		hint: "Все платежи получены или сделка закрыта",
		icon: CheckCircle2,
	},
] as const;

export type ContractPipelineStatus = (typeof CONTRACT_PIPELINE)[number]["key"];

type Props = {
	status: string;
	onStatusChange: (status: string) => void;
	loading?: boolean;
};

function stepIndex(status: string): number {
	const i = CONTRACT_PIPELINE.findIndex((s) => s.key === status);
	return i >= 0 ? i : -1;
}

export function ContractStatusStepper({
	status,
	onStatusChange,
	loading,
}: Props) {
	const currentIdx = stepIndex(status);
	const isCancelled = status === "cancelled";
	const next =
		currentIdx >= 0 && currentIdx < CONTRACT_PIPELINE.length - 1
			? CONTRACT_PIPELINE[currentIdx + 1]
			: null;

	const changeStatus = (target: string, label: string) => {
		if (target === status || loading) return;
		if (
			!confirm(
				`Перевести договор в статус «${label}»?\n\nЭто делает менеджер продаж вручную — автоматически этап не меняется.`,
			)
		) {
			return;
		}
		onStatusChange(target);
	};

	if (isCancelled) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
				<div className="flex items-start gap-2 text-rose-800">
					<XCircle className="w-5 h-5 shrink-0 mt-0.5" />
					<div>
						<p className="font-semibold text-sm">Договор расторгнут</p>
						<p className="text-xs text-rose-700 mt-0.5">
							Сделка отменена. Чтобы продолжить работу, верните договор в
							черновик.
						</p>
					</div>
				</div>
				<Button
					size="sm"
					variant="outline"
					className="border-rose-300"
					disabled={loading}
					onClick={() => changeStatus("draft", "Черновик")}
				>
					Вернуть в черновик
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-4 space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p className="text-sm font-semibold text-gray-900">
						Этап сделки по договору
					</p>
					<p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
						<UserCircle className="w-3.5 h-3.5 shrink-0" />
						Меняет <span className="font-medium text-gray-700">менеджер продаж</span>{" "}
						— нажмите этап или кнопку ниже
					</p>
				</div>
				{currentIdx >= 0 && (
					<span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
						Сейчас: {CONTRACT_PIPELINE[currentIdx].label}
					</span>
				)}
			</div>

			{/* Stepper */}
			<div className="relative pt-1">
				<div
					className="absolute top-[18px] left-[8%] right-[8%] h-0.5 bg-gray-200 -z-0"
					aria-hidden
				/>
				<div
					className="absolute top-[18px] left-[8%] h-0.5 bg-amber-400 -z-0 transition-all"
					style={{
						width:
							currentIdx <= 0
								? "0%"
								: `${(currentIdx / (CONTRACT_PIPELINE.length - 1)) * 84}%`,
					}}
					aria-hidden
				/>
				<ol className="relative z-10 flex justify-between gap-1">
					{CONTRACT_PIPELINE.map((step, idx) => {
						const done = currentIdx > idx;
						const current = status === step.key;
						const upcoming = currentIdx >= 0 && idx > currentIdx;
						const Icon = step.icon;

						return (
							<li key={step.key} className="flex flex-col items-center flex-1 min-w-0">
								<button
									type="button"
									title={step.hint}
									disabled={loading}
									onClick={() => changeStatus(step.key, step.label)}
									className={`
										group flex flex-col items-center w-full max-w-[120px] transition-all
										${loading ? "opacity-50 cursor-wait" : "cursor-pointer"}
									`}
								>
									<span
										className={`
											flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold
											transition-all shadow-sm
											${current ? "border-amber-500 bg-amber-500 text-white ring-4 ring-amber-100 scale-110" : ""}
											${done ? "border-emerald-500 bg-emerald-500 text-white" : ""}
											${upcoming ? "border-gray-300 bg-white text-gray-400 group-hover:border-amber-300 group-hover:text-amber-600" : ""}
											${!current && !done && !upcoming && currentIdx < 0 ? "border-gray-300 bg-white text-gray-400" : ""}
										`}
									>
										{done ? (
											<Check className="w-4 h-4" strokeWidth={3} />
										) : (
											<Icon className="w-4 h-4" />
										)}
									</span>
									<span
										className={`
											mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight px-0.5
											${current ? "text-amber-700 font-semibold" : ""}
											${done ? "text-emerald-700" : ""}
											${upcoming ? "text-gray-500 group-hover:text-amber-700" : ""}
										`}
									>
										{step.short}
									</span>
									{current && (
										<span className="text-[9px] text-amber-600 font-medium mt-0.5">
											вы здесь
										</span>
									)}
								</button>
							</li>
						);
					})}
				</ol>
			</div>

			{currentIdx >= 0 && (
				<p className="text-xs text-gray-600 bg-white/80 border border-gray-100 rounded-lg px-3 py-2">
					{CONTRACT_PIPELINE[currentIdx].hint}
				</p>
			)}

			<div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
				{next && (
					<Button
						size="sm"
						className="bg-amber-500 hover:bg-orange-600 gap-1"
						disabled={loading}
						onClick={() => changeStatus(next.key, next.label)}
					>
						Следующий этап
						<ChevronRight className="w-4 h-4" />
						{next.label}
					</Button>
				)}
				{!isCancelled && (
					<Button
						size="sm"
						variant="outline"
						className="text-rose-700 border-rose-200 hover:bg-rose-50 ml-auto"
						disabled={loading}
						onClick={() => changeStatus("cancelled", "Расторгнут")}
					>
						<XCircle className="w-3.5 h-3.5 mr-1" />
						Расторгнуть
					</Button>
				)}
			</div>
		</div>
	);
}
