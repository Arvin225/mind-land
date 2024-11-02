import { getCardsAPI, getTagsAPI } from "@/apis/slipBox";
import { createSlice, Dispatch, PayloadAction, UnknownAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { AppDispatch } from "..";

interface Card {
    id: number,
    content: string,
    builtOrDelTime: string,
    statistics: { builtTime: string, updateTime: string, words: number },
    tags: number[],
    del: boolean
}
interface Tag {
    id: number,
    tagName: string,
    parent: number,
    children: number[],
    cardCount: number,
    cards: number[]
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

// 异步获取cards
function fetchGetCards(getBy: { del: boolean } | { tagId: number }) {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getCardsAPI(getBy)
            dispatch(setCards(res.result))
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
            dispatch(setTags(res.result))
            dispatch(setLoadingTags(false))
        } catch (error) {
            toast.error('获取标签失败，请稍后重试')
            console.error('Error: ', error);
        }
    }
}

// 导出actionCreater
export { setCards, fetchGetCards, setLoadingCards, setTags, fetchGetTags, setLoadingTags }

// 默认导出reducer
export default slipBoxStore.reducer