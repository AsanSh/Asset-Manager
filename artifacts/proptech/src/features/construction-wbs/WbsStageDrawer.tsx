import { Edit2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inferStageStatus, statusMeta } from "./status";
import { buildChildrenMap } from "./tree";
import type { FlatWbsNode, WbsStage, WbsTaskSummary } from "./types";

export function WbsStageDrawer({
	open,
	node,
	projectName,
	tasks,
	fmt,
	onClose,
	onEdit,
	onDelete,
	onAddSub,
}: {
	open: boolean;
	node: FlatWbsNode | null;
	projectName: string;
	tasks: WbsTaskSummary[];
	fmt: (kgs: number) => string;
	onClose: () => void;
	onEdit: (s: WbsStage) => void;
	onDelete: (id: number) => void;
	onAddSub: (s: WbsStage) => void;
}) {
	if (!node) return null;

	const st = inferStageStatus(node.stage, node.metrics);
	const meta = statusMeta(st);
	const stageTasks = tasks.filter((t) => Number(t.stageId) === node.id);

	return (
		<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
			<SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
				<SheetHeader className="px-4 pt-4 pb-2 border-b border-gray-100">
					<div className="flex items-start justify-between gap-2 pr-8">
						<div className="min-w-0">
							<p className="text-[11px] font-mono text-gray-400">{node.wbsCode}</p>
							<SheetTitle className="text-left truncate">{node.stage.name}</SheetTitle>
							<SheetDescription className="text-left">{projectName}</SheetDescription>
						</div>
						<span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${meta.badge}`}>
							{meta.label}
						</span>
					</div>
					<div className="flex gap-1 pt-2">
						<Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onEdit(node.stage)}>
							<Edit2 className="w-3.5 h-3.5" /> Изменить
						</Button>
						<Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onAddSub(node.stage)}>
							<Plus className="w-3.5 h-3.5" /> Подэтап
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 text-rose-600"
							onClick={() => onDelete(node.id)}
						>
							<Trash2 className="w-3.5 h-3.5" />
						</Button>
					</div>
				</SheetHeader>

				<ScrollArea className="flex-1">
					<Tabs defaultValue="info" className="px-4 py-3">
						<TabsList className="grid w-full grid-cols-4 h-9">
							<TabsTrigger value="info" className="text-xs">
								Обзор
							</TabsTrigger>
							<TabsTrigger value="tasks" className="text-xs">
								Задачи
							</TabsTrigger>
							<TabsTrigger value="finance" className="text-xs">
								Финансы
							</TabsTrigger>
							<TabsTrigger value="links" className="text-xs">
								Связи
							</TabsTrigger>
						</TabsList>

						<TabsContent value="info" className="space-y-4 mt-4">
							<div>
								<p className="text-xs text-gray-500 mb-1">Прогресс</p>
								<Progress value={node.metrics.effectiveProgress} className="h-2 mb-1" />
								<p className="text-sm font-semibold">{node.metrics.effectiveProgress}%</p>
							</div>
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-xs text-gray-500">Начало</p>
									<p>{node.stage.startDate || "—"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Окончание</p>
									<p>{node.stage.plannedEndDate || "—"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Задачи</p>
									<p>{node.metrics.taskCount}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Подэтапы</p>
									<p>{node.childrenCount}</p>
								</div>
							</div>
							{node.stage.description && (
								<div>
									<p className="text-xs text-gray-500 mb-1">Описание</p>
									<p className="text-sm text-gray-700">{node.stage.description}</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="tasks" className="mt-4 space-y-2">
							{stageTasks.length === 0 ? (
								<p className="text-sm text-gray-400 py-4 text-center">Нет задач на этом этапе</p>
							) : (
								stageTasks.slice(0, 20).map((t) => (
									<Link
										key={t.id}
										href={`/construction/tasks/${t.id}`}
										className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
									>
										<span>Задача #{t.id}</span>
										<span className="text-xs text-gray-400">{t.status}</span>
									</Link>
								))
							)}
							<Link href={`/construction/tasks?stageId=${node.id}`}>
								<Button variant="link" className="px-0 h-8 text-amber-600">
									Все задачи этапа →
								</Button>
							</Link>
						</TabsContent>

						<TabsContent value="finance" className="mt-4 space-y-3">
							<div className="rounded-lg border border-gray-100 p-3 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-500">Бюджет</span>
									<span className="font-semibold">{fmt(node.metrics.budgetKgs)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Освоено</span>
									<span className="font-semibold text-amber-700">{fmt(node.metrics.spentKgs)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Остаток</span>
									<span className={node.metrics.remainderKgs >= 0 ? "text-emerald-700" : "text-rose-700"}>
										{fmt(node.metrics.remainderKgs)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Отклонение</span>
									<span>{fmt(node.metrics.deviationKgs)}</span>
								</div>
								<div className="flex justify-between text-xs text-gray-400 pt-1 border-t">
									<span>План {node.metrics.planPct}%</span>
									<span>Факт {node.metrics.factPct}%</span>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-2 mt-2">
								<Link href={`/construction/expenses?projectId=${node.stage.projectId}&stageId=${node.id}`}>
									<Button variant="outline" size="sm" className="w-full gap-1">
										<ExternalLink className="w-3.5 h-3.5" /> Расходы этапа
									</Button>
								</Link>
								<Link href={`/construction/budget?projectId=${node.stage.projectId}`}>
									<Button variant="outline" size="sm" className="w-full gap-1">
										<ExternalLink className="w-3.5 h-3.5" /> Бюджет проекта
									</Button>
								</Link>
							</div>
						</TabsContent>

						<TabsContent value="links" className="mt-4 space-y-2">
							<p className="text-xs text-gray-500 mb-2">Быстрые переходы к связанным модулям</p>
							{[
								{ href: `/construction/tasks?stageId=${node.id}`, label: "Задачи и подзадачи" },
								{ href: `/construction/budget?projectId=${node.stage.projectId}`, label: "Бюджет и освоение" },
								{ href: `/construction/operations?projectId=${node.stage.projectId}`, label: "Операции / снабжение" },
								{ href: `/construction/contractors?projectId=${node.stage.projectId}`, label: "Подрядчики" },
								{ href: `/construction/photo-gallery?projectId=${node.stage.projectId}`, label: "Фотоотчёты" },
							].map((link) => (
								<Link key={link.href} href={link.href}>
									<Button variant="ghost" size="sm" className="w-full justify-between h-9">
										{link.label}
										<ExternalLink className="w-3.5 h-3.5 text-gray-400" />
									</Button>
								</Link>
							))}
						</TabsContent>
					</Tabs>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}

/** Sub-stages list helper for cards view */
export function getChildNodes(flat: FlatWbsNode[], parentId: number): FlatWbsNode[] {
	return flat.filter((n) => n.parentId === parentId);
}

export function countDescendants(stages: WbsStage[], rootId: number): number {
	const map = buildChildrenMap(stages);
	let count = 0;
	const stack = [...(map.get(rootId) ?? [])];
	while (stack.length) {
		const s = stack.pop()!;
		count++;
		stack.push(...(map.get(s.id) ?? []));
	}
	return count;
}
