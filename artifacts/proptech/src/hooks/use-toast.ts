/**
 * Единый toast: useToast → sonner (без дублирования shadcn Toaster state).
 */
import * as React from "react";
import { toast as sonner } from "sonner";

type ToastInput = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "default" | "destructive" | "success";
};

function asText(node: React.ReactNode | undefined): string | undefined {
	if (node == null) return undefined;
	if (typeof node === "string" || typeof node === "number") return String(node);
	return undefined;
}

function toast({ title, description, variant }: ToastInput) {
	const message = asText(title) ?? asText(description) ?? "";
	const desc =
		asText(description) && asText(title) ? asText(description) : undefined;

	if (variant === "destructive") {
		sonner.error(message, { description: desc });
	} else if (variant === "success") {
		sonner.success(message, { description: desc });
	} else {
		sonner(message, { description: desc });
	}

	return {
		id: "sonner",
		dismiss: () => {},
		update: () => {},
	};
}

function useToast() {
	return {
		toasts: [] as never[],
		toast,
		dismiss: () => {},
	};
}

export { toast, useToast };
