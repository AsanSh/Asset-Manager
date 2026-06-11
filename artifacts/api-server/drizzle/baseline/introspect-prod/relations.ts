import { relations } from "drizzle-orm/relations";
import { marketplaceSuppliers, users, constructionStages, marketplaceProducts, marketplacePriceImports, userTableViews, constructionTasks, constructionTaskSubtasks, constructionTaskAttachments, constructionTaskChecklistItems, constructionTaskActivity, constructionTaskPhotos, taskComments, constructionTaskDependencies, constructionContractors, constructionSalesContracts, supplyRequests, barterAssets, barterMovements } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	marketplaceSupplier: one(marketplaceSuppliers, {
		fields: [users.linkedMarketplaceSupplierId],
		references: [marketplaceSuppliers.id]
	}),
	userTableViews: many(userTableViews),
}));

export const marketplaceSuppliersRelations = relations(marketplaceSuppliers, ({many}) => ({
	users: many(users),
	marketplaceProducts: many(marketplaceProducts),
	marketplacePriceImports: many(marketplacePriceImports),
}));

export const constructionStagesRelations = relations(constructionStages, ({one, many}) => ({
	constructionStage: one(constructionStages, {
		fields: [constructionStages.parentStageId],
		references: [constructionStages.id],
		relationName: "constructionStages_parentStageId_constructionStages_id"
	}),
	constructionStages: many(constructionStages, {
		relationName: "constructionStages_parentStageId_constructionStages_id"
	}),
}));

export const marketplaceProductsRelations = relations(marketplaceProducts, ({one}) => ({
	marketplaceSupplier: one(marketplaceSuppliers, {
		fields: [marketplaceProducts.supplierId],
		references: [marketplaceSuppliers.id]
	}),
}));

export const marketplacePriceImportsRelations = relations(marketplacePriceImports, ({one}) => ({
	marketplaceSupplier: one(marketplaceSuppliers, {
		fields: [marketplacePriceImports.supplierId],
		references: [marketplaceSuppliers.id]
	}),
}));

export const userTableViewsRelations = relations(userTableViews, ({one}) => ({
	user: one(users, {
		fields: [userTableViews.userId],
		references: [users.id]
	}),
}));

export const constructionTaskSubtasksRelations = relations(constructionTaskSubtasks, ({one}) => ({
	constructionTask: one(constructionTasks, {
		fields: [constructionTaskSubtasks.taskId],
		references: [constructionTasks.id]
	}),
}));

export const constructionTasksRelations = relations(constructionTasks, ({one, many}) => ({
	constructionTaskSubtasks: many(constructionTaskSubtasks),
	constructionTaskAttachments: many(constructionTaskAttachments),
	constructionTaskChecklistItems: many(constructionTaskChecklistItems),
	constructionTaskActivities: many(constructionTaskActivity),
	constructionTaskPhotos: many(constructionTaskPhotos),
	constructionTaskDependencies_predecessorTaskId: many(constructionTaskDependencies, {
		relationName: "constructionTaskDependencies_predecessorTaskId_constructionTasks_id"
	}),
	constructionTaskDependencies_successorTaskId: many(constructionTaskDependencies, {
		relationName: "constructionTaskDependencies_successorTaskId_constructionTasks_id"
	}),
	constructionContractor: one(constructionContractors, {
		fields: [constructionTasks.contractorId],
		references: [constructionContractors.id]
	}),
	constructionTask: one(constructionTasks, {
		fields: [constructionTasks.parentTaskId],
		references: [constructionTasks.id],
		relationName: "constructionTasks_parentTaskId_constructionTasks_id"
	}),
	constructionTasks: many(constructionTasks, {
		relationName: "constructionTasks_parentTaskId_constructionTasks_id"
	}),
	constructionSalesContract: one(constructionSalesContracts, {
		fields: [constructionTasks.salesContractId],
		references: [constructionSalesContracts.id]
	}),
	supplyRequest: one(supplyRequests, {
		fields: [constructionTasks.supplyRequestId],
		references: [supplyRequests.id]
	}),
}));

export const constructionTaskAttachmentsRelations = relations(constructionTaskAttachments, ({one}) => ({
	constructionTask: one(constructionTasks, {
		fields: [constructionTaskAttachments.taskId],
		references: [constructionTasks.id]
	}),
}));

export const constructionTaskChecklistItemsRelations = relations(constructionTaskChecklistItems, ({one}) => ({
	constructionTask: one(constructionTasks, {
		fields: [constructionTaskChecklistItems.taskId],
		references: [constructionTasks.id]
	}),
}));

export const constructionTaskActivityRelations = relations(constructionTaskActivity, ({one}) => ({
	constructionTask: one(constructionTasks, {
		fields: [constructionTaskActivity.taskId],
		references: [constructionTasks.id]
	}),
}));

export const constructionTaskPhotosRelations = relations(constructionTaskPhotos, ({one}) => ({
	constructionTask: one(constructionTasks, {
		fields: [constructionTaskPhotos.taskId],
		references: [constructionTasks.id]
	}),
}));

export const taskCommentsRelations = relations(taskComments, ({one, many}) => ({
	taskComment: one(taskComments, {
		fields: [taskComments.parentCommentId],
		references: [taskComments.id],
		relationName: "taskComments_parentCommentId_taskComments_id"
	}),
	taskComments: many(taskComments, {
		relationName: "taskComments_parentCommentId_taskComments_id"
	}),
}));

export const constructionTaskDependenciesRelations = relations(constructionTaskDependencies, ({one}) => ({
	constructionTask_predecessorTaskId: one(constructionTasks, {
		fields: [constructionTaskDependencies.predecessorTaskId],
		references: [constructionTasks.id],
		relationName: "constructionTaskDependencies_predecessorTaskId_constructionTasks_id"
	}),
	constructionTask_successorTaskId: one(constructionTasks, {
		fields: [constructionTaskDependencies.successorTaskId],
		references: [constructionTasks.id],
		relationName: "constructionTaskDependencies_successorTaskId_constructionTasks_id"
	}),
}));

export const constructionContractorsRelations = relations(constructionContractors, ({many}) => ({
	constructionTasks: many(constructionTasks),
}));

export const constructionSalesContractsRelations = relations(constructionSalesContracts, ({many}) => ({
	constructionTasks: many(constructionTasks),
}));

export const supplyRequestsRelations = relations(supplyRequests, ({many}) => ({
	constructionTasks: many(constructionTasks),
}));

export const barterMovementsRelations = relations(barterMovements, ({one}) => ({
	barterAsset: one(barterAssets, {
		fields: [barterMovements.assetId],
		references: [barterAssets.id]
	}),
}));

export const barterAssetsRelations = relations(barterAssets, ({many}) => ({
	barterMovements: many(barterMovements),
}));