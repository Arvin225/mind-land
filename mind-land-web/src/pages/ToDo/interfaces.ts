export interface ToDoList {
    id: number,
    name: string
}
export interface ToDoItem {
    id: number,
    content: string,
    done: boolean,
    star: boolean,
    del: boolean,
    listId: number,
    listName: string
}