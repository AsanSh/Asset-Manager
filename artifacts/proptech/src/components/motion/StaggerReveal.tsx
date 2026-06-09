import { useGSAP } from "@gsap/react";
import {
	createElement,
	type ElementType,
	type ReactNode,
	useRef,
} from "react";
import { ensureGsapPlugins, gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

type StaggerRevealProps = {
	children: ReactNode;
	className?: string;
	as?: ElementType;
	delay?: number;
	stagger?: number;
	childSelector?: string;
};

export function StaggerReveal({
	children,
	className,
	as: Tag = "div",
	delay = 0,
	stagger = 0.07,
	childSelector,
}: StaggerRevealProps) {
	const ref = useRef<HTMLElement>(null);
	const reduced = usePrefersReducedMotion();

	useGSAP(
		() => {
			ensureGsapPlugins();
			const root = ref.current;
			if (!root || reduced) return;

			const targets = childSelector
				? root.querySelectorAll(childSelector)
				: Array.from(root.children);

			if (!targets.length) return;

			gsap.from(targets, {
				opacity: 0,
				y: 18,
				scale: 0.98,
				stagger,
				delay,
				duration: 0.5,
				clearProps: "transform",
			});
		},
		{ scope: ref, dependencies: [reduced, delay, stagger, childSelector] },
	);

	return createElement(Tag, { ref, className }, children);
}
