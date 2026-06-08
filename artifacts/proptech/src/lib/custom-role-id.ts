const CUSTOM_ROLE_PREFIX = "custom:";

export function parseCustomRoleId(role: string | null | undefined): number | null {
	if (!role) return null;
	if (!role.startsWith(CUSTOM_ROLE_PREFIX)) return null;
	const id = Number(role.slice(CUSTOM_ROLE_PREFIX.length));
	return Number.isInteger(id) && id > 0 ? id : null;
}

export function buildCustomRoleId(id: number): string {
	return `${CUSTOM_ROLE_PREFIX}${id}`;
}
