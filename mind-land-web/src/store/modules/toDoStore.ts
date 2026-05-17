import { getToDoListsAPI } from "@/apis/layout";
import { getToDoItemsAPI } from "@/apis/toDo";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";

interface ToDoList {
    id: number,
    name: string
}
interface ToDoItem {
    id: number,
    content: string,
    done: boolean,
    star: boolean,
    del: boolean,
    listId: number,
    listName: string
}

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
    // 初始化数据
    initialState,
    // 配置修改方法（同步）
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


/* ------------------------------------------------解构出actionCreater------------------------------------------------ */
const { setToDoLists, setLoadingToDoLists, setToDoItems, setLoadingToDoItems } = toDoStore.actions


/* ------------------------------------------------异步方法------------------------------------------------ */
// 获取自定义列表名
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

// 获取todo列表
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


/* ------------------------------------------------导出------------------------------------------------ */
// 按需导出actionCreater
export { setToDoLists, fetchGetToDoLists, setLoadingToDoLists, setToDoItems, fetchGetToDoItems, setLoadingToDoItems }

// 默认导出reducer
export default toDoStore.reducer