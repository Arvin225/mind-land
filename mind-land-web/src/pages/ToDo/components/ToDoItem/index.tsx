import { Star, GripVertical } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { deleteToDoItemAPI, patchToDoItemAPI } from "@/apis/toDo"
import { ToDoItem as ToDoItemType } from "../../interfaces";
import { useToast } from "@/components/ToastProvider"

function ToDoItem({ item, tag, isDragging, onDragStart }: { item: ToDoItemType, tag?: string, isDragging?: boolean, onDragStart?: (id: number) => void }) {
    const toast = useToast()
    const { id, content, done, star, del } = item

    const [star_, setStar_] = useState(star)
    const [starUpdating, setStarUpdating] = useState(false)
    const handleStarClick = async () => {
        setStarUpdating(true)
        try {
            const { code, message, result } = await patchToDoItemAPI({ id: id, star: !star_ })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }
            setStar_(!star_)
        } finally {
            setStarUpdating(false)
        }
    }

    const contentRef = useRef(content)
    useEffect(() => {
        contentRef.current = content
    }, [content])
    const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value !== contentRef.current) {
            try {
                const { code, message, result } = await patchToDoItemAPI({ id: id, content: e.target.value })
                if (code === -1) {
                    toast.error(message)
                    console.error(result)
                    e.target.value = contentRef.current
                    return
                }
                contentRef.current = e.target.value
            } catch (err) {
                toast.error('网络错误，请稍后重试')
                e.target.value = contentRef.current
            }
        }
    }

    const [disabled, setDisabled] = useState(false)
    const [visible, setVisible] = useState<boolean>(done ? done : !done)
    async function checkItem(_checked: boolean, done: boolean) {
        setDisabled(true)
        try {
            const { code, message, result } = await patchToDoItemAPI({ id: id, done: done })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }
            setVisible(!visible)
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        } finally {
            setDisabled(false)
        }
    }

    const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            checkItem(true, true)
        } else {
            checkItem(false, false)
        }
    }

    const deleteItem = async (permanent?: boolean) => {
        try {
            const { code, message, result } = await deleteToDoItemAPI({ id, permanent })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }
            setVisible(false)
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        if (confirm('确定删除此任务？')) {
            deleteItem(del ? true : undefined)
        }
    }

    const handleDragStart = (e: React.DragEvent) => {
        if (!(e.target as HTMLElement).closest('[data-drag-handle]')) {
            e.preventDefault()
            return
        }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(id))
        onDragStart?.(id)
    }

    if (!visible) return null

    return (
        <div
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            draggable={!del}
            className={`liquid-glass-panel rounded-xl px-4 py-3 flex items-center gap-3 group cursor-pointer
                ${isDragging ? 'opacity-50' : ''}
                ${del ? '' : 'cursor-default'}`}
        >
            {!del && (
                <button
                    data-drag-handle
                    className="p-1 rounded-md hover:bg-[--hover] transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 text-[--foreground]/30 hover:text-[--foreground]/60 shrink-0"
                    aria-label="拖动排序"
                    tabIndex={-1}
                >
                    <GripVertical className="w-4 h-4" />
                </button>
            )}
            <input
                type="checkbox"
                className="w-4 h-4 accent-[#D4A574] cursor-pointer"
                checked={done}
                onChange={handleCheck}
                disabled={disabled}
                aria-label={done ? '标记为未完成' : '标记为已完成'}
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
                <button onClick={handleStarClick} disabled={starUpdating} aria-label={star_ ? '取消星标' : '添加星标'} className="p-1 rounded-md hover:bg-[--hover] transition-colors disabled:opacity-40">
                    <Star className={`w-4 h-4 ${star_ ? 'text-[#D4A574] fill-[#D4A574]' : 'text-[--foreground]/30'}`} />
                </button>
            </div>
        </div>
    )
}

export default ToDoItem