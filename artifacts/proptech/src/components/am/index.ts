/**
 * AM Design System — единые компоненты Asset-Manager.
 *
 * Импорт:
 *   import { Field, MoneyInput, DateRangePicker, Status, PageShell } from "@/components/am";
 */

export { Field, FormGrid, FormSection } from "./Field";
export { MoneyInput } from "./MoneyInput";
export {
	DateRangePicker,
	ClearPeriodButton,
	getPresetRange,
	defaultPeriod,
	inPeriod,
} from "./DateRangePicker";
export type { PeriodValue, PeriodPreset, DateRangePickerProps } from "./DateRangePicker";
export { Status, STATUS_REGISTRY } from "./Status";
export type { StatusDef, StatusVariant, StatusProps } from "./Status";
export { PageShell } from "./PageShell";
export { Tablo } from "./Tablo";
export type { TabloProps } from "./Tablo";
export { ConfirmDialog, EmptyState, Spinner, Toolbar } from "./misc";
