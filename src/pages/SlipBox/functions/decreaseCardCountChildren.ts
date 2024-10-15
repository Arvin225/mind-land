import { deleteTagAPI, getTagAPI, patchTagAPI } from "@/apis/slipBox"
import _ from "lodash"

let cid
const deletedTagIds = []
const decreasedTagIds = []
// 卡片计数-1的函数 
async function decrease(id, count) {
    // 递归终止条件：id为空或减过
    if (!id || decreasedTagIds.includes(id)) return

    const res = await getTagAPI(id)
    const tag = res.data
    const children = tag.children

    for (let i = 0; i < children.length; i++) {
        const cid = children[i];
        // 递归
        await decrease(cid, count)
    }

    // 回溯时执行的业务逻辑
    if (tag.cardCount === count) {
        // 卡片数量只有1则删除当前标签
        await deleteTagAPI(id)
        // 保存id
        cid = id
        // 收集删除的tag的id
        deletedTagIds.push(id)
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

}

const decreaseCardCountChildren = async (id, count = 1) => {
    await decrease(id, count)
    return deletedTagIds
}

export default decreaseCardCountChildren