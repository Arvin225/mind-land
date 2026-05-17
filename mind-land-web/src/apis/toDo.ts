import type { ToDoItem } from "@/pages/ToDo/interfaces";
import request from "@/utils/request";
import { Response } from "./interfaces/Response";

interface GetToDoItemsBy {
    listId?: number,
    star?: boolean,
    done?: boolean,
    del?: boolean
}

export function getToDoItemsAPI(getBy: GetToDoItemsBy) {
    return request.get<any, Response<ToDoItem[]>>('/to-do/items', { params: { del: false, ...getBy } })
}

interface PostToDoItem {
    content: string,
    done?: boolean,
    star?: boolean,
    del?: boolean,
    listId?: string,
    listName?: string
}

export function postToDoItemAPI(toDoItem: PostToDoItem): Promise<Response<ToDoItem>> {
    return request.post<any, Response<ToDoItem>>('/to-do/items', { done: false, star: false, del: false, ...toDoItem })
}

export function deleteToDoItemAPI(deleteItemDto: { id: number, permanent?: boolean }): Promise<Response> {
    return request.delete<any, Response>('/to-do/items', { data: deleteItemDto })
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

export function patchToDoItemAPI(toDoItem: PatchToDoItem): Promise<Response<ToDoItem>> {
    return request.patch<any, Response<ToDoItem>>('/to-do/items', toDoItem)
}

export function getToDoItemAPI(id: number) {
    return request.get<any, Response<ToDoItem>>(`/to-do/items/${id}`)
}
