import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
	return (
		<textarea
			className={cn(
				"flex min-h-[84px] w-full rounded-2xl border border-slate-200/90 bg-white/75 px-4 py-3 text-base shadow-sm shadow-slate-950/5 backdrop-blur placeholder:text-slate-400 focus-visible:border-cyan-500/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/12 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
});
Textarea.displayName = "Textarea";

export { Textarea };
