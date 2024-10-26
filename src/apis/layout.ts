import request from "@/utils/request";

// 获取所有todo-list名称
export function getToDoListNamesAPI() {
    return request.get('http://localhost:3300/toDoListNames') //得到的是一个promise对象，后续可以进行then和catch
}

// 新增todo-list名称
export function postToDoListNameAPI(listName: string) {
    return request.post('/toDoListNames', { listName })
}

// 删除todo-list名称
export function deleteToDoListNameAPI(id: string) {
    return request.delete(`/toDoListNames/${id}`)
}

// 修改todo-list名称
export function patchToDoListNameAPI(listName: { id: string, listName: string }) {
    return request.patch(`/toDoListNames/${listName.id}`, listName)
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