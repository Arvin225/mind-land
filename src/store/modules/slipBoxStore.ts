import { getAllCardsAPI, getTagsAPI } from "@/apis/slipBox";
import { createSlice, Dispatch, PayloadAction, UnknownAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { AppDispatch } from "..";

interface Card {
    id: string,
    content: string,
    builtOrDelTime: string,
    statistics: { builtTime: string, updateTime: string, words: number },
    tags: string[],
    del: boolean
}
interface Tag {
    id: string,
    tagName: string,
    parent: string,
    children: string[],
    cardCount: number,
    cards: string[]
}

interface SlipBoxState {
    cards: Card[],
    loadingCards: boolean,
    tags: Tag[],
    loadingTags: boolean
}

const initialState: SlipBoxState = {
    cards: [],
    loadingCards: true,
    tags: [],
    loadingTags: true
}

const slipBoxStore = createSlice({
    name: 'slipBox',
    initialState,
    reducers: {
        setCards(state, action: PayloadAction<Card[]>) {
            state.cards = action.payload
        },
        setLoadingCards(state, action: PayloadAction<boolean>) {
            state.loadingCards = action.payload
        },
        setTags(state, action: PayloadAction<Tag[]>) {
            state.tags = action.payload
        },
        setLoadingTags(state, action: PayloadAction<boolean>) {
            state.loadingTags = action.payload
        }
    }
})

// 解构出actionCreater
const { setCards, setLoadingCards, setTags, setLoadingTags } = slipBoxStore.actions

// 异步获取所有cards
function fetchGetAllCards(del: boolean) {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getAllCardsAPI(del)
            dispatch(setCards(res.data))
            dispatch(setLoadingCards(false))
        } catch (error) {
            toast.error('获取卡片失败，请稍后重试')
            console.error('Error: ', error);
        }
    }
}

// 异步获取tags
function fetchGetTags() {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getTagsAPI()
            dispatch(setTags(res.data))
            dispatch(setLoadingTags(false))
        } catch (error) {
            toast.error('获取标签失败，请稍后重试')
            console.error('Error: ', error);
        }
    }
}

// 导出actionCreater
export { setCards, fetchGetAllCards, setLoadingCards, setTags, fetchGetTags, setLoadingTags }

// 默认导出reducer
export default slipBoxStore.reducer