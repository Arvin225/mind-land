export interface Card {
    id: string
    content: string
    builtOrDelTime: string
    statistics: { builtTime: string, updateTime: string, words: number }
    tags: string[]
    del: boolean
}

export interface Tag {
    id: string
    tagName: string
    parent: string
    children: string[]
    cardCount: number
    cards: string[]
}