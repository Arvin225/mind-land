import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export interface DiaryEntry {
    id: number
    content: string
    createdAt: string
    updatedAt: string
    del: boolean
}

export interface PaginatedEntries {
    entries: DiaryEntry[]
    total: number
    page: number
    size: number
}

export function getEntriesAPI(page = 1, size = 20) {
    return request.get<any, Response<PaginatedEntries>>('diary/entries', { params: { page, size } })
}

export function getEntryAPI(id: number) {
    return request.get<any, Response<DiaryEntry>>(`diary/entries/${id}`)
}

export function createEntryAPI(content: string) {
    return request.post<any, Response<DiaryEntry>>('diary/entries', { content })
}

export function updateEntryAPI(id: number, content: string) {
    return request.put<any, Response<DiaryEntry>>(`diary/entries/${id}`, { content })
}

export function deleteEntryAPI(id: number) {
    return request.delete<any, Response<null>>(`diary/entries/${id}`)
}
