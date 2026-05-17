import { Star } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { deleteToDoItemAPI, patchToDoItemAPI } from "@/apis/toDo"
import { ToDoItem as ToDoItemType } from "../../interfaces";
import { useToast } from "@/components/ToastProvider"

function ToDoItem({ item, tag }: { item: ToDoItemType, tag?: string }) {
    const toast = useToast()
    const { id, content, done, star, del } = item

    const [star_, setStar_] = useState(star)
    const handleStarClick = async () => {
        const { code, message, result } = await patchToDoItemAPI({ id: id, star: !star_ })
        if (code === -1) {
            toast.error(message)
            console.error(result)
            return
        }
        setStar_(!star_)
    }

    const contentRef = useRef(content)
    useEffect(() => {
        contentRef.current = content
    }, [content])
    const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value !== contentRef.current) {
            const { code, message, result } = await patchToDoItemAPI({ id: id, content: e.target.value })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                e.target.value = contentRef.current
                return
            }
            contentRef.current = e.target.value
        }
    }

    const [disabled, setDisabled] = useState(false)
    const [visible, setVisible] = useState<boolean>(done ? done : !done)
    async function checkItem(_checked: boolean, done: boolean) {
        setDisabled(true)
        const { code, message, result } = await patchToDoItemAPI({ id: id, done: done })
        if (code === -1) {
            toast.error(message)
            console.error(result)
            setDisabled(false)
            return
        }
        setVisible(!visible)
    }

    const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            checkItem(true, true)
        } else {
            checkItem(false, false)
        }
    }

    const deleteItem = async (permanent?: boolean) => {
        const { code, message, result } = await deleteToDoItemAPI({ id, permanent })
        if (code === -1) {
            toast.error(message)
            console.error(result)
            return
        }
        setVisible(false)
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        if (confirm('确定删除此任务？')) {
            deleteItem(del ? true : undefined)
        }
    }

    if (!visible) return null

    return (
        <div
            onContextMenu={handleContextMenu}
            className="liquid-glass-panel rounded-xl px-4 py-3 flex items-center gap-3 group cursor-pointer"
        >
            <input
                type="checkbox"
                className="w-4 h-4 accent-[#D4A574] cursor-pointer"
                defaultChecked={done}
                onChange={handleCheck}
                disabled={disabled}
            />
            <input
                type="text"
                defaultValue={content}
                className="flex-1 bg-transparent text-sm text-[--foreground] placeholder:text-[--foreground]/30 outline-none"
                onBlur={handleBlur}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            />
            <div className="flex items-center gap-2 shrink-0">
                {tag && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[rgba(212,165,116,0.08)] text-[#D4A574]">
                        {tag}
                    </span>
                )}
                <button onClick={handleStarClick} className="p-1 rounded-md hover:bg-[--hover] transition-colors">
                    <Star className={`w-4 h-4 ${star_ ? 'text-[#D4A574] fill-[#D4A574]' : 'text-[--foreground]/30'}`} />
                </button>
            </div>
        </div>
    )
}

export default ToDoItem