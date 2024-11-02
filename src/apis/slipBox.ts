import { Card, Tag } from "@/pages/SlipBox/interfaces";
import request from "@/utils/request";
import { Response } from "./interfaces/Response";

// 获取卡片们
export function getCardsAPI(getBy: { del: boolean } | { tagId: number }) {
    /* let tid
    tagId && (tid = '<p>'.concat(tagId.concat('<p>')))
    return request.get('/cards', { params: { tags_like: tid } }) */
    return request.get<any, Response>('slip-box/cards', { params: getBy })
}

// 获取卡片
export function getCardAPI(id: number) {
    return request.get<any, Response>(`slip-box/cards/${id}`)
}

// 获取标签们
export function getTagsAPI() {
    return request.get<any, Response>('slip-box/tags')
}

// 获取标签
export function getTagAPI(id: number) {
    return request.get<any, Response>(`slip-box/tags/${id}`)
}

// 新增卡片
export function postCardAPI(card: { content: string, builtOrDelTime: string, statistics: { builtTime: string, updateTime: string, words: number }, tags: number[], del: boolean }) { // 由于json-server不支持数组元素的精确匹配，暂时将tags处理成字符串
    // const tags = card.tags.length ? '<p>'.concat((card.tags.join('<p>')).concat('<p>')) : []
    return request.post<any, Response>('slip-box/cards', card)
}

// 新增标签
export function postTagAPI(tag: { tagName: string, parent?: number, children: number[], cardCount?: number, cards?: number[] }) {
    return request.post<any, Response>('slip-box/tags', tag)
}

// 获取标签 by标签名 // todo 暂时
export function getTagByTagNameAPI(tagName: string) {
    return request.get<any, Response>('slip-box/tags', { params: { tagName } })
}

// 修改标签
export function patchTagAPI(tag: { id: number, tagName?: string, parent?: number, children?: number[], cardCount?: number, cards?: number[] }) {
    return request.patch<any, Response>('slip-box/tags', tag)
}

// 修改卡片
export function patchCardAPI(card: { id: number, content?: string, builtOrDelTime?: string, statistics?: { builtTime: string, updateTime: string, words: number }, tags?: number[], del?: boolean }) {
    return request.patch<any, Response>('slip-box/cards', card)
}

interface deleteTagDto {
    id: number,
    tagName: string,
    overCards?: boolean
}
// 删除标签
export function deleteTagAPI(dto: deleteTagDto): Promise<Response> {
    return request.delete<any, Response>('slip-box/tags', { data: { overCard: false, ...dto } })
}

// 新建卡片
export async function createCardAPI(content: { contentWithText: string, contentWithHtml: string }): Promise<Response<{ card: Card; tags: Tag[]; }>> {

    return await request.post<any, Response>('slip-box/cards', content)
}

interface deleteCardDto {
    id: number,
    tagIds: number[],
    permanent?: boolean
}
// 删除卡片
export async function deleteCardAPI(dto: deleteCardDto): Promise<Response<{ deletedTagIds: number[] }>> {
    return await request.delete<any, Response>('slip-box/cards', { data: { permanent: false, ...dto } })
}