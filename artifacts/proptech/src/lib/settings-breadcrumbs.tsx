import { Breadcrumbs, type BreadcrumbItem } from "@/components/am/Breadcrumbs";

export function settingsBreadcrumb(currentLabel: string): BreadcrumbItem[] {
	return [
		{ label: "Настройки", href: "/settings" },
		{ label: currentLabel },
	];
}

export function SettingsBreadcrumb({ label }: { label: string }) {
	return <Breadcrumbs items={settingsBreadcrumb(label)} />;
}
