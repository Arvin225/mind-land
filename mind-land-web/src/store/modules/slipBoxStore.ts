import { getCardsAPI, getTagsAPI } from "@/apis/slipBox";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "..";
import type { Card, Tag } from "@/pages/SlipBox/interfaces";

export interface SlipBoxState {
    cards: Card[],
    loadingCards: boolean,
    tags: Tag[],
    loadingTags: boolean,
    sortBy: string,
    sortOrder: string
}

const initialState: SlipBoxState = {
    cards: [],
    loadingCards: true,
    tags: [],
    loadingTags: true,
    sortBy: 'createdAt',
    sortOrder: 'asc'
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
        },
        setSortBy(state, action: PayloadAction<string>) {
            state.sortBy = action.payload
        },
        setSortOrder(state, action: PayloadAction<string>) {
            state.sortOrder = action.payload
        }
    }
})

const { setCards, setLoadingCards, setTags, setLoadingTags, setSortBy, setSortOrder } = slipBoxStore.actions

function fetchGetCards(getBy: { del?: boolean; tagId?: number } = {}) {
    return async (dispatch: AppDispatch, getState: () => RootState) => {
        try {
            const { sortBy, sortOrder } = getState().slipBox
            const res = await getCardsAPI({ ...getBy, sort: sortBy, order: sortOrder })
            if (res.code === 0 && res.result) {
                const normalizedCards = (res.result as Card[]).map(c => ({
                    ...c,
                    statistics: typeof c.statistics === "string" ? JSON.parse(c.statistics) : c.statistics,
                    tags: typeof c.tags === "string" ? JSON.parse(c.tags) : c.tags
                }))
                dispatch(setCards(normalizedCards))
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

export { setCards, fetchGetCards, setLoadingCards, setTags, fetchGetTags, setLoadingTags, setSortBy, setSortOrder }

export default slipBoxStore.reducer
