import { Link } from "wouter";

export type BreadcrumbItem = {
	label: string;
	href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
	if (items.length === 0) return null;

	return (
		<nav aria-label="Хлебные крошки" className="flex items-center gap-1 text-xs text-am-text-muted flex-wrap">
			{items.map((item, index) => (
				<span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
					{index > 0 && <span className="text-am-text-subtle">/</span>}
					{item.href ? (
						<Link href={item.href} className="hover:text-am-text transition-colors">
							{item.label}
						</Link>
					) : (
						<span className="text-am-text">{item.label}</span>
					)}
				</span>
			))}
		</nav>
	);
}
