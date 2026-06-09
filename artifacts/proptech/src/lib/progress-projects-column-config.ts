export const PROGRESS_COLUMN_CONFIG_KEY = "progress-projects-column-config";

export type ProgressCustomColumn = {
	id: string;
	label: string;
	groupId: string;
};

export type ProgressColumnConfig = {
	labelOverrides: Record<string, string>;
	customColumns: ProgressCustomColumn[];
	/** projectId → columnId → numeric value */
	customValues: Record<string, Record<string, number>>;
};

const DEFAULT_CONFIG: ProgressColumnConfig = {
	labelOverrides: {},
	customColumns: [],
	customValues: {},
};

export function loadProgressColumnConfig(): ProgressColumnConfig {
	try {
		const raw = localStorage.getItem(PROGRESS_COLUMN_CONFIG_KEY);
		if (!raw) return { ...DEFAULT_CONFIG };
		const parsed = JSON.parse(raw) as Partial<ProgressColumnConfig>;
		return {
			labelOverrides: parsed.labelOverrides ?? {},
			customColumns: parsed.customColumns ?? [],
			customValues: parsed.customValues ?? {},
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveProgressColumnConfig(config: ProgressColumnConfig): void {
	localStorage.setItem(PROGRESS_COLUMN_CONFIG_KEY, JSON.stringify(config));
}

export function newCustomColumnId(): string {
	return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
