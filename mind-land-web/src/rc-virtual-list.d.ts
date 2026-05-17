declare module 'rc-virtual-list' {
    import React from 'react'

    interface ListProps<T> {
        data: T[]
        itemKey: string | ((item: T) => string | number)
        itemHeight: number
        height: number
        children: (item: T, index: number, props: Record<string, unknown>) => React.ReactNode
        style?: React.CSSProperties
        className?: string
    }

    export default function List<T>(props: ListProps<T>): React.ReactElement
}
