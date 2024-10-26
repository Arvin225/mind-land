export interface Card {
    id: number
    content: string
    builtOrDelTime: string
    statistics: { builtTime: string, updateTime: string, words: number }
    tags: number[]
    del: boolean
}

export interface Tag {
    id: number
    tagName: string
    parent: number
    children: number[]
    cardCount: number
    cards: number[]
}