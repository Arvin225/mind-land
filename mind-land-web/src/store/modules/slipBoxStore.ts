import { getCardsAPI, getTagsAPI } from "@/apis/slipBox";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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

export interface SlipBoxState {
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
            if (res.code === 0 && res.result) {
                dispatch(setCards(res.result))
            }
        } catch (error) {
            console.error('获取卡片失败: ', error);
        } finally {
            dispatch(setLoadingCards(false))
        }
    }
}

// 异步获取tags
function fetchGetTags() {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await getTagsAPI()
            if (res.code === 0 && res.result) {
                const normalizedTags = res.result.map((tag: Tag) => ({
                    ...tag,
                    children: Array.isArray(tag.children) ? tag.children : []
                }))
                dispatch(setTags(normalizedTags))
            }
        } catch (error) {
            console.error('获取标签失败: ', error);
        } finally {
            dispatch(setLoadingTags(false))
        }
    }
}

// 导出actionCreater
export { setCards, fetchGetCards, setLoadingCards, setTags, fetchGetTags, setLoadingTags }

// 默认导出reducer
export default slipBoxStore.reducer