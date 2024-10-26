import { getTagAPI } from "@/apis/slipBox"
import { Tag } from "../interfaces"

const recursiveTagChildren = async (tagId: number, task: (tag: Tag) => void) => {
    // 递归终止条件
    if (!tagId) return

    const res = await getTagAPI(tagId)
    const tag = res.data
    const children = tag.children

    for (let i = 0; i < children.length; i++) {
        const cid = children[i];
        // 递归
        await recursiveTagChildren(cid, task)
    }

    // 业务
    task(tag)
}

export default recursiveTagChildren