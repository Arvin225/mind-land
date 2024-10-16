export interface ToDoListName {
    id: string,
    listName: string
}
export interface ToDoItem {
    id: string,
    content: string,
    done: boolean,
    star: boolean,
    del: boolean,
    listId: string,
    listName: string
}