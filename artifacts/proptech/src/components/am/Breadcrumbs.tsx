import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
	label: string;
	href?: string;
};

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
	return (
		<nav className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
			<Link href="/dashboard">
				<span className="inline-flex items-center rounded-md p-1 hover:text-foreground">
					<Home className="h-3.5 w-3.5" />
				</span>
			</Link>
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				return (
					<div key={`${item.label}-${index}`} className="flex items-center gap-1">
						<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
						{item.href && !isLast ? (
							<Link href={item.href}>
								<span className="rounded-md px-1 py-0.5 hover:text-foreground">{item.label}</span>
							</Link>
						) : (
							<span className={cn("px-1 py-0.5", isLast && "font-medium text-foreground")}>
								{item.label}
							</span>
						)}
					</div>
				);
			})}
		</nav>
	);
}
