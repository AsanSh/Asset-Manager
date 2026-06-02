import { api } from "@/lib/api";
import type { TaskAttachment, TaskFullResponse, TaskPhoto } from "./types";

export const taskKeys = {
	all: ["construction-tasks"] as const,
	full: (id: number) => ["construction-task-full", id] as const,
	activity: (id: number) => ["construction-task-activity", id] as const,
	comments: (id: number) => ["task-comments", id] as const,
	photos: (id: number) => ["task-photos", id] as const,
	attachments: (id: number) => ["task-attachments", id] as const,
	stages: (projectId: number) => ["construction-stages", projectId] as const,
};

export async function fetchTaskFull(taskId: number): Promise<TaskFullResponse> {
	const { data } = await api.get(`/construction/tasks/${taskId}/full`);
	return data;
}

export async function fetchTaskPhotos(taskId: number): Promise<TaskPhoto[]> {
	const { data } = await api.get(`/construction/tasks/${taskId}/photos`);
	return data;
}

export async function fetchTaskAttachments(
	taskId: number,
): Promise<TaskAttachment[]> {
	const { data } = await api.get(`/construction/tasks/${taskId}/attachments`);
	return data;
}
