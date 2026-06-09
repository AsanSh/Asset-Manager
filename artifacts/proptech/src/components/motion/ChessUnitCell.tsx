import { useGSAP } from "@gsap/react";
import {
	type CSSProperties,
	type MouseEvent,
	type ReactNode,
	useRef,
} from "react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

type ChessUnitCellProps = {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	onClick?: (e: MouseEvent<HTMLDivElement>) => void;
	title?: string;
	disabled?: boolean;
};

/** Ячейка шахматки с лёгким hover-scale (без tilt — мелкий target). */
export function ChessUnitCell({
	children,
	className,
	style,
	onClick,
	title,
	disabled,
}: ChessUnitCellProps) {
	const ref = useRef<HTMLDivElement>(null);
	const reduced = usePrefersReducedMotion();

	useGSAP(
		() => {
			const el = ref.current;
			if (!el || reduced || disabled) return;

			const onEnter = () => {
				gsap.to(el, {
					scale: 1.07,
					y: -2,
					duration: 0.18,
					overwrite: "auto",
				});
			};
			const onLeave = () => {
				gsap.to(el, {
					scale: 1,
					y: 0,
					duration: 0.22,
					overwrite: "auto",
				});
			};

			el.addEventListener("mouseenter", onEnter);
			el.addEventListener("mouseleave", onLeave);
			return () => {
				el.removeEventListener("mouseenter", onEnter);
				el.removeEventListener("mouseleave", onLeave);
			};
		},
		{ scope: ref, dependencies: [reduced, disabled] },
	);

	return (
		<div
			ref={ref}
			className={cn(className, disabled && "pointer-events-none")}
			style={style}
			onClick={disabled ? undefined : onClick}
			title={title}
		>
			{children}
		</div>
	);
}
