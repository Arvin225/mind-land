import _ from "lodash";
import { useState } from "react";

export interface PathItem {
    title: string
    href?: string
    onClick?: () => void
}

function usePathItems() {
    const allCardPathItem: PathItem = { title: '全部卡片', href: undefined, onClick: () => {} }

    const [pathItems, setPathItems] = useState<PathItem[]>([allCardPathItem])
    const buildPathItems = (tagId: number | null, tagName?: string) => {
        if (!tagName) {
            setPathItems([allCardPathItem])
            return
        }
        const splitNames = tagName.split('/')
        const newPathItems: PathItem[] = [allCardPathItem]
        if (splitNames.length > 1) {
            if (splitNames.length > 2) {
                newPathItems.push({ title: '...', href: undefined, onClick: () => {} })
            } else {
                newPathItems.push({ title: splitNames[0], href: undefined, onClick: () => {} })
            }
            const last = _.last(splitNames)
            if (last) {
                newPathItems.push({ title: last, href: tagId + '', onClick: () => {} })
            }
        } else {
            newPathItems.push({ title: tagName, href: tagId + '', onClick: () => {} })
        }
        setPathItems(newPathItems)
    }
    return { pathItems, buildPathItems }
}

export default usePathItems

