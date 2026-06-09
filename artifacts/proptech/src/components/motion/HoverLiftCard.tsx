import { useGSAP } from "@gsap/react";
import {
	type CSSProperties,
	type HTMLAttributes,
	type MouseEvent,
	type ReactNode,
	useRef,
} from "react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

type HoverLiftCardProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	onClick?: (e: MouseEvent<HTMLDivElement>) => void;
	title?: string;
	disabled?: boolean;
	tilt?: boolean;
};

export function HoverLiftCard({
	children,
	className,
	style,
	onClick,
	title,
	disabled,
	tilt = true,
	...rest
}: HoverLiftCardProps) {
	const ref = useRef<HTMLDivElement>(null);
	const reduced = usePrefersReducedMotion();

	useGSAP(
		() => {
			const el = ref.current;
			if (!el || reduced || disabled) return;

			const onEnter = () => {
				gsap.to(el, {
					y: -4,
					scale: 1.02,
					boxShadow: "0 16px 40px -12px rgba(15, 23, 42, 0.18)",
					duration: 0.28,
					overwrite: "auto",
				});
			};

			const onLeave = () => {
				gsap.to(el, {
					y: 0,
					scale: 1,
					rotateX: 0,
					rotateY: 0,
					boxShadow: "0 0 0 rgba(0,0,0,0)",
					duration: 0.32,
					overwrite: "auto",
				});
			};

			const onMove = (e: globalThis.MouseEvent) => {
				if (!tilt || window.matchMedia("(max-width: 768px)").matches) return;
				const rect = el.getBoundingClientRect();
				const px = (e.clientX - rect.left) / rect.width - 0.5;
				const py = (e.clientY - rect.top) / rect.height - 0.5;
				gsap.to(el, {
					rotateY: px * 8,
					rotateX: -py * 6,
					transformPerspective: 600,
					duration: 0.35,
					overwrite: "auto",
				});
			};

			el.addEventListener("mouseenter", onEnter);
			el.addEventListener("mouseleave", onLeave);
			el.addEventListener("mousemove", onMove);

			return () => {
				el.removeEventListener("mouseenter", onEnter);
				el.removeEventListener("mouseleave", onLeave);
				el.removeEventListener("mousemove", onMove);
			};
		},
		{ scope: ref, dependencies: [reduced, disabled, tilt] },
	);

	return (
		<div
			ref={ref}
			className={cn(className, disabled && "pointer-events-none")}
			style={style}
			onClick={disabled ? undefined : onClick}
			title={title}
			{...rest}
		>
			{children}
		</div>
	);
}
