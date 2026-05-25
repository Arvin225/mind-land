import { ChevronDown, ChevronRight, Hash } from "lucide-react"
import { Key, ReactNode, useState } from "react"

export interface TreeNode {
    title: ReactNode
    key: Key
    children?: TreeNode[]
    icon?: string
    isLeaf?: boolean
    selectable?: boolean
}

function TreeItem({ node, level, selectedKey, onSelect }: {
    node: TreeNode,
    level: number,
    selectedKey: Key,
    onSelect: (keys: Key[]) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const hasChildren = node.children && node.children.length > 0
    const isSelected = node.key === selectedKey

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (node.selectable !== false) {
                onSelect([node.key])
            }
            if (hasChildren) {
                setExpanded(!expanded)
            }
        }
        if (e.key === 'ArrowRight' && hasChildren && !expanded) {
            e.preventDefault()
            setExpanded(true)
        }
        if (e.key === 'ArrowLeft' && hasChildren && expanded) {
            e.preventDefault()
            setExpanded(false)
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const items = document.querySelectorAll<HTMLElement>('[role="treeitem"]')
            const currentIndex = Array.from(items).indexOf(e.currentTarget as HTMLElement)
            if (currentIndex < items.length - 1) {
                items[currentIndex + 1].focus()
            }
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            const items = document.querySelectorAll<HTMLElement>('[role="treeitem"]')
            const currentIndex = Array.from(items).indexOf(e.currentTarget as HTMLElement)
            if (currentIndex > 0) {
                items[currentIndex - 1].focus()
            }
        }
    }

    return (
        <div>
            <div
                role="treeitem"
                aria-expanded={hasChildren ? expanded : undefined}
                aria-selected={isSelected}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-[rgba(212,165,116,0.12)] text-[#D4A574]' : 'hover:bg-hover text-[--foreground]/55'
                } ${level === 0 ? 'text-xs font-medium' : 'text-xs'}`}
                style={{ paddingLeft: `${8 + level * 12}px` }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    if (node.selectable !== false) {
                        onSelect([node.key])
                    }
                    if (hasChildren) {
                        setExpanded(!expanded)
                    }
                }}
            >
                {hasChildren && (
                    expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                {!hasChildren && node.key === '0' && <Hash className="w-3 h-3" />}
                {!hasChildren && node.key !== '0' && <span className="w-3" />}
                <span className="truncate">{node.title}</span>
            </div>
            {hasChildren && expanded && (
                <div role="group">
                    {node.children!.map(child => (
                        <TreeItem
                            key={child.key}
                            node={child}
                            level={level + 1}
                            selectedKey={selectedKey}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function RightSider({ treeData, onSelect, selectedKey }: { treeData: TreeNode[], onSelect: (keys: Key[]) => void, selectedKey: Key }) {
    const rootNodes: TreeNode[] = [
        { title: '全部卡片', key: 0 },
        { title: '全部标签', key: '0', selectable: false, children: treeData }
    ]

    return (
        <aside className="h-full w-full surface-panel rounded-xl py-3 px-2 scrollbar-auto-hide overflow-auto" role="tree" aria-label="标签导航">
            {rootNodes.map(node => (
                <TreeItem
                    key={node.key}
                    node={node}
                    level={0}
                    selectedKey={selectedKey}
                    onSelect={onSelect}
                />
            ))}
        </aside>
    )
}

export default RightSider