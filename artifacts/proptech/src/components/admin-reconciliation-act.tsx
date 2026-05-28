import { CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AdminReconciliationLine {
	date: string;
	description: string;
	type?: "delivery" | "payment" | "charge";
	amount?: number;
	charged?: number;
	paid?: number;
	currency?: string;
	suppliedTotal?: number;
	paidTotal?: number;
	balanceAfter?: number;
}

function fmtMoney(n: unknown, currency = "KGS") {
	const num = parseFloat(String(n ?? 0));
	return `${num.toLocaleString("ru-KG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(d: string | null | undefined) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

interface AdminReconciliationActProps {
	title?: string;
	subjectLabel: string;
	subjectName: string;
	contractLabel?: string;
	summary: Array<{ label: string; value: string; tone?: "default" | "emerald" | "amber" | "violet" }>;
	lines: AdminReconciliationLine[];
	currency?: string;
	mode?: "buyer" | "supplier" | "contractor";
}

export function AdminReconciliationAct({
	title = "Акт сверки",
	subjectLabel,
	subjectName,
	contractLabel,
	summary,
	lines,
	currency = "KGS",
	mode = "contractor",
}: AdminReconciliationActProps) {
	const printAct = () => {
		const rows = lines
			.map((line) => {
				const typeLabel =
					line.type === "delivery"
						? "Поставка"
						: line.type === "payment"
							? "Оплата"
							: line.type === "charge"
								? "Начисление"
								: "";
				const amount =
					line.charged != null
						? fmtMoney(line.charged, line.currency ?? currency)
						: line.paid != null
							? fmtMoney(line.paid, line.currency ?? currency)
							: fmtMoney(line.amount, line.currency ?? currency);
				return `<tr><td>${fmtDate(line.date)}</td><td>${typeLabel}</td><td>${line.description}</td><td style="text-align:right">${amount}</td><td style="text-align:right">${line.balanceAfter != null ? fmtMoney(line.balanceAfter, currency) : line.suppliedTotal != null ? fmtMoney(line.suppliedTotal, currency) : "—"}</td></tr>`;
			})
			.join("");
		const summaryHtml = summary
			.map((s) => `<p><strong>${s.label}:</strong> ${s.value}</p>`)
			.join("");
		const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${subjectName}</title>
			<style>body{font-family:system-ui,sans-serif;padding:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
			th,td{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}</style></head><body>
			<h1>${title}</h1>
			<p>${subjectLabel}: ${subjectName}${contractLabel ? ` · ${contractLabel}` : ""}</p>
			<div>${summaryHtml}</div>
			<table><thead><tr><th>Дата</th><th>Тип</th><th>Описание</th><th>Сумма</th><th>Баланс</th></tr></thead>
			<tbody>${rows || '<tr><td colspan="5" style="text-align:center">Нет операций</td></tr>'}</tbody></table>
			<script>window.onload=()=>window.print()</script></body></html>`;
		const w = window.open("", "_blank");
		if (!w) return;
		w.document.write(html);
		w.document.close();
	};

	return (
		<div className="border-t pt-3 space-y-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
					<CreditCard className="w-3.5 h-3.5" />
					{title}
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5 h-8"
					onClick={printAct}
				>
					<Printer className="w-3.5 h-3.5" />
					Печать
				</Button>
			</div>
			<div className="rounded-lg border bg-blue-50/40 px-3 py-2 text-xs text-gray-600 flex justify-between">
				<span>
					{subjectLabel}:{" "}
					<span className="font-medium text-gray-800">{subjectName}</span>
				</span>
				{contractLabel && <span>{contractLabel}</span>}
			</div>
			<div
				className={`grid gap-2 text-xs ${summary.length >= 4 ? "grid-cols-4" : "grid-cols-3"}`}
			>
				{summary.map((item) => (
					<div
						key={item.label}
						className={`rounded-md border px-2 py-1.5 ${
							item.tone === "emerald"
								? "bg-emerald-50"
								: item.tone === "amber"
									? "bg-amber-50"
									: item.tone === "violet"
										? "bg-violet-50"
										: "bg-gray-50"
						}`}
					>
						<p className="text-gray-500">{item.label}</p>
						<p className="font-semibold text-gray-900">{item.value}</p>
					</div>
				))}
			</div>
			{lines.length === 0 ? (
				<p className="text-sm text-gray-400 text-center py-4">Нет операций</p>
			) : (
				<div className="max-h-48 overflow-y-auto rounded-md border">
					<table className="w-full text-xs">
						<thead className="bg-gray-50 sticky top-0">
							<tr className="text-gray-500">
								<th className="text-left px-2 py-1.5 font-medium">Дата</th>
								{mode !== "contractor" && (
									<th className="text-left px-2 py-1.5 font-medium">Тип</th>
								)}
								<th className="text-left px-2 py-1.5 font-medium">Описание</th>
								<th className="text-right px-2 py-1.5 font-medium">Сумма</th>
								<th className="text-right px-2 py-1.5 font-medium">Баланс</th>
							</tr>
						</thead>
						<tbody>
							{lines.map((line, i) => (
								<tr key={i} className="border-t">
									<td className="px-2 py-1.5 text-gray-500">{fmtDate(line.date)}</td>
									{mode !== "contractor" && (
										<td className="px-2 py-1.5 text-gray-600">
											{line.type === "delivery"
												? "Поставка"
												: line.type === "payment"
													? "Оплата"
													: line.type === "charge"
														? "График"
														: "—"}
										</td>
									)}
									<td className="px-2 py-1.5 text-gray-700">{line.description}</td>
									<td className="px-2 py-1.5 text-right font-medium">
										{line.charged != null
											? fmtMoney(line.charged, line.currency ?? currency)
											: line.paid != null
												? fmtMoney(line.paid, line.currency ?? currency)
												: fmtMoney(line.amount, line.currency ?? currency)}
									</td>
									<td className="px-2 py-1.5 text-right">
										{line.balanceAfter != null
											? fmtMoney(line.balanceAfter, currency)
											: line.suppliedTotal != null
												? fmtMoney(line.suppliedTotal, currency)
												: "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export { fmtMoney as reconciliationFmtMoney, fmtDate as reconciliationFmtDate };
