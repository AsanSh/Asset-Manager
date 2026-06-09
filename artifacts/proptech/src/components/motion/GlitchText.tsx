import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

type GlitchTextProps = {
	children: string;
	className?: string;
	as?: "h1" | "h2" | "span";
};

export function GlitchText({
	children,
	className,
	as: Tag = "span",
}: GlitchTextProps) {
	const ref = useRef<HTMLElement>(null);
	const reduced = usePrefersReducedMotion();

	useGSAP(
		() => {
			const el = ref.current;
			if (!el || reduced) return;

			const tl = gsap.timeline({ repeat: 2, repeatDelay: 2.5 });

			tl.to(el, {
				x: () => gsap.utils.random(-3, 3),
				skewX: () => gsap.utils.random(-4, 4),
				duration: 0.06,
				repeat: 5,
				yoyo: true,
				ease: "none",
			}).to(el, {
				x: 0,
				skewX: 0,
				textShadow: "2px 0 #06b6d4, -2px 0 #f43f5e",
				duration: 0.08,
			}).to(el, {
				textShadow: "none",
				duration: 0.2,
			});

			return () => {
				tl.kill();
			};
		},
		{ scope: ref, dependencies: [reduced, children] },
	);

	return (
		<Tag ref={ref as never} className={cn("inline-block", className)}>
			{children}
		</Tag>
	);
}
