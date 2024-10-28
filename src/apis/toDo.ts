import request from "@/utils/request";
import { Response } from "./interfaces/Response";

interface GetToDoItemsBy {
    listId?: number,
    star?: boolean,
    done?: boolean,
    del?: boolean
}
// 获取toDo列表
export function getToDoItemsAPI(getBy: GetToDoItemsBy) {
    return request.get('/to-do/items', { data: { del: false, ...getBy } })
}

interface PostToDoItem {
    content: string,
    done?: boolean,
    star?: boolean,
    del?: boolean,
    listId?: string,
    listName?: string
}
// 新增toDo项
export function postToDoItemAPI(toDoItem: PostToDoItem): Promise<Response> {
    return request.post('/to-do/items', { done: false, star: false, del: false, ...toDoItem })
}

// 删除toDo项
export function deleteToDoItemAPI(deleteItemDto: { id: number, permanent?: boolean }): Promise<Response> {
    return request.delete('/to-do/items', { data: deleteItemDto })
}

interface PatchToDoItem {
    id: number,
    content?: string,
    done?: boolean,
    star?: boolean,
    del?: boolean,
    listId?: number,
    listName?: string
}
// 修改toDo项（删除、编辑内容、修改状态、修改分组）
export function patchToDoItemAPI(toDoItem: PatchToDoItem): Promise<Response> {
    return request.patch(`/to-do/items/${toDoItem.id}`, toDoItem)
}
/* 
// todo 后端实现通过列表id删除toDo项
export function patchToDoItemByListIdAPI(listId: string) {
    return request.patch(`/to-do/items/${listId}`, { del: true })
} */

// 获取toDo项
export function getToDoItemAPI(id: number) {
    return request.get(`/to-do/items/${id}`)
}

