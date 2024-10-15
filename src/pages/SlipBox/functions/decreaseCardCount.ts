import { deleteTagAPI, getTagAPI, patchTagAPI } from "@/apis/slipBox"
import _ from "lodash"

let cid: string
const deletedTagIds: string[] = []
const decreasedTagIds: string[] = []
// 卡片计数-1的函数 
async function decrease(id: string, count: number, stopTag?: { id: string, children: string[] }) {
    // 递归终止条件：id为空或减过
    if (!id || decreasedTagIds.includes(id)) return

    const res = await getTagAPI(id)
    const tag = res.data
    const pid = tag.parent

    // 业务逻辑
    if (tag.cardCount === count) {
        // 卡片数量只有1则删除当前标签
        await deleteTagAPI(id)
        // 保存id
        cid = id
        // 收集删除的tag的id
        deletedTagIds.push(id)

        // 如果父标签是停止标签则将当前标签从其children属性中删除并结束递归
        if (stopTag && (pid === stopTag.id)) {
            await patchTagAPI({ id: pid, children: _.without(stopTag.children, id) })
            return
        }

    } else {
        // 走到这表示上一级标签是最后一个卡片数量为1的标签（或者卡片数量不止1），则本标签将cid从children属性中删除
        let children
        if (cid) {
            children = _.without(tag.children, cid)
            //cid置为空
            cid = ''
        }
        // 将计数-1
        await patchTagAPI({ id: tag.id, cardCount: tag.cardCount - count, children })
        // 收集计数减少过的tag
        decreasedTagIds.push(tag.id)
    }

    // 递归
    await decrease(pid, count, stopTag)
}

const decreaseCardCount = async (id: string, count = 1, stopTag?: { id: string, children: string[] }) => {
    await decrease(id, count, stopTag)
    return deletedTagIds
}

export default decreaseCardCount