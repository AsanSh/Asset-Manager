/**
 * Первая страница PDF → JPEG (для загрузки на API без лимита Vercel на большой base64-PDF).
 */
export async function pdfFirstPageToJpeg(
	file: File,
	maxWidth = 1600,
): Promise<{ base64: string; mimeType: string }> {
	const pdfjs = await import("pdfjs-dist");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		"pdfjs-dist/build/pdf.worker.min.mjs",
		import.meta.url,
	).toString();

	const data = new Uint8Array(await file.arrayBuffer());
	const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
	const page = await doc.getPage(1);

	const baseViewport = page.getViewport({ scale: 1 });
	const scale = Math.min(2.5, maxWidth / baseViewport.width);
	const viewport = page.getViewport({ scale });

	const canvas = document.createElement("canvas");
	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas не поддерживается");

	await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;

	const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
	const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;

	await doc.destroy();

	return { base64, mimeType: "image/jpeg" };
}
