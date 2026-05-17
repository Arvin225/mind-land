import SlipEditor from "./components/SlipEditor";
import { fetchGetCards, fetchGetTags } from "@/store/modules/slipBoxStore";
import { Key, useEffect, useState } from "react";
import CardList from "./components/CardList";
import PathBar from "./components/PathBar";
import SortMenu from "./components/SortMenu";
import RightSider, { TreeNode } from "./components/RightSider";
import SearchBar from "./components/SearchBar";
import _ from "lodash";
import { getTagAPI, createCardAPI, deleteCardAPI, patchCardAPI } from "@/apis/slipBox";
import usePathItems from "./hooks/usePathItems";
import showDeleteConfirm from "./functions/showDeleteConfirm";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Tag } from "./interfaces";
import { useToast } from "@/components/ToastProvider";

// 自定义类型
type MenuItem = { label: string; key: string }

function SlipBox() {
    const toast = useToast()
    const dispatch = useAppDispatch()
    const { pathItems, buildPathItems } = usePathItems()
    const [submitting, setSubmitting] = useState(false)
    
    useEffect(() => {
        dispatch(fetchGetCards({ del: false }))
        dispatch(fetchGetTags())
    }, [])
    
    const loadingCards = useAppSelector(state => state.slipBox.loadingCards)
    const loadingTags = useAppSelector(state => state.slipBox.loadingTags)
    const cards = useAppSelector(state => state.slipBox.cards)
    const tags = useAppSelector(state => state.slipBox.tags)

    // 更新卡片内容
    const handleCardUpdate = async (id: number, content: string) => {
        try {
            const { code, message } = await patchCardAPI({ id, content })
            if (code === -1) {
                toast.error(message)
                return
            }
            // 刷新当前标签的卡片列表
            const currentTagId = Number(_.last(pathItems)?.href)
            if (!currentTagId) {
                dispatch(fetchGetCards({ del: false }))
            } else {
                dispatch(fetchGetCards({ tagId: currentTagId }))
            }
            toast.success('卡片已更新')
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        }
    }

    const inputSubmit = async (editor: TiptapEditor | null) => {
        if (!editor) return
        const contentWithText = editor.getText()
        if (!contentWithText) return
        const contentWithHtml = editor.getHTML()

        setSubmitting(true)
        try {
            const { code, message, result } = await createCardAPI({ contentWithText, contentWithHtml })
            if (code === -1) {
                toast.error(message)
                console.error(result);
                return
            }

            dispatch(fetchGetTags());
            const currentTagId = Number(_.last(pathItems)?.href)
            if (!currentTagId) {
                dispatch(fetchGetCards({ del: false }));
            } else {
                const res = await getTagAPI(currentTagId)
                const currentTagName = res.result?.tagName
                if (currentTagName) {
                    result?.tags.find(tag => tag.tagName.startsWith(currentTagName))
                        && dispatch(fetchGetCards({ tagId: currentTagId }))
                }
            }
            editor.commands.clearContent();
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        } finally {
            setSubmitting(false)
        }
    }

    const [selectedKey, setSelectedKey] = useState<Key>(0)
    
    const handleTagSelected = async (keys: Key[]) => {
        const key = keys[0]
        setSelectedKey(key)
        const tagId = Number(key)

        if (!tagId) {
            dispatch(fetchGetCards({ del: false }))
            buildPathItems(null)
            return
        }

        dispatch(fetchGetCards({ tagId }))
        const tag = tags.find(tag => tag.id === tagId)
        buildPathItems(tagId, tag?.tagName)
    }

    async function handleCardDelete(id: number, tagIds: number[]) {
        try {
            const { code, message, result } = await deleteCardAPI({ id, tagIds })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }

            let currentTagId = Number(_.last(pathItems)?.href)
            const deletedTagIds = result?.deletedTagIds || []
            if (currentTagId && deletedTagIds.includes(currentTagId)) {
                setSelectedKey(0)
                dispatch(fetchGetCards({ del: false }))
            } else {
                currentTagId
                    ? dispatch(fetchGetCards({ tagId: currentTagId }))
                    : dispatch(fetchGetCards({ del: false }))
            }

            deletedTagIds.length && dispatch(fetchGetTags())
        } catch (err) {
            toast.error('网络错误，请稍后重试')
        }
    }

    const onCardMenuClick = (item: MenuItem, id: number, tagIds: number[]) => {
        switch (item.key) {
            case 'delete':
                showDeleteConfirm({
                    title: '删除卡片',
                    content: '删除后卡片将移至回收站，可在回收站中恢复。',
                    onOk: () => handleCardDelete(id, tagIds)
                })
                break;
            default:
                break;
        }
    }

    if (loadingCards || loadingTags) return (<div className="text-[--foreground]/55 text-sm">加载中...</div>)

    interface Tag_ extends Tag {
        treeBuildAccomplished: boolean
    }
    const tags_: Tag_[] = tags.map(tag => ({ ...tag, treeBuildAccomplished: false }))

    function buildTagTree(tag: Tag_, tagTrees: TreeNode[]): TreeNode {
        if (tag.treeBuildAccomplished) {
            const tempTreeIndex = tagTrees.findIndex(tree => tree.key === tag.id)
            const tempTree = tagTrees[tempTreeIndex]
            tagTrees.splice(tempTreeIndex, 1)
            return tempTree
        }

        const children = tag.children || []
        if (children.length) {
            const childNodes: TreeNode[] = []
            children.forEach(cid => {
                const ctag = tags_.find(tag => tag.id === cid)
                if (ctag) {
                    childNodes.push(buildTagTree(ctag, tagTrees))
                }
            })
            tag.treeBuildAccomplished = true
            return {
                title: (
                    <span className="flex justify-between items-center w-full">
                        <span>{_.last(tag.tagName.split('/'))}</span>
                        <span className="text-xs text-[--foreground]/40">{tag.cardCount}</span>
                    </span>
                ),
                key: tag.id,
                icon: '#',
                children: childNodes
            }
        } else {
            tag.treeBuildAccomplished = true
            return {
                title: (
                    <span className="flex justify-between items-center w-full">
                        <span>{_.last(tag.tagName.split('/'))}</span>
                        <span className="text-xs text-[--foreground]/40">{tag.cardCount}</span>
                    </span>
                ),
                key: tag.id,
                icon: '#',
                isLeaf: true
            }
        }
    }

    const tagTrees: TreeNode[] = []
    tags_.forEach(tag => {
        if (!tag.treeBuildAccomplished) tagTrees.push(buildTagTree(tag, tagTrees))
    })

    return (
        <div className="flex gap-5 h-full">
            {/* 左侧主区域 */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* 顶部路径栏 */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 max-w-[60%]">
                        <PathBar pathItems={pathItems} />
                        <SortMenu />
                    </div>
                    <div className="flex items-center gap-3">
                        <SearchBar />
                    </div>
                </div>
                {/* 编辑器 + 卡片列表 */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4">
                        <SlipEditor inputSubmit={inputSubmit} submitting={submitting} />
                    </div>
                    <div className="flex-1 overflow-auto scrollbar-auto-hide">
                        <CardList cards={cards} onCardMenuClick={onCardMenuClick} onCardUpdate={handleCardUpdate} />
                    </div>
                </div>
            </div>
            
            {/* 右侧标签栏 - 与编辑器顶部对齐，与卡片区域等高 */}
            <div className="w-[260px] flex flex-col pt-[56px]">
                <div className="flex-1 min-h-0">
                    <RightSider treeData={tagTrees} onSelect={handleTagSelected} selectedKey={selectedKey} />
                </div>
            </div>
        </div>
    )
}

export default SlipBox