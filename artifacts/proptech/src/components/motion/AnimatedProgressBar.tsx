import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

type AnimatedProgressBarProps = {
	progress: number;
	className?: string;
	barClassName?: string;
};

export function AnimatedProgressBar({
	progress,
	className,
	barClassName,
}: AnimatedProgressBarProps) {
	const fillRef = useRef<HTMLDivElement>(null);
	const reduced = usePrefersReducedMotion();
	const clamped = Math.min(100, Math.max(0, progress));

	useGSAP(
		() => {
			const fill = fillRef.current;
			if (!fill) return;
			if (reduced) {
				fill.style.width = `${clamped}%`;
				return;
			}
			gsap.fromTo(
				fill,
				{ width: "0%" },
				{ width: `${clamped}%`, duration: 0.9, ease: "power2.out", delay: 0.15 },
			);
		},
		{ scope: fillRef, dependencies: [clamped, reduced] },
	);

	return (
		<div
			className={cn(
				"h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100",
				className,
			)}
		>
			<div
				ref={fillRef}
				className={cn("h-full rounded-full bg-slate-950", barClassName)}
				style={reduced ? { width: `${clamped}%` } : { width: 0 }}
			/>
		</div>
	);
}
