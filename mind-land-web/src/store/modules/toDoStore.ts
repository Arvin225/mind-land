import { getToDoListsAPI } from "@/apis/layout";
import { getToDoItemsAPI, patchToDoItemAPI } from "@/apis/toDo";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import type { ToDoList, ToDoItem } from "@/pages/ToDo/interfaces";

export interface ToDoState {
    toDoLists: ToDoList[]
    loadingToDoLists: boolean
    toDoItems: ToDoItem[]
    loadingToDoItems: boolean
}

const initialState: ToDoState = {
    toDoLists: [],
    loadingToDoLists: true,
    toDoItems: [],
    loadingToDoItems: true
}

const toDoStore = createSlice({
    name: 'toDo',
    initialState,
    reducers: {
        setToDoLists(state, action: PayloadAction<ToDoList[]>) {
            state.toDoLists = action.payload
        },
        setLoadingToDoLists(state, action: PayloadAction<boolean>) {
            state.loadingToDoLists = action.payload
        },

        setToDoItems(state, action: PayloadAction<ToDoItem[]>) {
            state.toDoItems = action.payload
        },
        setLoadingToDoItems(state, action: PayloadAction<boolean>) {
            state.loadingToDoItems = action.payload
        }
    }
})


const { setToDoLists, setLoadingToDoLists, setToDoItems, setLoadingToDoItems } = toDoStore.actions


const fetchGetToDoLists = () => {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getToDoListsAPI()
            if (res.code === 0 && res.result) {
                dispatch(setToDoLists(res.result))
            }
        } catch (error) {
            console.error('获取列表失败: ', error);
        } finally {
            dispatch(setLoadingToDoLists(false))
        }
    }
}

const fetchGetToDoItems = (list: 'all' | 'star' | 'done' | 'bin' | number) => {
    return async (dispatch: AppDispatch) => {
        try {
            let res
            switch (list) {
                case 'all':
                    res = await getToDoItemsAPI({ done: false })
                    break;
                case 'star':
                    res = await getToDoItemsAPI({ star: true, done: false })
                    break;
                case 'done':
                    res = await getToDoItemsAPI({ done: true })
                    break;
                case 'bin':
                    res = await getToDoItemsAPI({ del: true })
                    break;
                default:
                    res = await getToDoItemsAPI({ listId: list, done: false })
                    break;
            }
            if (res.code === 0 && res.result) {
                dispatch(setToDoItems(res.result))
            }
        } catch (error) {
            console.error('获取当前列表待办项失败: ', error);
        } finally {
            dispatch(setLoadingToDoItems(false))
        }
    }
}


export { setToDoLists, fetchGetToDoLists, setLoadingToDoLists, setToDoItems, fetchGetToDoItems, setLoadingToDoItems }

export const reorderToDoItems = (items: ToDoItem[]) => {
    return async (dispatch: AppDispatch) => {
        dispatch(setToDoItems(items))
        await Promise.all(items.map(item =>
            patchToDoItemAPI({ id: item.id, sortOrder: item.sortOrder })
        ))
    }
}

export default toDoStore.reducer
