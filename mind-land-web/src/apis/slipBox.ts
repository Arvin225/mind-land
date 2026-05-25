import { Card, Tag } from "@/pages/SlipBox/interfaces";
import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export function getCardsAPI(getBy: { del?: boolean; tagId?: number; sort?: string; order?: string }) {
    return request.get<any, Response<Card[]>>('slip-box/cards', { params: getBy })
}

export function getCardAPI(id: number) {
    return request.get<any, Response<Card>>(`slip-box/cards/${id}`)
}

export function getTagsAPI() {
    return request.get<any, Response<Tag[]>>('slip-box/tags')
}

export function getTagAPI(id: number) {
    return request.get<any, Response<Tag>>(`slip-box/tags/${id}`)
}

export function postCardAPI(card: { content: string, builtOrDelTime: string, statistics: { builtTime: string, updateTime: string, words: number }, tags: number[], del: boolean }) {
    return request.post<any, Response<Card>>('slip-box/cards', card)
}

export function postTagAPI(tag: { tagName: string, parent?: number, children: number[], cardCount?: number, cards?: number[] }) {
    return request.post<any, Response<Tag>>('slip-box/tags', tag)
}

export function getTagByTagNameAPI(tagName: string) {
    return request.get<any, Response<Tag[]>>('slip-box/tags', { params: { tagName } })
}

export function patchTagAPI(tag: { id: number, tagName?: string, parent?: number, children?: number[], cardCount?: number, cards?: number[] }) {
    return request.patch<any, Response<Tag>>('slip-box/tags', tag)
}

export function patchCardAPI(card: { id: number, content: string }) {
    return request.put<any, Response<{ card: Card }>>(`slip-box/cards/${card.id}`, card)
}

interface deleteTagDto {
    id: number,
    tagName: string,
    overCards?: boolean
}

export function deleteTagAPI(dto: deleteTagDto): Promise<Response> {
    return request.delete<any, Response>('slip-box/tags', { data: { overCard: false, ...dto } })
}

export async function createCardAPI(content: { contentWithText: string, contentWithHtml: string }): Promise<Response<{ card: Card; tags: Tag[] }>> {
    return await request.post<any, Response<{ card: Card; tags: Tag[] }>>('slip-box/cards', content)
}

interface deleteCardDto {
    id: number,
    tagIds: number[],
    permanent?: boolean
}

export async function deleteCardAPI(dto: deleteCardDto): Promise<Response<{ deletedTagIds: number[] }>> {
    return await request.delete<any, Response<{ deletedTagIds: number[] }>>('slip-box/cards', { data: { permanent: false, ...dto } })
}
