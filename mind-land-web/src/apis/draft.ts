import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export interface Draft {
    id: number;
    title: string;
    contentMd: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface DraftListItem {
    id: number;
    title: string;
    preview: string;
    updatedAt: string;
}

export interface DraftConflict {
    error: string;
    currentVersion: number;
    serverContentMd: string;
}

export interface UpdateDraftReq {
    contentMd: string;
    baseVersion: number;
}

// ── Drafts ──

export function listDrafts() {
    return request.get<any, Response<DraftListItem[]>>("drafts");
}

export function getDraft(id: number) {
    return request.get<any, Response<Draft>>(`drafts/${id}`);
}

export function createDraft(data: { contentMd?: string } = {}) {
    return request.post<any, Response<Draft>>("drafts", data);
}

export function updateDraft(id: number, data: UpdateDraftReq) {
    // 成功：返回 Response<Draft>；409 冲突时 axios 会抛错，error.response.data.result 为 DraftConflict
    return request.put<any, Response<Draft>>(`drafts/${id}`, data);
}

export function deleteDraft(id: number) {
    return request.delete<any, Response<null>>(`drafts/${id}`);
}

export function restoreDraft(id: number) {
    return request.patch<any, Response<null>>(`drafts/${id}/restore`);
}

export function permanentDeleteDraft(id: number) {
    return request.delete<any, Response<null>>(`drafts/${id}/permanent`);
}

export function emptyDraftTrash() {
    return request.delete<any, Response<null>>("drafts/trash");
}
