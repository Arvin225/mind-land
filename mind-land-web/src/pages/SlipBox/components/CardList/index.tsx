import { MoreHorizontal, Bold, Underline as UnderlineIcon, Highlighter, List, ListOrdered, Hash } from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import DOMPurify from "dompurify"
import { Card as MyCard } from "../../interfaces"
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import { TagHighlight } from '../SlipEditor/TagHighlight'

interface MenuItem {
    key: string
    label: string
    disabled?: boolean
}

interface CardListProps {
    cards: MyCard[]
    onCardMenuClick: (item: MenuItem, id: number, tagIds: number[]) => void
    onCardUpdate: (id: number, content: string) => Promise<void>
}

interface MenuPosition {
    top: number | null
    bottom: number | null
    left: number
}

const MENU_MAX_HEIGHT = 320
const MENU_MARGIN = 8

// 内联编辑器组件
function InlineEditor({
    content,
    onSubmit,
    onCancel
}: {
    content: string
    onSubmit: (content: string) => void
    onCancel: () => void
}) {
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({ multicolor: false }),
            TagHighlight,
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[100px] px-4 py-3',
            },
        },
    })

    // Ctrl+Enter 提交
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter' && editor) {
                e.preventDefault()
                onSubmitRef.current(editor.getHTML())
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [editor])

    if (!editor) return null

    const ToolbarButton = ({
        onClick,
        active,
        icon: Icon,
        title,
    }: {
        onClick: () => void
        active: boolean
        icon: React.ComponentType<{ className?: string }>
        title: string
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-md transition-all duration-200 ${
                active
                    ? 'bg-[#D4A574]/15 text-[#D4A574]'
                    : 'text-[--foreground]/50 hover:text-[--foreground]/80 hover:bg-[--hover]'
            }`}
        >
            <Icon className="w-4 h-4" />
        </button>
    )

    return (
        <div className="liquid-glass-panel rounded-xl overflow-hidden">
            <EditorContent editor={editor} />
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().insertContent('#').run()}
                        active={false}
                        icon={Hash}
                        title="标签"
                    />
                    <div className="w-px h-4 bg-[--border] mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        icon={Bold}
                        title="粗体"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        icon={UnderlineIcon}
                        title="下划线"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        icon={Highlighter}
                        title="高亮"
                    />
                    <div className="w-px h-4 bg-[--border] mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        icon={List}
                        title="无序列表"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        icon={ListOrdered}
                        title="有序列表"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded-xl text-sm text-[--foreground]/60 hover:text-[--foreground]/90 hover:bg-[--hover] transition-colors whitespace-nowrap"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => onSubmit(editor.getHTML())}
                        className="px-4 py-1.5 rounded-xl bg-[#D4A574]/15 text-[#D4A574] text-sm hover:bg-[#D4A574]/25 transition-colors whitespace-nowrap"
                    >
                        提交
                    </button>
                </div>
            </div>
        </div>
    )
}

function CardList({ cards, onCardMenuClick, onCardUpdate }: CardListProps) {
    const [activeMenu, setActiveMenu] = useState<number | null>(null)
    const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: null, bottom: null, left: 0 })
    const [editingCardId, setEditingCardId] = useState<number | null>(null)
    
    // 监听滚动和窗口变化，关闭菜单
    useEffect(() => {
        const handleClose = () => setActiveMenu(null)
        window.addEventListener('scroll', handleClose, true)
        window.addEventListener('resize', handleClose)
        return () => {
            window.removeEventListener('scroll', handleClose, true)
            window.removeEventListener('resize', handleClose)
        }
    }, [])
    
    const handleMenuOpen = useCallback((id: number, e: React.MouseEvent<HTMLButtonElement>) => {
        const buttonRect = e.currentTarget.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const buttonCenterY = buttonRect.top + buttonRect.height / 2
        
        // 菜单宽度
        const menuWidth = 176
        
        // 默认：菜单右边缘对齐按钮右边缘
        let left = buttonRect.right - menuWidth
        // 如果太靠左，则改为左边缘对齐按钮左边缘
        if (left < 8) {
            left = buttonRect.left
        }
        // 如果太靠右，则限制在视口内
        if (left + menuWidth > viewportWidth - 8) {
            left = viewportWidth - menuWidth - 8
        }
        
        // 判断按钮在屏幕上半部还是下半部
        const isInLowerHalf = buttonCenterY > viewportHeight / 2
        
        if (isInLowerHalf) {
            // 按钮在下半部，菜单向上弹出
            setMenuPosition({
                top: null,
                bottom: viewportHeight - buttonRect.top + MENU_MARGIN,
                left
            })
        } else {
            // 按钮在上半部，菜单向下弹出
            setMenuPosition({
                top: buttonRect.bottom + MENU_MARGIN,
                bottom: null,
                left
            })
        }
        setActiveMenu(id)
    }, [])

    const cardMenuItems: MenuItem[] = [
        { key: 'edit', label: '编辑' },
        { key: 'pin', label: '置顶' },
        { key: 'detail', label: '查看详情' },
        { key: 'comment', label: '批注' },
        { key: 'delete', label: '删除' },
    ]

    const handleMenuClick = (menuItem: MenuItem, card: MyCard) => {
        setActiveMenu(null)
        if (menuItem.key === 'edit') {
            setEditingCardId(card.id)
        } else {
            onCardMenuClick(menuItem, card.id, card.tags)
        }
    }

    const handleDoubleClick = (card: MyCard) => {
        setEditingCardId(card.id)
    }

    const handleEditSubmit = async (id: number, content: string) => {
        await onCardUpdate(id, content)
        setEditingCardId(null)
    }

    const handleEditCancel = () => {
        setEditingCardId(null)
    }

    return (
        <div className="w-full space-y-2">
            {cards.length === 0 && (
                <div className="text-center py-16 text-[--foreground]/35">
                    <p className="text-lg mb-2">暂无卡片</p>
                    <p className="text-sm">在上方编辑器中创建你的第一张卡片笔记</p>
                </div>
            )}
            {cards.map(item => (
                <div
                    key={item.id}
                    className={editingCardId === item.id ? '' : 'liquid-glass-panel rounded-xl p-4 relative group'}
                    onDoubleClick={() => editingCardId !== item.id && handleDoubleClick(item)}
                >
                    {editingCardId === item.id ? (
                        <InlineEditor
                            content={item.content}
                            onSubmit={(content) => handleEditSubmit(item.id, content)}
                            onCancel={handleEditCancel}
                        />
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-[--foreground]/40">{item.builtOrDelTime}</span>
                                <div className="relative">
                                    <button
                                        onClick={(e) => activeMenu === item.id ? setActiveMenu(null) : handleMenuOpen(item.id, e)}
                                        className="p-1 rounded-lg hover:bg-[--hover] text-[--foreground]/40 hover:text-[--foreground]/70 transition-colors"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div 
                                className="text-sm text-[--foreground]/90 leading-relaxed card-content cursor-text"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }}
                            />
                        </>
                    )}
                </div>
            ))}
            
            {/* Portal 菜单 - 渲染到 body，完全脱离卡片层级 */}
            {activeMenu !== null && createPortal(
                <>
                    {/* 点击背景关闭 */}
                    <div 
                        className="fixed inset-0 z-[100]" 
                        onClick={() => setActiveMenu(null)} 
                    />
                    {/* 菜单内容 */}
                    <div 
                        className="fixed z-[101] w-44 liquid-glass-strong rounded-xl py-2 shadow-xl overflow-auto scrollbar-auto-hide"
                        style={{ 
                            ...(menuPosition.top !== null ? { top: menuPosition.top } : {}),
                            ...(menuPosition.bottom !== null ? { bottom: menuPosition.bottom } : {}),
                            left: menuPosition.left,
                            maxHeight: MENU_MAX_HEIGHT
                        }}
                    >
                        {(() => {
                            const card = cards.find(c => c.id === activeMenu)
                            if (!card) return null
                            return (
                                <>
                                    {cardMenuItems.map(menuItem => (
                                        <button
                                            key={menuItem.key}
                                            onClick={() => handleMenuClick(menuItem, card)}
                                            className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[--hover] ${
                                                menuItem.key === 'delete' ? 'text-[#e47571]' : 'text-[--foreground]/70'
                                            }`}
                                        >
                                            {menuItem.label}
                                        </button>
                                    ))}
                                    <div className="border-t border-[--border] my-1" />
                                    <div className="px-4 py-1 text-xs text-[--foreground]/40">
                                        字数：{card.statistics.words}
                                    </div>
                                    <div className="px-4 py-1 text-xs text-[--foreground]/40">
                                        创建：{card.statistics.builtTime}
                                    </div>
                                    <div className="px-4 py-1 text-xs text-[--foreground]/40">
                                        更新：{card.statistics.updateTime}
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

export default CardList