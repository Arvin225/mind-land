import request from "@/utils/request";
import { Response } from "./interfaces/Response";

// 获取所有todo-list名称
export function getToDoListsAPI() {
    return request.get('/to-do/lists') //得到的是一个promise对象，后续可以进行then和catch
}

// 新增todo-list名称
export function postToDoListAPI(name: string): Promise<Response> {
    return request.post('/to-do/lists', { name })
}

// 删除todo-list名称
export function deleteToDoListAPI(id: number): Promise<Response> {
    return request.delete(`/to-do/lists/${id}`)
}

// 修改todo-list名称
export function patchToDoListAPI(list: { id: number, name: string }): Promise<Response> {
    return request.patch('/to-do/lists', list)
}

/* 
// 删除todo-list名称
export function deleteToDoListNameAPI(id) {
    return request.delete(`/toDoListNames/${id}`)
}

// 修改todo-list名称
export function patchToDoListNameAPI(id, listName) {
    return request.patch(`/toDoListNames${id}`, { listName } )
} 
*/