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
		<header className="am-page-header">
			<div className="min-w-0 flex-1 space-y-2">
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.12)]" />
					<span className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700">
						Planalityc workspace
					</span>
				</div>
				{breadcrumb && <div className="text-xs text-am-text-muted">{breadcrumb}</div>}
				<div className="flex items-center gap-3 min-w-0 flex-1">
					{backLink}
					<div className="min-w-0">
						<h1 className="am-page-title text-[24px] sm:text-[30px] truncate">
							{title}
						</h1>
						{subtitle && (
							<p className="am-page-subtitle text-[13px] sm:text-sm">{subtitle}</p>
						)}
					</div>
				</div>
			</div>
			{primaryAction && (
				<div className="flex items-center gap-2 flex-shrink-0">{primaryAction}</div>
			)}
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
		<div className="am-page space-y-5 max-w-full">
			<PageHeader {...{ title, subtitle, primaryAction, backLink, breadcrumb }} />
			{kpis && <div className="w-full min-w-0">{kpis}</div>}
			{filters && (
				<div className="am-shell-filter p-2.5 flex items-center gap-2 flex-wrap">
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
		<div className="am-page space-y-5 max-w-full">
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
		<div className="am-page space-y-5 max-w-full">
			<PageHeader {...{ title, subtitle, primaryAction, backLink, breadcrumb }} />
			{filters && (
				<div className="am-shell-filter p-2.5 flex items-center gap-2 flex-wrap">{filters}</div>
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
		<div className="am-page space-y-5 max-w-full">
			<PageHeader
				{...{ title, subtitle, primaryAction: exportAction || primaryAction, backLink, breadcrumb }}
			/>
			<div className="am-shell-filter p-2.5 flex items-center gap-2 flex-wrap">
				{filters}
			</div>
			{summary && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summary}</div>}
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
