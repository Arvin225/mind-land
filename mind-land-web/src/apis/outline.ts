import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export interface OutlineFolder {
    id: number;
    name: string;
    parentId: number;
    sortOrder: number;
    isExpanded: boolean;
    del: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OutlineDocument {
    id: number;
    title: string;
    folderId: number;
    sortOrder: number;
    isFavorite: boolean;
    del: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OutlineNode {
    id: number;
    documentId: number;
    content: string;
    parentId: number;
    sortOrder: number;
    isCollapsed: boolean;
    note: string;
    del: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OutlineDocumentVersion {
    id: number;
    documentId: number;
    snapshot: string;
    nodeCount: number;
    source: string;
    summary: string;
    createdAt: string;
}

// ── Folders ──

export function getFolders(trash?: boolean) {
    return request.get<any, Response<OutlineFolder[]>>('outline/folders', { params: { trash } })
}

export function createFolder(data: { name: string; parentId?: number }) {
    return request.post<any, Response<OutlineFolder>>('outline/folders', data)
}

export function updateFolder(id: number, data: Partial<OutlineFolder>) {
    return request.put<any, Response<OutlineFolder>>(`outline/folders/${id}`, data)
}

export function deleteFolder(id: number) {
    return request.delete<any, Response<null>>(`outline/folders/${id}`)
}

// ── Documents ──

export function getDocuments(params: { folderId?: number; favorite?: boolean; recent?: boolean; trash?: boolean; page?: number; size?: number } = {}) {
    return request.get<any, Response<{ items: OutlineDocument[]; total: number }>>('outline/documents', { params })
}

export function getDocument(id: number, withNodes?: boolean) {
    return request.get<any, Response<OutlineDocument | { document: OutlineDocument; nodes: OutlineNode[] }>>(`outline/documents/${id}`, { params: { withNodes } })
}

export function createDocument(data: { title?: string; folderId?: number } = {}) {
    return request.post<any, Response<OutlineDocument>>('outline/documents', data)
}

export function updateDocument(id: number, data: Partial<OutlineDocument>) {
    return request.put<any, Response<OutlineDocument>>(`outline/documents/${id}`, data)
}

export function deleteDocument(id: number) {
    return request.delete<any, Response<null>>(`outline/documents/${id}`)
}

export function duplicateDocument(id: number) {
    return request.post<any, Response<OutlineDocument>>(`outline/documents/${id}/duplicate`)
}

export function moveDocument(id: number, folderId: number) {
    return request.patch<any, Response<null>>(`outline/documents/${id}/move`, { folderId })
}

// ── Nodes ──

export function saveNodes(docId: number, nodes: OutlineNode[]) {
    return request.put<any, Response<null>>(`outline/documents/${docId}/nodes`, { nodes })
}

export function reorderNodes(docId: number, orders: { id: number; sortOrder: number; parentId: number }[]) {
    return request.post<any, Response<null>>(`outline/documents/${docId}/nodes/reorder`, { orders })
}

// ── Trash ──

export function getTrashFolders() {
    return getFolders(true)
}

export function getTrashDocuments() {
    return getDocuments({ trash: true })
}

export function restoreDocument(id: number) {
    return request.patch<any, Response<null>>(`outline/documents/${id}/restore`)
}

export function restoreFolder(id: number) {
    return request.patch<any, Response<null>>(`outline/folders/${id}/restore`)
}

export function permanentDeleteDocument(id: number) {
    return request.delete<any, Response<null>>(`outline/documents/${id}/permanent`)
}

export function permanentDeleteFolder(id: number) {
    return request.delete<any, Response<null>>(`outline/folders/${id}/permanent`)
}

export function emptyTrash() {
    return request.delete<any, Response<null>>('outline/trash')
}

// ── Search ──

export function search(query: string, scope?: string, page?: number, size?: number) {
    return request.get<any, Response<{ items: OutlineNode[]; total: number }>>('outline/search', { params: { q: query, scope, page, size } })
}

// ── Versions ──

export function getVersions(docId: number) {
    return request.get<any, Response<OutlineDocumentVersion[]>>(`outline/documents/${docId}/versions`)
}

export function getVersion(versionId: number) {
    return request.get<any, Response<OutlineDocumentVersion>>(`outline/documents/0/versions/${versionId}`)
}

export function createVersion(docId: number) {
    return request.post<any, Response<OutlineDocumentVersion>>(`outline/documents/${docId}/versions`)
}

export function restoreVersion(versionId: number) {
    return request.post<any, Response<null>>(`outline/documents/0/versions/${versionId}/restore`)
}

export function deleteVersion(versionId: number) {
    return request.delete<any, Response<null>>(`outline/documents/0/versions/${versionId}`)
}
