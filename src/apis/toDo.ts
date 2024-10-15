import request from "@/utils/request";

interface GetToDoListBy {
    listId?: string,
    star?: boolean,
    done?: boolean,
    del?: boolean
}
// 获取toDo列表
export function getToDoListAPI(params: GetToDoListBy) {
    return request.get('/toDoList', { params: { del: false, ...params } })
}

interface PostToDoItem {
    content: string,
    done?: boolean,
    star?: boolean,
    del?: boolean,
    listId: string,
    listName: string
}
// 新增toDo项
export function postToDoItemAPI(toDoItem: PostToDoItem) {
    return request.post('/toDoList', { done: false, star: false, del: false, ...toDoItem })
}

// 永久删除toDo项
export function deleteToDoItemAPI(id: string) {
    return request.patch(`/toDoList/${id}`)
}

interface PatchToDoItem {
    id: string,
    content?: string,
    done?: boolean,
    star?: boolean,
    del?: boolean,
    listId?: string,
    listName?: string
}
// 修改toDo项（删除、编辑内容、修改状态、修改分组）
export function patchToDoItemAPI(toDoItem: PatchToDoItem) {
    return request.patch(`/toDoList/${toDoItem.id}`, toDoItem)
}

// todo 后端实现通过列表id删除toDo项
export function patchToDoItemByListIdAPI(listId: string) {
    return request.patch(`/toDoList/${listId}`, { del: true })
}

// 获取toDo项
export function getToDoItemAPI(id: string) {
    return request.get(`/toDoList/${id}`)
}

