/**
 * AM MoneyInput — поле для денежной суммы с суффиксом валюты.
 *
 * - Форматирует число с пробелами при потере фокуса.
 * - При фокусе показывает чистое число (удобнее редактировать).
 * - Можно сделать валюту изменяемой через onCurrencyChange.
 */
import { useState } from "react";

const CURRENCIES = ["KGS", "USD"] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_LABEL: Record<Currency, string> = {
	KGS: "сом",
	USD: "$",
};

export interface MoneyInputProps {
	value: string | number | null | undefined;
	onChange: (value: string) => void;
	currency?: Currency | string;
	onCurrencyChange?: (currency: string) => void;
	placeholder?: string;
	id?: string;
	disabled?: boolean;
	error?: boolean;
	min?: number;
	max?: number;
}

function formatWithSpaces(v: string): string {
	if (!v) return "";
	const num = String(v).replace(/\s/g, "");
	if (Number.isNaN(parseFloat(num))) return num;
	const [intPart, decPart] = num.split(".");
	const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	return decPart != null ? `${formatted}.${decPart}` : formatted;
}

function cleanNumber(v: string): string {
	return v.replace(/[^\d.,-]/g, "").replace(",", ".");
}

export function MoneyInput({
	value,
	onChange,
	currency = "KGS",
	onCurrencyChange,
	placeholder = "0",
	id,
	disabled,
	error,
	min,
	max,
}: MoneyInputProps) {
	const [focused, setFocused] = useState(false);
	const stringValue = value == null ? "" : String(value);

	const displayed = focused
		? stringValue
		: formatWithSpaces(stringValue);

	const cls = [
		"am-control flex items-center gap-2 pr-2",
		error ? "am-control--error" : "",
	].filter(Boolean).join(" ");

	return (
		<div className={cls}>
			<input
				id={id}
				type="text"
				inputMode="decimal"
				disabled={disabled}
				placeholder={placeholder}
				value={displayed}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChange={(e) => {
					const cleaned = cleanNumber(e.target.value);
					if (min !== undefined && cleaned !== "" && parseFloat(cleaned) < min) return;
					if (max !== undefined && cleaned !== "" && parseFloat(cleaned) > max) return;
					onChange(cleaned);
				}}
				className="am-num flex-1 bg-transparent outline-none text-am-text-strong placeholder:text-am-text-subtle"
			/>
			{onCurrencyChange ? (
				<select
					value={currency}
					onChange={(e) => onCurrencyChange(e.target.value)}
					disabled={disabled}
					className="bg-transparent text-xs text-am-text-muted border-l border-am-border pl-2 outline-none cursor-pointer"
				>
					{CURRENCIES.map((c) => (
						<option key={c} value={c}>{c}</option>
					))}
				</select>
			) : (
				<span className="text-xs text-am-text-muted border-l border-am-border pl-2">
					{CURRENCY_LABEL[currency as Currency] || currency}
				</span>
			)}
		</div>
	);
}
