/** Чистая утилита без React/API — для module-access и тестов. */
export function parseCustomRoleId(role: string): number | null {
	const match = /^custom_(\d+)$/.exec(role);
	return match ? parseInt(match[1], 10) : null;
}

export function customRoleValue(id: number): string {
	return `custom_${id}`;
}
