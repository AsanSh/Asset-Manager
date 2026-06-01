/**
 * AM Status — единый компонент для отображения статусов сущностей.
 *
 * Использование: <Status value="active" /> — берёт label, иконку, цвет
 * из словаря STATUS_REGISTRY. Если value не найдено — фолбэк "—".
 *
 * Кастомизация: <Status value="active" registry={CUSTOM_REGISTRY} />
 */
import {
	AlertCircle,
	AlertTriangle,
	Ban,
	Check,
	CheckCircle2,
	Circle,
	Clock,
	HardHat,
	HelpCircle,
	Home,
	Key,
	Package,
	Pause,
	Truck,
	X,
	XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatusVariant =
	| "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export interface StatusDef {
	label: string;
	variant: StatusVariant;
	icon?: LucideIcon;
}

/** Единый словарь — все статусы проекта. */
export const STATUS_REGISTRY: Record<string, StatusDef> = {
	// Универсальные
	draft:        { label: "Черновик",      variant: "neutral", icon: Circle },
	pending:      { label: "Ожидает",       variant: "warning", icon: Clock },
	in_progress:  { label: "В работе",      variant: "info",    icon: Clock },
	review:       { label: "На проверке",   variant: "info",    icon: AlertCircle },
	approved:     { label: "Утверждено",    variant: "success", icon: CheckCircle2 },
	signed:       { label: "Подписан",      variant: "success", icon: CheckCircle2 },
	active:       { label: "Активен",       variant: "success", icon: Check },
	inactive:     { label: "Неактивен",     variant: "neutral", icon: Pause },
	completed:    { label: "Завершён",      variant: "success", icon: CheckCircle2 },
	done:         { label: "Готово",        variant: "success", icon: CheckCircle2 },
	paused:       { label: "Приостановлен", variant: "warning", icon: Pause },
	planned:      { label: "Запланирован",  variant: "neutral", icon: Circle },
	cancelled:    { label: "Отменён",       variant: "danger",  icon: XCircle },
	rejected:     { label: "Отклонён",      variant: "danger",  icon: X },
	overdue:      { label: "Просрочен",     variant: "danger",  icon: AlertTriangle },
	blacklisted:  { label: "Чёрный список", variant: "danger",  icon: Ban },
	todo:         { label: "К выполнению",  variant: "neutral", icon: Circle },

	// Платежи / договоры
	paid:         { label: "Оплачено",      variant: "success", icon: CheckCircle2 },
	partial:      { label: "Частично",      variant: "warning", icon: AlertCircle },
	unpaid:       { label: "Не оплачено",   variant: "warning", icon: AlertCircle },

	// Квартиры / юниты (продажа)
	available:    { label: "Свободно",      variant: "neutral", icon: Circle },
	reserved:     { label: "Бронь",         variant: "warning", icon: Clock },
	sold:         { label: "Продано",       variant: "success", icon: CheckCircle2 },

	// Юниты — строительство (фазы)
	under_construction: { label: "Строится",      variant: "info",    icon: HardHat },
	commissioning:      { label: "Приёмка",       variant: "warning", icon: Key },
	commissioned:       { label: "Сдан",          variant: "success", icon: Key },

	// Аренда
	vacant:       { label: "Свободна",      variant: "neutral", icon: Home },
	occupied:     { label: "Арендуется",    variant: "info",    icon: Home },
	notice:       { label: "Уведомление",   variant: "warning", icon: AlertCircle },
	expired:      { label: "Истёк",         variant: "danger",  icon: XCircle },

	// Закуп / снабжение / склад
	requested:    { label: "Запрошено",     variant: "neutral", icon: Package },
	ordered:      { label: "Заказано",      variant: "info",    icon: Package },
	awaiting_delivery: { label: "Ждёт поставку", variant: "warning", icon: Truck },
	delivered:    { label: "Доставлено",    variant: "success", icon: Truck },
	used:         { label: "Использовано",  variant: "info",    icon: CheckCircle2 },

	// Финансы / сверка
	reconciled:   { label: "Сверено",       variant: "success", icon: CheckCircle2 },
	disputed:     { label: "Спорное",       variant: "danger",  icon: AlertTriangle },

	// Workflow / согласование
	on_hold:           { label: "Заморожено",     variant: "warning", icon: Pause },
	awaiting_approval: { label: "На согласовании", variant: "warning", icon: Clock },

	// Приоритеты задач (используется как Status тоже)
	low:          { label: "Низкий",        variant: "neutral", icon: Circle },
	medium:       { label: "Средний",       variant: "info",    icon: Circle },
	high:         { label: "Высокий",       variant: "warning", icon: AlertCircle },
	critical:     { label: "Критический",   variant: "danger",  icon: AlertTriangle },
};

const VARIANT_CLASSES: Record<StatusVariant, string> = {
	neutral: "bg-am-surface text-am-text border-am-border",
	info:    "bg-am-info-surface text-am-info border-am-info/20",
	success: "bg-am-success-surface text-am-success border-am-success/20",
	warning: "bg-am-warning-surface text-am-warning border-am-warning/20",
	danger:  "bg-am-danger-surface text-am-danger border-am-danger/20",
	brand:   "bg-am-brand-surface text-am-brand border-am-brand/20",
};

export interface StatusProps {
	value: string | null | undefined;
	registry?: Record<string, StatusDef>;
	/** Скрыть иконку */
	noIcon?: boolean;
	/** Заменить label */
	label?: string;
	/** Точка-индикатор слева вместо иконки (компактнее в таблицах) */
	dot?: boolean;
	className?: string;
}

export function Status({
	value,
	registry = STATUS_REGISTRY,
	noIcon,
	label,
	dot,
	className,
}: StatusProps) {
	const def = value ? registry[value] : null;
	const variant = def?.variant ?? "neutral";
	const text = label ?? def?.label ?? value ?? "-";
	const Icon = def?.icon ?? HelpCircle;

	const cls = [
		"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap",
		VARIANT_CLASSES[variant],
		className,
	].filter(Boolean).join(" ");

	return (
		<span className={cls}>
			{dot ? (
				<span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
			) : !noIcon ? (
				<Icon className="w-3 h-3" strokeWidth={2.5} />
			) : null}
			<span>{text}</span>
		</span>
	);
}
