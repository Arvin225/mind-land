export interface Card {
    id: string
    content: string
    builtOrDelTime: string
    statistics: { builtTime: string, updateTime: string, words: number }
    tags: string[]
    del: boolean
}