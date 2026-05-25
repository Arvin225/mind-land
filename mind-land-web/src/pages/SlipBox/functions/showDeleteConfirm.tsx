import { showConfirm } from "@/lib/confirm"

const showDeleteConfirm = async ({ title, content, onOk }: { title: string, content: string, onOk: () => void }) => {
    const confirmed = await showConfirm({
        title,
        description: `${content}\n\n确定删除？`,
    })
    if (confirmed) {
        onOk()
    }
}

export default showDeleteConfirm