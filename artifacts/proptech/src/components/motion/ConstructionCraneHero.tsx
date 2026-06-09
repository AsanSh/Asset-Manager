import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { ensureGsapPlugins, gsap } from "@/lib/motion/gsap-config";
import { usePrefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";

const FLOOR_COUNT = 5;

export function ConstructionCraneHero({ className }: { className?: string }) {
	const root = useRef<SVGSVGElement>(null);
	const reduced = usePrefersReducedMotion();

	useGSAP(
		() => {
			ensureGsapPlugins();
			const svg = root.current;
			if (!svg || reduced) return;

			const jib = svg.querySelector<SVGGElement>("[data-crane-jib]");
			const hook = svg.querySelector<SVGGElement>("[data-crane-hook]");
			const cable = svg.querySelector<SVGLineElement>("[data-crane-cable]");
			const floors = svg.querySelectorAll<SVGRectElement>("[data-building-floor]");

			if (!jib || !hook || !cable || !floors.length) return;

			gsap.set(floors, { scaleY: 0, transformOrigin: "50% 100%", opacity: 0 });
			gsap.set(hook, { y: -40 });
			gsap.set(jib, { rotation: -8, transformOrigin: "120px 72px" });

			const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

			tl.to(jib, { rotation: 6, duration: 1.2 })
				.to(hook, { y: 8, duration: 0.7 }, "-=0.4")
				.add(() => {
					floors.forEach((floor, i) => {
						gsap.to(floor, {
							scaleY: 1,
							opacity: 1,
							duration: 0.45,
							delay: i * 0.35,
							ease: "back.out(1.4)",
						});
					});
				})
				.to(hook, { y: -24, duration: 0.5 }, "+=0.2")
				.to(jib, { rotation: -4, duration: 0.8 }, "-=0.3")
				.to(
					svg.querySelector("[data-crane-glow]"),
					{ opacity: 0.35, duration: 1.5, yoyo: true, repeat: -1 },
					0,
				);

			return () => {
				tl.kill();
			};
		},
		{ scope: root, dependencies: [reduced] },
	);

	return (
		<svg
			ref={root}
			viewBox="0 0 360 260"
			className={cn("w-full max-w-[340px] h-auto drop-shadow-lg", className)}
			aria-hidden
		>
			<defs>
				<linearGradient id="crane-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="rgb(6 182 212 / 0.15)" />
					<stop offset="100%" stopColor="rgb(15 23 42 / 0)" />
				</linearGradient>
				<linearGradient id="building-fill" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#94a3b8" />
					<stop offset="100%" stopColor="#64748b" />
				</linearGradient>
			</defs>

			<rect width="360" height="260" fill="url(#crane-sky)" />

			{/* Ground */}
			<rect x="40" y="218" width="280" height="8" rx="2" fill="rgb(255 255 255 / 0.12)" />

			{/* Building */}
			<g data-building>
				<rect x="148" y="208" width="64" height="10" rx="2" fill="#475569" />
				{Array.from({ length: FLOOR_COUNT }, (_, i) => (
					<rect
						key={i}
						data-building-floor
						x={152}
						y={168 - i * 28}
						width={56}
						height={22}
						rx={3}
						fill="url(#building-fill)"
						stroke="rgb(255 255 255 / 0.25)"
						strokeWidth={1}
					/>
				))}
				{Array.from({ length: FLOOR_COUNT }, (_, fi) =>
					Array.from({ length: 3 }, (_, wi) => (
						<rect
							key={`${fi}-${wi}`}
							x={158 + wi * 16}
							y={174 - fi * 28}
							width={10}
							height={10}
							rx={1}
							fill="rgb(186 230 253 / 0.55)"
						/>
					)),
				)}
			</g>

			{/* Crane mast + jib */}
			<g data-crane-mast>
				<rect x="116" y="88" width="8" height="130" rx="2" fill="#fbbf24" />
				<rect x="108" y="210" width="24" height="8" rx="2" fill="#f59e0b" />
				<g data-crane-jib>
					<rect x="120" y="68" width="120" height={6} rx={2} fill="#fbbf24" />
					<rect x="232" y="64" width={6} height={14} rx={1} fill="#f59e0b" />
					<line
						data-crane-cable
						x1={235}
						y1={78}
						x2={235}
						y2={120}
						stroke="#e2e8f0"
						strokeWidth={1.5}
						strokeDasharray="3 2"
					/>
					<g data-crane-hook>
						<path
							d="M 232 120 L 238 120 L 235 132 Z"
							fill="#cbd5e1"
						/>
						<rect x="228" y="132" width="14" height="6" rx="1" fill="#94a3b8" />
					</g>
				</g>
			</g>

			<circle
				data-crane-glow
				cx="200"
				cy="140"
				r="90"
				fill="rgb(34 211 238 / 0.08)"
				opacity={0}
			/>
		</svg>
	);
}
