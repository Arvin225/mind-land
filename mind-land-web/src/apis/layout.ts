import type { ToDoList } from "@/pages/ToDo/interfaces";
import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export function getToDoListsAPI() {
    return request.get<any, Response<ToDoList[]>>('/to-do/lists')
}

export function postToDoListAPI(name: string): Promise<Response<ToDoList>> {
    return request.post<any, Response<ToDoList>>('/to-do/lists', { name })
}

export function deleteToDoListAPI(id: number): Promise<Response> {
    return request.delete<any, Response>(`/to-do/lists/${id}`)
}

export function patchToDoListAPI(list: { id: number, name: string }): Promise<Response<ToDoList>> {
    return request.patch<any, Response<ToDoList>>('/to-do/lists', list)
}
