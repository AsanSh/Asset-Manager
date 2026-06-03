import { lazy, Suspense, useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const Player = lazy(() =>
	import("@remotion/player").then((m) => ({ default: m.Player })),
);

const FPS = 30;
const DURATION = 90;

function OsvoenieBars({
	budgetPct,
	spentPct,
}: {
	budgetPct: number;
	spentPct: number;
}) {
	const frame = useCurrentFrame();
	const spentAnim = interpolate(frame, [8, 40], [0, spentPct], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const budgetLine = Math.min(100, budgetPct);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#f8fafc",
				fontFamily: "system-ui, sans-serif",
				padding: 24,
				justifyContent: "center",
			}}
		>
			<div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>
				Освоение бюджета WBS (Remotion)
			</div>
			<div
				style={{
					height: 28,
					width: "100%",
					backgroundColor: "#e2e8f0",
					borderRadius: 8,
					overflow: "hidden",
					position: "relative",
				}}
			>
				<div
					style={{
						height: "100%",
						width: `${spentAnim}%`,
						backgroundColor: spentPct > budgetLine ? "#f43f5e" : "#f59e0b",
						borderRadius: 8,
					}}
				/>
				<div
					style={{
						position: "absolute",
						left: `${budgetLine}%`,
						top: 0,
						bottom: 0,
						width: 2,
						backgroundColor: "#3b82f6",
						opacity: 0.9,
					}}
				/>
			</div>
			<div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }}>
				<span style={{ color: "#b45309" }}>Освоено {Math.round(spentAnim)}%</span>
				<span style={{ color: "#2563eb" }}>План 100%</span>
			</div>
		</AbsoluteFill>
	);
}

export function WbsRemotionPreview({
	budgetKgs,
	spentKgs,
}: {
	budgetKgs: number;
	spentKgs: number;
}) {
	const spentPct = useMemo(() => {
		if (budgetKgs <= 0) return spentKgs > 0 ? 100 : 0;
		return Math.min(150, Math.round((spentKgs / budgetKgs) * 100));
	}, [budgetKgs, spentKgs]);

	const inputProps = useMemo(
		() => ({ budgetPct: 100, spentPct }),
		[spentPct],
	);

	return (
		<div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-3">
			<p className="text-[11px] text-amber-800/80 mb-2">
				Тест Remotion — анимация освоения на дашборде WBS (можно вынести в отчёты / видео)
			</p>
			<Suspense
				fallback={
					<div className="h-[120px] rounded-lg bg-white animate-pulse text-xs text-gray-400 flex items-center justify-center">
						Загрузка плеера…
					</div>
				}
			>
				<Player
					component={OsvoenieBars}
					durationInFrames={DURATION}
					compositionWidth={640}
					compositionHeight={120}
					fps={FPS}
					style={{ width: "100%", borderRadius: 8, overflow: "hidden" }}
					controls
					loop
					inputProps={inputProps}
				/>
			</Suspense>
		</div>
	);
}
