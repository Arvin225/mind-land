import { getCardsAPI, getTagsAPI } from "@/apis/slipBox";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import type { Card, Tag } from "@/pages/SlipBox/interfaces";

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

const { setCards, setLoadingCards, setTags, setLoadingTags } = slipBoxStore.actions

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

export { setCards, fetchGetCards, setLoadingCards, setTags, fetchGetTags, setLoadingTags }

export default slipBoxStore.reducer
