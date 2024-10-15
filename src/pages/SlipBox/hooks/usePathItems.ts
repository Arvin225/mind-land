import { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import _ from "lodash";
import { useState } from "react";

function usePathItems() {
    const allCardPathItem: ItemType = { title: '全部卡片', href: '', onClick: e => e.preventDefault() }

    const [pathItems, setPathItems] = useState<ItemType[]>([allCardPathItem])
    const buildPathItems = (tagId: string, tagName?: string) => {
        if (!tagName) { // 如果传过来的是空值则为全部卡片，路径为初始状态
            setPathItems([allCardPathItem])
            return
        }
        const splitNames = tagName.split('/')
        const pathItems = [allCardPathItem]
        if (splitNames.length > 1) {
            if (splitNames.length > 2) {
                // 标签超过二级，父级标签显示为...，//todo 且点击时查询的是根标签，携带标签名，处理点击时转化为id？
                pathItems.push({ title: '...', href: '', onClick: e => e.preventDefault() })
            } else {
                // 否则显示标签名 //todo 点击查询，携带标签名，处理点击时转化为id？
                pathItems.push({ title: splitNames[0], href: '', onClick: e => e.preventDefault() })
                // pathItems.push(...((splitNames.slice(1, splitNames.length - 1)).map(name => ({ title: <a href="">{name}</a> }))))
            }

            // 当前标签名 //todo 点击查询
            pathItems.push({ title: _.last(splitNames), href: tagId, onClick: e => e.preventDefault() })
        } else {
            // 当前标签名 //todo 点击查询
            pathItems.push({ title: tagName, href: tagId, onClick: e => e.preventDefault() })
        }
        setPathItems(pathItems)
    }
    return { pathItems, buildPathItems }
}
export default usePathItems

