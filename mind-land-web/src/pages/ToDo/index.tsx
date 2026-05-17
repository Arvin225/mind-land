import { useParams } from "react-router-dom"
import ToDoItem from "./components/ToDoItem"
import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { postToDoItemAPI } from "@/apis/toDo"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGetToDoItems, setLoadingToDoItems } from "@/store/modules/toDoStore"
import { useToast } from "@/components/ToastProvider"

function ToDo() {
    const toast = useToast()
    const params = useParams()
    const list = params.list!
    const dispatch = useAppDispatch()

    type SystemListKey = 'all' | 'star' | 'done' | 'bin'
    const systemList: { id: SystemListKey; name: string }[] = [
        { id: 'all', name: '全部' },
        { id: 'star', name: '星标' },
        { id: 'done', name: '已完成' },
        { id: 'bin', name: '回收站' },
    ]

    const resolveListParam = (p: string): SystemListKey | number => {
        if (systemList.some(s => s.id === p)) return p as SystemListKey
        const n = parseInt(p, 10)
        return isNaN(n) ? 'all' : n
    }

    useEffect(() => {
        dispatch(setLoadingToDoItems(true))
        dispatch(fetchGetToDoItems(resolveListParam(list)))
    }, [list])

    const loading = useAppSelector(state => state.toDo.loadingToDoItems)
    const toDoItems = useAppSelector(state => state.toDo.toDoItems)
    const toDoLists = useAppSelector(state => state.toDo.toDoLists)

    let listName: string | undefined, sysListName: string | undefined, star = false, listId: number | undefined

    // 尝试从自定义列表中查找（list 是数字ID字符串）
    const numericId = parseInt(list, 10)
    if (!isNaN(numericId)) {
        const findList = toDoLists.find(item => item.id === numericId)
        if (findList) {
            listName = findList.name
            listId = numericId
        }
    }

    // 如果是系统列表
    const findSystemList = systemList.find(item => item.id === list)
    if (findSystemList) {
        sysListName = findSystemList.name
        sysListName === '星标' && (star = true)
    }

    // 当前显示的标题
    const currentTitle = sysListName || listName || '待办'

    const [inputValue, setInputValue] = useState('')
    const [adding, setAdding] = useState(false)
    const addToDo = async () => {
        if (!inputValue.trim()) return
        setAdding(true)
        try {
            const { code, message, result } = await postToDoItemAPI({ content: inputValue, star: star, listId: listId?.toString(), listName: listName })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }
            dispatch(fetchGetToDoItems(resolveListParam(list)))
            setInputValue('')
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        } finally {
            setAdding(false)
        }
    }

    if (loading) {
        return <div className="text-[--foreground]/55 text-sm">加载中...</div>
    }

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto">
            {/* 列表标题 */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[--border]">
                <h2 className="font-serif-display text-[--foreground] text-lg tracking-wide">{currentTitle}</h2>
                {toDoItems.length > 0 && (
                    <span className="text-xs text-[--foreground]/35">({toDoItems.length})</span>
                )}
            </div>
            <div className="flex-1 overflow-auto space-y-1 pb-4">
                {toDoItems.length === 0 ? (
                    <div className="text-center py-16 text-[--foreground]/35">
                        <p className="text-lg mb-2">暂无任务</p>
                        <p className="text-sm">{star ? '点击任务旁的星标图标即可收藏' : '在下方输入框添加你的第一个待办任务'}</p>
                    </div>
                ) : (
                    sysListName
                        ? toDoItems.map(item => <ToDoItem item={item} tag={item.listName} key={item.id} />)
                        : toDoItems.map(item => <ToDoItem item={item} key={item.id} />)
                )}
            </div>

            <div className="sticky bottom-0 pt-2">
                <div className="liquid-glass-panel rounded-xl px-4 py-3 flex items-center gap-3">
                    <Plus className="w-4 h-4 text-[--foreground]/40 shrink-0" />
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="添加任务…"
                        disabled={adding}
                        className="flex-1 bg-transparent text-sm text-[--foreground] placeholder:text-[--foreground]/30 outline-none disabled:opacity-40"
                        onKeyDown={e => { if (e.key === 'Enter') addToDo() }}
                    />
                </div>
            </div>
        </div>
    )
}

export default ToDo