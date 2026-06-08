import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"am-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
		" hover-elevate active-elevate-2",
	{
		variants: {
			variant: {
				default:
					"border border-cyan-700/20 bg-gradient-to-r from-cyan-700 to-teal-600 text-white shadow-lg shadow-cyan-900/15",
				destructive:
					"bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
				outline:
					// Inherits the current text color. Uses shadow-xs. no shadow on active
					// No hover state
					"border border-slate-200/90 bg-white/75 shadow-sm shadow-slate-950/5 active:shadow-none backdrop-blur hover:border-cyan-300/70",
				secondary:
					"border border-slate-200/90 bg-slate-100/70 text-secondary-foreground shadow-sm shadow-slate-950/5",
				ghost: "border border-transparent",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "min-h-[44px] px-4 py-2",
				sm: "min-h-[44px] px-3 text-xs",
				lg: "min-h-[48px] px-8",
				icon: "h-[44px] w-[44px]",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
