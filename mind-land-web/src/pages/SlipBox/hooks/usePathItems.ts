import _ from "lodash";
import { useState } from "react";
import { Tag } from "../interfaces";

export interface PathItem {
    title: string
    onClick?: () => void
}

function usePathItems(tags: Tag[], onSelectTag: (tagId: number) => void) {
    const [pathItems, setPathItems] = useState<PathItem[]>([{ title: '全部卡片' }])

    const buildPathItems = (tagId: number | null, tagName?: string) => {
        const newPathItems: PathItem[] = [{
            title: '全部卡片',
            onClick: () => onSelectTag(0)
        }]

        if (!tagId || !tagName) {
            setPathItems(newPathItems)
            return
        }

        const splitNames = tagName.split('/')

        if (splitNames.length > 1) {
            if (splitNames.length > 2) {
                const parentTagName = splitNames.slice(0, splitNames.length - 1).join('/')
                const parentTag = tags.find(t => t.tagName === parentTagName)
                newPathItems.push({
                    title: '...',
                    onClick: parentTag ? () => onSelectTag(parentTag.id) : undefined
                })
            } else {
                const parentTag = tags.find(t => t.tagName === splitNames[0])
                newPathItems.push({
                    title: splitNames[0],
                    onClick: parentTag ? () => onSelectTag(parentTag.id) : undefined
                })
            }
            const last = _.last(splitNames)
            if (last) {
                newPathItems.push({ title: last })
            }
        } else {
            newPathItems.push({ title: tagName })
        }

        setPathItems(newPathItems)
    }

    return { pathItems, buildPathItems }
}

export default usePathItems
