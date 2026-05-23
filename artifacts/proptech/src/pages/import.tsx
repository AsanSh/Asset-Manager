import { useState } from "react";
import {
	type CommitImportBodyType,
	type ImportPreviewBodyType,
	useCommitImport,
	usePreviewImport,
} from "@/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ImportData() {
	const [importType, setImportType] =
		useState<ImportPreviewBodyType>("properties");
	const [jsonInput, setJsonInput] = useState("");
	const [previewData, setPreviewData] = useState<any>(null);
	const { toast } = useToast();

	const previewMutation = usePreviewImport();
	const commitMutation = useCommitImport();

	const handlePreview = () => {
		try {
			const parsedData = JSON.parse(jsonInput);
			if (!Array.isArray(parsedData)) {
				toast({
					title: "Error",
					description: "Input must be a JSON array of objects.",
					variant: "destructive",
				});
				return;
			}

			previewMutation.mutate(
				{ data: { type: importType, data: parsedData } },
				{
					onSuccess: (res) => {
						setPreviewData(res);
						toast({ title: "Preview Generated" });
					},
					onError: (err: any) => {
						toast({
							title: "Preview Failed",
							description: err.message,
							variant: "destructive",
						});
					},
				},
			);
		} catch (_e) {
			toast({
				title: "Error",
				description: "Invalid JSON format.",
				variant: "destructive",
			});
		}
	};

	const handleCommit = () => {
		try {
			const parsedData = JSON.parse(jsonInput);
			commitMutation.mutate(
				{
					data: {
						type: importType as unknown as CommitImportBodyType,
						data: parsedData,
						onlyValid: true,
					},
				},
				{
					onSuccess: () => {
						toast({ title: "Import Successful" });
						setPreviewData(null);
						setJsonInput("");
					},
					onError: (err: any) => {
						toast({
							title: "Import Failed",
							description: err.message,
							variant: "destructive",
						});
					},
				},
			);
		} catch (_e) {
			toast({
				title: "Error",
				description: "Invalid JSON format.",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Import Data</h2>
				<p className="text-muted-foreground mt-2">
					Paste JSON array to import records in bulk.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Import Type</label>
						<Select
							value={importType}
							onValueChange={(val: any) => setImportType(val)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="properties">Properties</SelectItem>
								<SelectItem value="counterparties">Counterparties</SelectItem>
								<SelectItem value="contracts">Contracts</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">JSON Data</label>
						<Textarea
							className="font-mono h-64"
							placeholder='[ { "projectName": "A", "unitNumber": "101", ... } ]'
							value={jsonInput}
							onChange={(e) => setJsonInput(e.target.value)}
						/>
					</div>

					<Button
						onClick={handlePreview}
						disabled={!jsonInput || previewMutation.isPending}
					>
						{previewMutation.isPending ? "Previewing..." : "Preview Import"}
					</Button>
				</div>

				<div className="space-y-4">
					<h3 className="text-xl font-semibold">Preview Results</h3>
					{previewData ? (
						<div className="space-y-4">
							<div className="flex gap-4">
								<Badge variant="outline">Total: {previewData.totalRows}</Badge>
								<Badge className="bg-emerald-600">
									Valid: {previewData.validRows}
								</Badge>
								<Badge variant="destructive">
									Errors: {previewData.errorRows}
								</Badge>
							</div>

							{previewData.errors?.length > 0 && (
								<div className="border rounded bg-destructive/10 p-4">
									<h4 className="font-semibold text-destructive mb-2">
										Errors
									</h4>
									<ul className="list-disc list-inside text-sm text-destructive pl-4">
										{previewData.errors.map((err: any, i: number) => (
											<li key={i}>
												Row {err.row}: {err.field ? `[${err.field}] ` : ""}
												{err.message}
											</li>
										))}
									</ul>
								</div>
							)}

							<Button
								onClick={handleCommit}
								disabled={commitMutation.isPending}
								className="w-full"
							>
								{commitMutation.isPending
									? "Committing..."
									: "Commit Valid Rows"}
							</Button>
						</div>
					) : (
						<div className="border rounded-md p-8 text-center text-muted-foreground flex flex-col items-center justify-center bg-card">
							<p>Run a preview to see validation results before committing.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
