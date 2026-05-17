import { deleteToDoListAPI, patchToDoListAPI } from "@/apis/layout"
import { fetchGetToDoLists } from "@/store/modules/toDoStore"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAppDispatch } from "@/store/hooks"
import { useToast } from "@/components/ToastProvider"
import { Trash2 } from "lucide-react"

function List({ item: { id, name } }: { item: { id: number, name: string } }) {
    const toast = useToast()
    const dispatch = useAppDispatch()
    const [open, setOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editName, setEditName] = useState(name)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const location = useLocation()
    const navigate = useNavigate()

    const saveEdit = async () => {
        if (editName.trim() && editName !== name) {
            setSaving(true)
            try {
                const { code, message, result } = await patchToDoListAPI({ id, name: editName })
                if (code === -1) {
                    toast.error(message)
                    console.error(result)
                    return
                }
                dispatch(fetchGetToDoLists())
            } finally {
                setSaving(false)
            }
        }
        setOpen(false)
    }

    const deleteList = async () => {
        setDeleting(true)
        try {
            const { code, message, result } = await deleteToDoListAPI(id)
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }
            dispatch(fetchGetToDoLists())
            if (location.pathname.substring(6) === id + '') {
                navigate('/todo/all')
            }
        } finally {
            setDeleting(false)
        }
    }

    const handleDoubleClick = () => {
        setEditName(name)
        setOpen(true)
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setDeleteOpen(true)
    }

    const handleConfirmDelete = async () => {
        await deleteList()
        setDeleteOpen(false)
    }

    return (
        <>
            <div className="flex items-center gap-2 w-full group">
                <div onDoubleClick={handleDoubleClick} className="truncate flex-1 cursor-pointer">{name}</div>
                <button
                    onClick={handleDeleteClick}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-[--hover] text-[--foreground]/40 hover:text-red-400 shrink-0"
                    title="删除列表"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
                    <div className="liquid-glass-strong rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-[--foreground] font-medium mb-4">编辑列表</h3>
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[--input] text-[--foreground] text-sm border border-[--glass-border] outline-none focus:border-[#D4A574]/50 mb-4"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[--foreground]/55 hover:bg-[--hover] transition-colors cursor-pointer">取消</button>
                            <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-[#D4A574]/15 text-[#D4A574] hover:bg-[#D4A574]/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">{saving ? '保存中...' : '保存'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)}>
                    <div className="liquid-glass-strong rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-[--foreground] font-medium mb-2">删除列表</h3>
                        <p className="text-[--foreground]/55 text-sm mb-4">删除列表 "{name}"？该列表下所有任务也将被删除。</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[--foreground]/55 hover:bg-[--hover] transition-colors cursor-pointer">取消</button>
                            <button onClick={handleConfirmDelete} disabled={deleting} className="px-3 py-1.5 rounded-lg text-xs bg-red-400/15 text-red-400 hover:bg-red-400/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">{deleting ? '删除中...' : '删除'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default List