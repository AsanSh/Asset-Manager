/**
 * Advestor Design System — Showcase страница.
 * URL: /design-system
 *
 * Демонстрация всех новых унифицированных компонентов:
 * tokens, Field, MoneyInput, DateRangePicker, Status, PageShell.
 * (CSS-классы префиксованы `am-*` по историческим причинам.)
 */
import { useState } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import {
	Field, FormSection,
	MoneyInput,
	DateRangePicker, defaultPeriod, type PeriodValue,
	Status,
	PageShell,
	ConfirmDialog, EmptyState, Spinner, Toolbar,
} from "@/components/am";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function DesignSystemShowcase() {
	const [amount, setAmount] = useState<string>("1200000");
	const [downPayment, setDownPayment] = useState<string>("300000");
	const [installments, setInstallments] = useState<string>("12");
	const [contractDate, setContractDate] = useState<string>("2026-05-31");
	const [currency, setCurrency] = useState<string>("KGS");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	return (
		<PageShell.Report
			title="Advestor Design System"
			subtitle="Один корпоративный язык на 140 страниц."
			filters={
				<>
					<DateRangePicker value={period} onChange={setPeriod} />
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="am-control !h-9 w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все статусы</SelectItem>
							<SelectItem value="active">Активные</SelectItem>
							<SelectItem value="overdue">Просроченные</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder="Поиск..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="am-control !h-9 w-48"
					/>
				</>
			}
			exportAction={
				<Button className="bg-am-brand hover:bg-am-brand-hover text-white">
					<Plus className="w-4 h-4 mr-2" /> Новая запись
				</Button>
			}
		>
			<div className="space-y-8">
				{/* ─── Tokens / Palette ───────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-3">
						Цветовая палитра
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{[
							{ cls: "bg-am-brand", token: "bg-am-brand", label: "Бренд (CTA)" },
							{ cls: "bg-am-success", token: "bg-am-success", label: "Успех" },
							{ cls: "bg-am-warning", token: "bg-am-warning", label: "Внимание" },
							{ cls: "bg-am-danger", token: "bg-am-danger", label: "Критично" },
							{ cls: "bg-am-info", token: "bg-am-info", label: "Информация" },
							{ cls: "bg-am-text-muted", token: "bg-am-text-muted", label: "Текст" },
						].map((c) => (
							<div key={c.token} className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-md border border-am-border ${c.cls}`} />
								<div>
									<p className="text-sm font-medium text-am-text-strong">{c.label}</p>
									<code className="text-[10px] text-am-text-muted">{c.token}</code>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* ─── Form sandbox ─────────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-1">
						Форма. Единая сетка и поля
					</h2>
					<p className="text-xs text-am-text-muted mb-4">
						Замена сломанной формы "Сумма / Первоначальный взнос / Рассрочка / Дата договора".
						Все поля выровнены по высоте 40px, label сверху, валидация снизу.
					</p>
					<FormSection title="Основное">
						<Field label="Сумма договора" required className="col-span-12 md:col-span-4" help="Общая стоимость договора">
							<MoneyInput
								value={amount}
								onChange={setAmount}
								currency={currency}
								onCurrencyChange={setCurrency}
							/>
						</Field>
						<Field label="Первоначальный взнос" className="col-span-12 md:col-span-4" helper="Сразу при подписании">
							<MoneyInput value={downPayment} onChange={setDownPayment} currency={currency} />
						</Field>
						<Field label="Рассрочка (мес.)" className="col-span-6 md:col-span-2">
							<input
								type="number"
								className="am-control"
								value={installments}
								onChange={(e) => setInstallments(e.target.value)}
							/>
						</Field>
						<Field label="Дата договора" required className="col-span-6 md:col-span-2">
							<input
								type="date"
								className="am-control"
								value={contractDate}
								onChange={(e) => setContractDate(e.target.value)}
							/>
						</Field>
					</FormSection>

					<div className="mt-6">
						<FormSection title="Состояния полей">
							<Field label="Default" className="col-span-6 md:col-span-3">
								<input className="am-control" placeholder="Обычное поле" />
							</Field>
							<Field label="С ошибкой" error="Введите сумму больше 0" className="col-span-6 md:col-span-3">
								<input className="am-control am-control--error" defaultValue="-50" />
							</Field>
							<Field label="Отключено" className="col-span-6 md:col-span-3">
								<input className="am-control" disabled defaultValue="Недоступно" />
							</Field>
							<Field label="С подсказкой" help="Полная цена ÷ кол-во месяцев" className="col-span-6 md:col-span-3">
								<input className="am-control" defaultValue="100 000" />
							</Field>
						</FormSection>
					</div>
				</section>

				{/* ─── DateRangePicker ─────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-1">
						Период. Единый picker
					</h2>
					<p className="text-xs text-am-text-muted mb-4">
						Trigger показывает читаемый контекст ("Май 2026"). Стрелки ◀▶ сдвигают
						на пред./след. период. Внутри popover'а: radio-пресеты, произвольный диапазон,
						кнопка "Применить".
					</p>
					<Toolbar>
						<DateRangePicker value={period} onChange={setPeriod} />
						<code className="ml-3 text-[11px] text-am-text-muted">
							{JSON.stringify(period)}
						</code>
					</Toolbar>
				</section>

				{/* ─── Status ──────────────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-1">
						Статусы. Один регистр на проект
					</h2>
					<p className="text-xs text-am-text-muted mb-4">
						Один регистр, единые цвета. 7 групп: универсальные, договоры/платежи,
						юниты (продажа), юниты (строительство), аренда, закуп, финансы.
					</p>
					{[
						{ title: "Универсальные", keys: ["draft", "pending", "in_progress", "review", "approved", "active", "inactive", "completed", "cancelled", "rejected", "overdue", "on_hold", "awaiting_approval"] },
						{ title: "Договоры и платежи", keys: ["signed", "paid", "partial", "unpaid", "reconciled", "disputed"] },
						{ title: "Юниты — продажа", keys: ["available", "reserved", "sold"] },
						{ title: "Юниты — строительство", keys: ["under_construction", "commissioning", "commissioned"] },
						{ title: "Аренда", keys: ["vacant", "occupied", "notice", "expired"] },
						{ title: "Закуп / склад", keys: ["requested", "ordered", "awaiting_delivery", "delivered", "used"] },
						{ title: "Приоритеты", keys: ["low", "medium", "high", "critical"] },
					].map((g) => (
						<div key={g.title} className="mb-4">
							<p className="text-[11px] uppercase tracking-wide text-am-text-muted font-semibold mb-2">
								{g.title}
							</p>
							<div className="flex flex-wrap gap-2">
								{g.keys.map((s) => (
									<Status key={s} value={s} />
								))}
							</div>
						</div>
					))}
					<div className="mt-4 pt-4 border-t border-am-border">
						<p className="text-xs text-am-text-muted mb-2">Вариант с точкой (компактный, для таблиц):</p>
						<div className="flex flex-wrap gap-2">
							{["draft", "active", "completed", "cancelled", "overdue", "commissioned", "occupied"].map((s) => (
								<Status key={s} value={s} dot />
							))}
						</div>
					</div>
				</section>

				{/* ─── EmptyState / Spinner ────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-3">
						Пустое состояние и Spinner
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="border border-am-border rounded-lg">
							<EmptyState
								icon={<FileText className="w-10 h-10" />}
								title="Договоров пока нет"
								description="Создайте первый договор продажи квартиры"
								action={<Button className="bg-am-brand hover:bg-am-brand-hover text-white">Новый договор</Button>}
							/>
						</div>
						<div className="border border-am-border rounded-lg flex items-center justify-center py-16">
							<div className="flex flex-col items-center gap-3">
								<Spinner size={32} />
								<p className="text-sm text-am-text-muted">Загрузка данных...</p>
							</div>
						</div>
					</div>
				</section>

				{/* ─── ConfirmDialog ───────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-3">
						Подтверждение действия
					</h2>
					<div className="flex gap-3">
						<Button variant="outline" onClick={() => setConfirmOpen(true)}>
							<Trash2 className="w-4 h-4 mr-2" /> Удалить договор
						</Button>
					</div>
					<ConfirmDialog
						open={confirmOpen}
						onClose={() => setConfirmOpen(false)}
						onConfirm={() => {
							setConfirmOpen(false);
						}}
						title="Удалить договор?"
						description="Действие необратимо. Все начисления и оплаты по договору также будут удалены."
						confirmLabel="Удалить навсегда"
						destructive
					/>
				</section>

				{/* ─── Высоты контролов ────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-3">
						Шкала высот
					</h2>
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<button className="am-control !h-7 !w-auto px-3 text-xs">xs · 28px</button>
							<span className="text-xs text-am-text-muted">Только chips и badges</span>
						</div>
						<div className="flex items-center gap-3">
							<button className="am-control !h-8 !w-auto px-3 text-xs">sm · 32px</button>
							<span className="text-xs text-am-text-muted">Toolbar, фильтры, secondary actions</span>
						</div>
						<div className="flex items-center gap-3">
							<button className="am-control !w-auto px-4">md · 40px (default)</button>
							<span className="text-xs text-am-text-muted">Поля формы, обычные кнопки</span>
						</div>
						<div className="flex items-center gap-3">
							<button className="am-control !h-11 !w-auto px-4 bg-am-brand text-white border-am-brand">lg · 44px</button>
							<span className="text-xs text-am-text-muted">Primary action на странице</span>
						</div>
					</div>
				</section>

				{/* ─── Архетипы страниц ────────────────────────────────── */}
				<section className="bg-am-bg border border-am-border rounded-lg p-5">
					<h2 className="text-base font-semibold text-am-text-strong mb-1">
						Архетипы страниц (PageShell)
					</h2>
					<p className="text-xs text-am-text-muted mb-3">
						Четыре формы под все 140 экранов. Выбираешь архетип, не верстаешь скелет с нуля.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
						{[
							{ name: "List", desc: "Список + фильтры + CRUD" },
							{ name: "Detail", desc: "Карточка + табы" },
							{ name: "Dashboard", desc: "KPI + графики" },
							{ name: "Report", desc: "Период + срезы + таблица" },
						].map((a) => (
							<div key={a.name} className="border border-am-border rounded-md p-3">
								<p className="text-sm font-semibold text-am-text-strong">PageShell.{a.name}</p>
								<p className="text-am-text-muted mt-1">{a.desc}</p>
							</div>
						))}
					</div>
					<div className="mt-4 pt-4 border-t border-am-border">
						<p className="text-[11px] uppercase tracking-wide text-am-text-muted font-semibold mb-2">
							140 страниц по модулям
						</p>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
							{[
								{ name: "Стройка", count: 41 },
								{ name: "Аренда", count: 31 },
								{ name: "Склад", count: 16 },
								{ name: "CRM", count: 9 },
								{ name: "Портал", count: 7 },
								{ name: "Отчёты", count: 5 },
								{ name: "Системные", count: 11 },
								{ name: "CRM", count: 2 },
								{ name: "Прочие", count: 18 },
							].map((m) => (
								<div key={m.name} className="flex items-baseline gap-2">
									<span className="text-am-text-strong font-medium tabular-nums">{m.count}</span>
									<span className="text-am-text-muted">{m.name}</span>
								</div>
							))}
						</div>
					</div>
				</section>
			</div>
		</PageShell.Report>
	);
}
