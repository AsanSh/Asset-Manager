import { cn } from "@/lib/utils";

// Gradient Bar Chart Component
interface GradientBarProps {
  value: number;
  maxValue: number;
  color?: "emerald" | "red" | "blue" | "amber" | "cyan";
  height?: string;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function GradientBar({
  value,
  maxValue,
  color = "emerald",
  height = "h-32",
  label,
  showValue = false,
  className,
}: GradientBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  const colorClasses = {
    emerald:
      "bg-gradient-to-t from-emerald-500 via-emerald-400 to-emerald-300 shadow-emerald-500/20",
    red: "bg-gradient-to-t from-red-500 via-red-400 to-red-300 shadow-red-500/20",
    blue: "bg-gradient-to-t from-blue-500 via-blue-400 to-blue-300 shadow-blue-500/20",
    amber:
      "bg-gradient-to-t from-amber-500 via-amber-400 to-amber-300 shadow-amber-500/20",
    cyan: "bg-gradient-to-t from-cyan-500 via-cyan-400 to-cyan-300 shadow-cyan-500/20",
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("w-full relative", height)}>
        <div
          className={cn(
            "absolute bottom-0 w-full rounded-t-lg shadow-lg transition-all duration-500 ease-out",
            colorClasses[color]
          )}
          style={{ height: `${Math.max(percentage, 3)}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-lg" />
        </div>
      </div>
      {label && (
        <span className="text-xs text-gray-600 font-medium">{label}</span>
      )}
      {showValue && (
        <span className="text-sm font-semibold text-gray-900">
          {new Intl.NumberFormat("ru-RU").format(value)}
        </span>
      )}
    </div>
  );
}

// Stacked Bar with Gradient
interface StackedBarProps {
  segments: Array<{
    value: number;
    color: "emerald" | "red" | "blue" | "amber" | "cyan";
    label: string;
  }>;
  height?: string;
  className?: string;
}

export function StackedGradientBar({
  segments,
  height = "h-8",
  className,
}: StackedBarProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  const colorClasses = {
    emerald: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    red: "bg-gradient-to-r from-red-500 to-red-400",
    blue: "bg-gradient-to-r from-blue-500 to-blue-400",
    amber: "bg-gradient-to-r from-amber-500 to-amber-400",
    cyan: "bg-gradient-to-r from-cyan-500 to-cyan-400",
  };

  return (
    <div className={cn("w-full rounded-full overflow-hidden flex", height, className)}>
      {segments.map((seg, idx) => {
        const percentage = total > 0 ? (seg.value / total) * 100 : 0;
        return (
          <div
            key={idx}
            className={cn(
              "transition-all duration-500 relative group",
              colorClasses[seg.color]
            )}
            style={{ width: `${percentage}%` }}
            title={`${seg.label}: ${seg.value}`}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        );
      })}
    </div>
  );
}

// Donut/Pie Segment with Gradient
interface DonutSegmentProps {
  percentage: number;
  color: "emerald" | "red" | "blue" | "amber" | "cyan";
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function GradientDonutSegment({
  percentage,
  color,
  size = 120,
  strokeWidth = 12,
  className,
}: DonutSegmentProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    emerald: "stroke-emerald-500",
    red: "stroke-red-500",
    blue: "stroke-blue-500",
    amber: "stroke-amber-500",
    cyan: "stroke-cyan-500",
  };

  return (
    <svg
      width={size}
      height={size}
      className={cn("transform -rotate-90", className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn("transition-all duration-500", colorClasses[color])}
      />
    </svg>
  );
}

// Area Chart Background Gradient (for SVG charts)
export const chartGradients = {
  emerald: (
    <defs>
      <linearGradient id="gradientEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
        <stop offset="50%" stopColor="#10b981" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
  red: (
    <defs>
      <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
        <stop offset="50%" stopColor="#ef4444" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
  cyan: (
    <defs>
      <linearGradient id="gradientCyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
        <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
  blue: (
    <defs>
      <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
        <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
  amber: (
    <defs>
      <linearGradient id="gradientAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
};
