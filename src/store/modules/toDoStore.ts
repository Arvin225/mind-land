import { getToDoListNamesAPI } from "@/apis/layout";
import { getToDoListAPI } from "@/apis/toDo";

import { createSlice, Dispatch, PayloadAction, UnknownAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { AppDispatch } from "..";

interface ToDoListName {
    id: string,
    listName: string
}
interface ToDoItem {
    id: string,
    content: string,
    done: boolean,
    star: boolean,
    del: boolean,
    listId: string,
    listName: string
}

interface ToDoState {
    toDoListNames: ToDoListName[]
    loadingToDoListNames: boolean
    toDoList: ToDoItem[]
    loadingToDoList: boolean
}

const initialState: ToDoState = {
    toDoListNames: [],
    loadingToDoListNames: true,
    toDoList: [],
    loadingToDoList: true
}

const toDoStore = createSlice({
    name: 'toDo',
    // 初始化数据
    initialState,
    // 配置修改方法（同步）
    reducers: {
        setToDoListNames(state, action: PayloadAction<ToDoListName[]>) {
            state.toDoListNames = action.payload
        },
        setLoadingToDoListNames(state, action: PayloadAction<boolean>) {
            state.loadingToDoListNames = action.payload
        },

        setToDoList(state, action: PayloadAction<ToDoItem[]>) {
            state.toDoList = action.payload
        },
        setLoadingToDoList(state, action: PayloadAction<boolean>) {
            state.loadingToDoList = action.payload
        }
    }
})


/* ------------------------------------------------解构出actionCreater------------------------------------------------ */
const { setToDoListNames, setLoadingToDoListNames, setToDoList, setLoadingToDoList } = toDoStore.actions


/* ------------------------------------------------异步方法------------------------------------------------ */
// 获取自定义列表名
const fetchToDoListNames = () => {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getToDoListNamesAPI()
            dispatch(setToDoListNames(res.data))
            dispatch(setLoadingToDoListNames(false))
        } catch (error) {
            toast.error('获取列表失败，请稍后重试')
            console.error('Error: ', error);
        }
    }
}

// 获取todo列表
const fetchGetToDoList = (list: string) => {
    return async (dispatch: AppDispatch) => {
        let res
        try {
            switch (list) {
                case 'all':
                    res = await getToDoListAPI({ done: false })
                    break;
                case 'star':
                    res = await getToDoListAPI({ star: true, done: false })
                    break;
                case 'done':
                    res = await getToDoListAPI({ done: true })
                    break;
                case 'bin':
                    res = await getToDoListAPI({ del: true })
                    break;
                default:
                    res = await getToDoListAPI({ listId: list, done: false })
                    break;
            }
            dispatch(setToDoList(res.data))
            dispatch(setLoadingToDoList(false))
        } catch (error) {
            toast.error('获取当前列表待办项失败，请稍后重试')
            console.error('Error: ', error);
        }
    }
}


/* ------------------------------------------------导出------------------------------------------------ */
// 按需导出actionCreater
export { setToDoListNames, fetchToDoListNames, setLoadingToDoListNames, setToDoList, fetchGetToDoList, setLoadingToDoList }

// 默认导出reducer
export default toDoStore.reducer