/**
 * AM PageShell — обёртки для архетипов страниц.
 *
 * 4 архетипа:
 *   PageShell.List      — список + фильтры + CRUD
 *   PageShell.Detail    — карточка сущности + табы
 *   PageShell.Dashboard — KPI + графики
 *   PageShell.Report    — период + срезы + большая таблица
 *
 * Обеспечивает: единый padding, отступы между блоками,
 * sticky filter-bar, единый стиль заголовка.
 */
import React from "react";

interface BaseHeaderProps {
	title: string;
	subtitle?: React.ReactNode;
	primaryAction?: React.ReactNode;
	backLink?: React.ReactNode;
	breadcrumb?: React.ReactNode;
}

/** Общий header — h1 + subtitle + primary action. Единый стиль. */
function PageHeader({ title, subtitle, primaryAction, backLink, breadcrumb }: BaseHeaderProps) {
	return (
		<header className="space-y-1">
			{breadcrumb && <div className="text-xs text-am-text-muted">{breadcrumb}</div>}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div className="flex items-center gap-3 min-w-0 flex-1">
					{backLink}
					<div className="min-w-0">
						<h1 className="text-[22px] font-bold text-am-text-strong leading-tight tracking-tight truncate">
							{title}
						</h1>
						{subtitle && (
							<p className="text-[13px] text-am-text-muted mt-0.5">{subtitle}</p>
						)}
					</div>
				</div>
				{primaryAction && (
					<div className="flex items-center gap-2 flex-shrink-0">{primaryAction}</div>
				)}
			</div>
		</header>
	);
}

// ─── List Shell ──────────────────────────────────────────────────────────

export interface ListShellProps extends BaseHeaderProps {
	kpis?: React.ReactNode;
	filters?: React.ReactNode;
	children: React.ReactNode;
}

function ListShell({ title, subtitle, primaryAction, backLink, breadcrumb, kpis, filters, children }: ListShellProps) {
	return (
		<div className="space-y-5 max-w-full">
			<PageHeader {...{ title, subtitle, primaryAction, backLink, breadcrumb }} />
			{kpis && <div className="w-full min-w-0">{kpis}</div>}
			{filters && (
				<div className="bg-am-bg rounded-lg border border-am-border p-3 flex items-center gap-2 flex-wrap">
					{filters}
				</div>
			)}
			<div>{children}</div>
		</div>
	);
}

// ─── Detail Shell ────────────────────────────────────────────────────────

export interface DetailShellProps extends BaseHeaderProps {
	tabs?: React.ReactNode;
	sidebar?: React.ReactNode;
	children: React.ReactNode;
}

function DetailShell({ title, subtitle, primaryAction, backLink, breadcrumb, tabs, sidebar, children }: DetailShellProps) {
	return (
		<div className="space-y-5 max-w-full">
			<PageHeader {...{ title, subtitle, primaryAction, backLink, breadcrumb }} />
			{tabs && <div className="border-b border-am-border">{tabs}</div>}
			{sidebar ? (
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
					<div className="min-w-0">{children}</div>
					<aside>{sidebar}</aside>
				</div>
			) : (
				<div>{children}</div>
			)}
		</div>
	);
}

// ─── Dashboard Shell ─────────────────────────────────────────────────────

export interface DashboardShellProps extends BaseHeaderProps {
	kpis?: React.ReactNode;
	filters?: React.ReactNode;
	children: React.ReactNode;
}

function DashboardShell({ title, subtitle, primaryAction, backLink, breadcrumb, kpis, filters, children }: DashboardShellProps) {
	return (
		<div className="space-y-5 max-w-full">
			<PageHeader {...{ title, subtitle, primaryAction, backLink, breadcrumb }} />
			{filters && (
				<div className="flex items-center gap-2 flex-wrap">{filters}</div>
			)}
			{kpis && <div className="w-full min-w-0">{kpis}</div>}
			<div className="space-y-5">{children}</div>
		</div>
	);
}

// ─── Report Shell ────────────────────────────────────────────────────────

export interface ReportShellProps extends BaseHeaderProps {
	filters: React.ReactNode;
	exportAction?: React.ReactNode;
	summary?: React.ReactNode;
	children: React.ReactNode;
}

function ReportShell({ title, subtitle, primaryAction, backLink, breadcrumb, filters, exportAction, summary, children }: ReportShellProps) {
	return (
		<div className="space-y-5 max-w-full">
			<PageHeader
				{...{ title, subtitle, primaryAction: exportAction || primaryAction, backLink, breadcrumb }}
			/>
			<div className="bg-am-bg rounded-lg border border-am-border p-3 flex items-center gap-2 flex-wrap">
				{filters}
			</div>
			{summary && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{summary}</div>}
			<div>{children}</div>
		</div>
	);
}

export const PageShell = {
	List: ListShell,
	Detail: DetailShell,
	Dashboard: DashboardShell,
	Report: ReportShell,
};
