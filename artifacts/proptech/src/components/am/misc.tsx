/**
 * AM Misc — мелкие переиспользуемые компоненты:
 *   ConfirmDialog — единое подтверждение действия (удаление, отмена)
 *   EmptyState    — пустое состояние с иллюстрацией
 *   Spinner       — лоадер
 *   Toolbar       — обёртка для FilterBar
 */
import { AlertTriangle, Loader2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── ConfirmDialog ────────────────────────────────────────────────────── */

export interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Опасное действие — красная кнопка подтверждения. */
	destructive?: boolean;
	loading?: boolean;
}

export function ConfirmDialog({
	open, onClose, onConfirm,
	title, description,
	confirmLabel = "Подтвердить",
	cancelLabel = "Отмена",
	destructive, loading,
}: ConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						{destructive && <AlertTriangle className="w-5 h-5 text-am-danger" />}
						{title}
					</AlertDialogTitle>
					{description && (
						<AlertDialogDescription>{description}</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={loading}
						className={destructive ? "bg-am-danger hover:bg-am-danger/90 text-white" : ""}
					>
						{loading ? <Loader2 className="w-4 h-4 am-spin mr-2" /> : null}
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/* ─── EmptyState ───────────────────────────────────────────────────────── */

export interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
	return (
		<div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"} text-am-text-muted`}>
			{icon && <div className="mb-3 text-am-text-subtle">{icon}</div>}
			<p className="text-sm font-medium text-am-text">{title}</p>
			{description && <p className="text-xs text-am-text-muted mt-1 max-w-md">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

/* ─── Spinner ──────────────────────────────────────────────────────────── */

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
	return (
		<Loader2
			className={`am-spin text-am-brand ${className}`}
			style={{ width: size, height: size }}
		/>
	);
}

/* ─── Toolbar ──────────────────────────────────────────────────────────── */

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
	const cn = ["flex items-center gap-2 flex-wrap", className].filter(Boolean).join(" ");
	return <div className={cn}>{children}</div>;
}
