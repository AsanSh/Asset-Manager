import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

type ModuleTone = "cyan" | "emerald" | "blue" | "violet" | "amber";

type CommandMetric = {
	label: string;
	value: string | number;
	description: string;
	href: string;
	icon: LucideIcon;
	tone?: ModuleTone;
};

type CommandStep = {
	title: string;
	description: string;
	href: string;
	icon: LucideIcon;
	meta?: string;
	tone?: ModuleTone;
};

type CommandLane = {
	title: string;
	description: string;
	value: string;
	progress: number;
};

type QuickLink = {
	title: string;
	description: string;
	href: string;
	icon: LucideIcon;
};

type ModuleCommandCenterProps = {
	eyebrow: string;
	title: string;
	description: string;
	primaryHref: string;
	primaryLabel: string;
	metrics: CommandMetric[];
	steps: CommandStep[];
	lanes: CommandLane[];
	quickLinks: QuickLink[];
};

const toneMap: Record<
	ModuleTone,
	{
		icon: string;
		chip: string;
		card: string;
		ring: string;
		progress: string;
	}
> = {
	cyan: {
		icon: "text-cyan-600 bg-cyan-50",
		chip: "bg-cyan-50 text-cyan-700",
		card: "hover:border-cyan-200 hover:shadow-cyan-950/10",
		ring: "ring-cyan-100",
		progress: "bg-cyan-500",
	},
	emerald: {
		icon: "text-emerald-600 bg-emerald-50",
		chip: "bg-emerald-50 text-emerald-700",
		card: "hover:border-emerald-200 hover:shadow-emerald-950/10",
		ring: "ring-emerald-100",
		progress: "bg-emerald-600",
	},
	blue: {
		icon: "text-blue-600 bg-blue-50",
		chip: "bg-blue-50 text-blue-700",
		card: "hover:border-blue-200 hover:shadow-blue-950/10",
		ring: "ring-blue-100",
		progress: "bg-blue-500",
	},
	violet: {
		icon: "text-violet-600 bg-violet-50",
		chip: "bg-violet-50 text-violet-700",
		card: "hover:border-violet-200 hover:shadow-violet-950/10",
		ring: "ring-violet-100",
		progress: "bg-violet-500",
	},
	amber: {
		icon: "text-amber-600 bg-amber-50",
		chip: "bg-amber-50 text-amber-700",
		card: "hover:border-amber-200 hover:shadow-amber-950/10",
		ring: "ring-amber-100",
		progress: "bg-amber-500",
	},
};

export function ModuleCommandCenter({
	eyebrow,
	title,
	description,
	primaryHref,
	primaryLabel,
	metrics,
	steps,
	lanes,
	quickLinks,
}: ModuleCommandCenterProps) {
	return (
		<section className="construction-hero relative overflow-hidden rounded-3xl border border-white/60 bg-[#eef7f5] p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] md:p-6">
			<div className="relative z-10 grid items-start gap-5 xl:grid-cols-[1.05fr_1.45fr]">
				<div className="flex flex-col justify-between gap-5">
					<div>
						<div className="mb-3 inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
							{eyebrow}
						</div>
						<h2 className="max-w-2xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
							{title}
						</h2>
						<p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
							{description}
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<Link
							href={primaryHref}
							className="construction-press group rounded-2xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/15"
						>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-white/50">
										Главный вход
									</p>
									<p className="mt-2 text-lg font-bold">{primaryLabel}</p>
								</div>
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</div>
						</Link>
						<div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
								Принцип
							</p>
							<p className="mt-2 text-sm font-semibold leading-5 text-slate-700">
								Сначала маршрут работы, потом таблицы, отчеты и детализация.
							</p>
						</div>
					</div>
				</div>

				<div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{metrics.map((metric) => {
						const Icon = metric.icon;
						const tone = toneMap[metric.tone || "cyan"];
						return (
							<Link
								key={metric.label}
								href={metric.href}
								className={`construction-card-in group min-h-[132px] rounded-2xl border border-white/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tone.card}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className={`rounded-xl p-2.5 ${tone.icon}`}>
										<Icon className="h-5 w-5" />
									</div>
									<ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-700" />
								</div>
								<p className="mt-3 text-2xl font-black text-slate-950">
									{metric.value}
								</p>
								<p className="mt-1 text-sm font-semibold text-slate-700">
									{metric.label}
								</p>
								<p className="mt-1 text-xs leading-5 text-slate-500">
									{metric.description}
								</p>
							</Link>
						);
					})}
				</div>
			</div>

			<div className="relative z-10 mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
				<div className="rounded-lg border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
								Рабочая цепочка
							</p>
							<h3 className="mt-1 text-lg font-black text-slate-950">
								Куда нажимать и в каком порядке
							</h3>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{steps.map((step, index) => {
							const Icon = step.icon;
							const tone = toneMap[step.tone || "cyan"];
							return (
								<Link
									key={step.title}
									href={step.href}
									className={`construction-press group relative min-h-[126px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tone.card}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className={`rounded-xl p-2.5 ${tone.icon}`}>
											<Icon className="h-5 w-5" />
										</div>
										<span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone.chip}`}>
											{String(index + 1).padStart(2, "0")}
										</span>
									</div>
									<h4 className="mt-3 text-base font-black text-slate-950">
										{step.title}
									</h4>
									<p className="mt-1 text-xs leading-5 text-slate-500">
										{step.description}
									</p>
									{step.meta ? (
										<p className="mt-3 text-xs font-bold text-slate-400">
											{step.meta}
										</p>
									) : null}
								</Link>
							);
						})}
					</div>
				</div>

				<div className="grid gap-5">
					<div className="rounded-lg border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
							Роли и очереди
						</p>
						<div className="mt-4 space-y-3">
							{lanes.map((lane) => (
								<div key={lane.title} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="text-sm font-black text-slate-900">
												{lane.title}
											</p>
											<p className="mt-0.5 text-xs text-slate-500">
												{lane.description}
											</p>
										</div>
										<span className="text-sm font-black text-slate-950">
											{lane.value}
										</span>
									</div>
									<div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
										<div
											className="h-full rounded-full bg-slate-950"
											style={{ width: `${Math.min(100, Math.max(0, lane.progress))}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-[26px] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
							Быстрые переходы
						</p>
						<div className="mt-4 grid gap-2">
							{quickLinks.map((link) => {
								const Icon = link.icon;
								return (
									<Link
										key={link.title}
										href={link.href}
										className="construction-press group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-white hover:shadow-sm"
									>
										<div className="flex min-w-0 items-center gap-3">
											<div className="rounded-xl bg-white p-2 text-slate-700 ring-1 ring-slate-100">
												<Icon className="h-4 w-4" />
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-bold text-slate-900">
													{link.title}
												</p>
												<p className="truncate text-xs text-slate-500">
													{link.description}
												</p>
											</div>
										</div>
										<ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-700" />
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
