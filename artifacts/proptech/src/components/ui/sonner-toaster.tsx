import { Toaster as Sonner } from "sonner";

/** Toast-контейнер для `import { toast } from "sonner"` (без next-themes). */
export function SonnerToaster() {
	return <Sonner richColors closeButton position="top-right" />;
}
