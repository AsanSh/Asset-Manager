export interface ShareActLine {
	date: string;
	description: string;
	amount: string;
	balance?: string;
}

export interface ShareActInput {
	title: string;
	subjectLabel: string;
	subjectName: string;
	contractNumber?: string | null;
	currency: string;
	summaryRows: { label: string; value: string }[];
	lines: ShareActLine[];
}

const MAX_SHARED_LINES = 60;

export function buildActText(input: ShareActInput): string {
	const today = new Date().toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

	const head = [
		`*${input.title}*`,
		`${input.subjectLabel}: ${input.subjectName}`,
		input.contractNumber ? `Договор № ${input.contractNumber}` : null,
		`Дата формирования: ${today}`,
	]
		.filter(Boolean)
		.join("\n");

	const summary = input.summaryRows
		.map((r) => `${r.label}: ${r.value}`)
		.join("\n");

	let lines = "";
	if (input.lines.length > 0) {
		const shown = input.lines.slice(0, MAX_SHARED_LINES);
		lines =
			"\n*Операции:*\n" +
			shown
				.map((l) => {
					const bal = l.balance ? ` · остаток ${l.balance}` : "";
					return `${l.date} — ${l.description}: ${l.amount}${bal}`;
				})
				.join("\n");
		if (input.lines.length > MAX_SHARED_LINES) {
			lines += `\n… и ещё ${input.lines.length - MAX_SHARED_LINES} операц. (полный акт — кнопка «Распечатать»)`;
		}
	}

	return `${head}\n\n${summary}${lines}\n\n— BuildFlow`;
}

/**
 * Делится актом сверки. На телефоне открывает нативный лист (WhatsApp и др.),
 * на десктопе/без Web Share API — открывает WhatsApp Web с заполненным текстом.
 * @returns "shared" | "whatsapp" | "cancelled"
 */
export async function shareAct(
	input: ShareActInput,
): Promise<"shared" | "whatsapp" | "cancelled"> {
	const text = buildActText(input);
	const title = `${input.title} — ${input.subjectName}`;

	const nav = navigator as Navigator & {
		share?: (data: { title?: string; text?: string }) => Promise<void>;
	};

	if (typeof nav.share === "function") {
		try {
			await nav.share({ title, text });
			return "shared";
		} catch (e) {
			if (e instanceof Error && e.name === "AbortError") return "cancelled";
			// прочие ошибки — фолбэк на WhatsApp
		}
	}

	const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
	window.open(url, "_blank", "noopener,noreferrer");
	return "whatsapp";
}
