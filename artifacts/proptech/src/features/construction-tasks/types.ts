export interface ConstructionTaskRow {
	id: number;
	projectId: number;
	stageId?: number | null;
	title: string;
	description?: string | null;
	status: string;
	priority: string;
	assignedTo?: number | null;
	createdBy?: number | null;
	contractorId?: number | null;
	salesContractId?: number | null;
	supplyRequestId?: number | null;
	dueDate?: string | null;
	estimatedHours?: string | null;
	actualHours?: string | null;
	progressPercent?: number | null;
	progressMode?: string | null;
	plannedStartDate?: string | null;
	plannedEndDate?: string | null;
	actualStartDate?: string | null;
	actualEndDate?: string | null;
	createdAt?: string;
}

export interface TaskSubtask {
	id: number;
	taskId: number;
	title: string;
	status: string;
	assignedTo?: number | null;
	dueDate?: string | null;
	progressPercent: number;
	sortOrder: number;
}

export interface TaskChecklistItem {
	id: number;
	taskId: number;
	title: string;
	isDone: boolean;
	sortOrder: number;
}

export interface TaskActivity {
	id: number;
	taskId: number;
	userId: number;
	action: string;
	fieldName?: string | null;
	oldValue?: string | null;
	newValue?: string | null;
	meta?: string | null;
	createdAt: string;
}

export interface TaskComment {
	id: number;
	taskId: number;
	userId: number;
	content: string;
	commentType: string;
	parentCommentId?: number | null;
	mentions?: string | null;
	attachmentIds?: string | null;
	createdAt: string;
}

export type TaskPhotoType = "before" | "progress" | "after";

export interface TaskPhoto {
	id: number;
	taskId: number;
	photoType: TaskPhotoType;
	photoUrl: string;
	thumbnailUrl?: string | null;
	caption?: string | null;
	takenAt?: string | null;
	uploadedBy?: number | null;
	createdAt?: string;
}

export interface TaskAttachment {
	id: number;
	taskId: number;
	docType: string;
	fileUrl: string;
	fileName: string;
	mimeType?: string | null;
	fileSize?: number | null;
	uploadedBy?: number | null;
	createdAt?: string;
}

export interface ConstructionStageRow {
	id: number;
	projectId: number;
	name: string;
	parentStageId?: number | null;
}

export interface TaskFullResponse {
	task: ConstructionTaskRow;
	subtasks: TaskSubtask[];
	checklist: TaskChecklistItem[];
	activity: TaskActivity[];
	comments: TaskComment[];
	stage: ConstructionStageRow | null;
	parentStage: ConstructionStageRow | null;
	counts: {
		subtasks: number;
		checklistDone: number;
		checklistTotal: number;
		comments: number;
	};
}
