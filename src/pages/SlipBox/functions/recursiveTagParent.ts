import { getTagAPI, patchTagAPI } from "@/apis/slipBox"
import { Tag } from "../interfaces"

const recursiveTagParent = async (tagId: string, task: (tag: Tag) => void) => {
    // 递归终止条件
    if (!tagId) return

    const res = await getTagAPI(tagId)
    const tag = res.data
    const pid = tag.parent

    // 业务
    task(tag)

    // 递归
    await recursiveTagParent(pid, task)

}

export default recursiveTagParent