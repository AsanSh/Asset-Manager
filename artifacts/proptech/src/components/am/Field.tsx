/**
 * AM Field — единая обёртка для полей формы.
 *
 * Использование:
 *   <Field label="Сумма договора" required helper="Минимум 100 000">
 *     <MoneyInput value={amount} onChange={setAmount} currency="KGS" />
 *   </Field>
 *
 * Структура всегда одинаковая:
 *   [Label *] [help icon]
 *   [Control]
 *   [Helper / Error]
 */
import { HelpCircle } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface FieldProps {
	label?: string;
	required?: boolean;
	help?: string;
	helper?: string;
	error?: string;
	htmlFor?: string;
	className?: string;
	children: React.ReactNode;
}

export function Field({
	label,
	required,
	help,
	helper,
	error,
	htmlFor,
	className,
	children,
}: FieldProps) {
	const cn = ["am-field flex flex-col gap-1.5", className].filter(Boolean).join(" ");
	return (
		<div className={cn}>
			{label && (
				<label
					htmlFor={htmlFor}
					className="flex items-center gap-1.5 text-[13px] font-medium text-am-text leading-tight transition-colors duration-150"
				>
					<span>{label}</span>
					{required && <span className="text-am-danger">*</span>}
					{help && (
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="text-am-text-subtle hover:text-am-text-muted hover:scale-110 transition-[color,transform] duration-150 ease-out"
									aria-label="Подсказка"
								>
									<HelpCircle className="w-3.5 h-3.5" />
								</button>
							</PopoverTrigger>
							<PopoverContent className="text-xs max-w-xs" side="top">
								{help}
							</PopoverContent>
						</Popover>
					)}
				</label>
			)}
			{children}
			{(error || helper) && (
				<p className={`text-[11px] leading-tight ${error ? "text-am-danger" : "text-am-text-muted"}`}>
					{error || helper}
				</p>
			)}
		</div>
	);
}

/**
 * FormGrid — секция формы с фиксированной сеткой.
 * Используется внутри Dialog/page form. 12-колоночная сетка.
 *
 *   <FormGrid>
 *     <Field label="Сумма" className="col-span-6">...</Field>
 *     <Field label="Дата" className="col-span-6">...</Field>
 *     <Field label="Описание" className="col-span-12">...</Field>
 *   </FormGrid>
 */
export function FormGrid({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const cn = [
		"am-form-grid-core grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-12",
		className,
	].filter(Boolean).join(" ");
	return <div className={cn}>{children}</div>;
}

/**
 * FormSection — группировка полей с заголовком (например, «Основное» / «Финансы»).
 */
export function FormSection({
	title,
	description,
	children,
	className,
}: {
	title?: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}) {
	const cn = ["space-y-3", className].filter(Boolean).join(" ");
	return (
		<section className={cn}>
			{title && (
				<header className="pb-1 border-b border-am-border">
					<h3 className="text-[13px] font-semibold text-am-text-strong uppercase tracking-wide">{title}</h3>
					{description && <p className="text-xs text-am-text-muted mt-0.5">{description}</p>}
				</header>
			)}
			<FormGrid>{children}</FormGrid>
		</section>
	);
}
