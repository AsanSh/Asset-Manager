import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";

export type CommandPaletteItem = {
	id: string;
	label: string;
	href: string;
	group: string;
	keywords?: string;
};

export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	return { open, setOpen };
}

export function CommandPalette({
	open,
	onOpenChange,
	items,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: CommandPaletteItem[];
}) {
	const [, setLocation] = useLocation();

	const groups = useMemo(
		() => [...new Set(items.map((item) => item.group))],
		[items],
	);

	const navigate = (href: string) => {
		onOpenChange(false);
		setLocation(href);
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput placeholder="Поиск страниц и разделов…" />
			<CommandList>
				<CommandEmpty>Ничего не найдено</CommandEmpty>
				{groups.map((group) => (
					<CommandGroup key={group} heading={group}>
						{items
							.filter((item) => item.group === group)
							.map((item) => (
								<CommandItem
									key={item.id}
									value={`${item.label} ${item.keywords ?? ""} ${group}`}
									onSelect={() => navigate(item.href)}
								>
									{item.label}
								</CommandItem>
							))}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}
