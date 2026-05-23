export type UnitStatusColorKey =
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "violet"
  | "slate"
  | "cyan"
  | "orange";

export const UNIT_STATUS_COLOR_PRESETS: Record<
  UnitStatusColorKey,
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-50 hover:bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  blue: {
    bg: "bg-blue-50 hover:bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  amber: {
    bg: "bg-amber-50 hover:bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  rose: {
    bg: "bg-rose-50 hover:bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  violet: {
    bg: "bg-violet-50 hover:bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  slate: {
    bg: "bg-slate-50 hover:bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  cyan: {
    bg: "bg-cyan-50 hover:bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
  orange: {
    bg: "bg-orange-50 hover:bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
};

export const DEFAULT_UNIT_STATUSES = [
  {
    code: "available",
    label: "Свободна",
    colorKey: "emerald" as UnitStatusColorKey,
    sortOrder: 0,
    isSystem: true,
    saleMode: "none",
  },
  {
    code: "reserved",
    label: "Забронирована",
    colorKey: "blue" as UnitStatusColorKey,
    sortOrder: 1,
    isSystem: true,
    saleMode: "reserved",
  },
  {
    code: "sold",
    label: "Продана",
    colorKey: "amber" as UnitStatusColorKey,
    sortOrder: 2,
    isSystem: true,
    saleMode: "sold",
  },
  {
    code: "occupied",
    label: "Заселена",
    colorKey: "blue" as UnitStatusColorKey,
    sortOrder: 3,
    isSystem: true,
    saleMode: "none",
  },
  {
    code: "construction",
    label: "Строится",
    colorKey: "amber" as UnitStatusColorKey,
    sortOrder: 4,
    isSystem: true,
    saleMode: "none",
  },
];
