import { Dropdown, Flex, MenuProps, message, TreeDataNode } from "antd"
import SlipEditor from "./components/SlipEditor";
import { fetchGetCards, fetchGetTags } from "@/store/modules/slipBoxStore";
import { Key, useEffect, useState } from "react";
import CardList from "./components/CardList";
import PathBar from "./components/PathBar";
import SortMenu from "./components/SortMenu";
import RightSider from "./components/RightSider";
import SearchBar from "./components/SearchBar";
import _ from "lodash";
import { deleteTagAPI, getTagAPI, createCardAPI, deleteCardAPI } from "@/apis/slipBox";
import usePathItems from "./hooks/usePathItems";
import showDeleteConfirm from "./functions/showDeleteConfirm";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { IDomEditor } from "@wangeditor/editor";
import { Tag } from "./interfaces";
import { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import { MenuInfo } from "rc-menu/lib/interface";

function SlipBox() {

    const [messageApi] = message.useMessage()

    const dispatch = useAppDispatch()
    const { pathItems, buildPathItems } = usePathItems()
    useEffect(() => {
        dispatch(fetchGetCards({ del: false }))
        dispatch(fetchGetTags())
    }, [])
    // 得到cards、tags的loading状态
    const loadingCards = useAppSelector(state => state.slipBox.loadingCards)
    const loadingTags = useAppSelector(state => state.slipBox.loadingTags)
    // 得到store里的cards tags
    const cards = useAppSelector(state => state.slipBox.cards)
    const tags = useAppSelector(state => state.slipBox.tags)

    // 处理编辑器输入框提交
    const inputSubmit = async (editor: IDomEditor) => {
        const contentWithText = editor.getText()
        if (!contentWithText) return
        // 找出标签
        const contentWithHtml = editor.getHtml()

        // 创建卡片
        const { code, message, result } = await createCardAPI({ contentWithText, contentWithHtml })
        if (code === -1) {
            messageApi.error(message)
            console.error(result);
            return
        }

        // 5.更新store (cards、tags) 
        // 5.1 更新store-tags
        dispatch(fetchGetTags());
        // 5.2 更新store-cards：在当前标签下或全部卡片下时
        // 获得当前标签的id
        const currentTagId = Number(_.last(pathItems)?.href)
        if (!currentTagId) {
            // 在全部卡片中时，重新拉取所有卡片
            dispatch(fetchGetCards({ del: false }));
        } else {
            // 在标签下时
            const res = await getTagAPI(currentTagId)
            const currentTagName = res.result.tagName
            // 新增的卡片的标签中有属于当前标签时重新拉取当前标签下的卡片
            result?.tags.find(tag => tag.tagName.startsWith(currentTagName))
                && dispatch(fetchGetCards({ tagId: currentTagId }))
        }
        // 6.清空输入框
        editor.clear();

    }


    const [selectedKey, setSelectedKey] = useState<Key>(0)
    // 处理标签树标签的选中
    const handleTagSelected = async (keys: number[]) => {
        const tagId = keys[0]
        // 手动设置选中
        setSelectedKey(tagId)

        // 选中的是全部卡片则：
        if (!tagId) {
            // 拉取全部卡片
            dispatch(fetchGetCards({ del: false }))
            // 更新路径栏
            buildPathItems(null)
            return
        }

        // 获取当前标签下的卡片，更新store 
        dispatch(fetchGetCards({ tagId }))

        // 2.更新路径栏
        const tag = tags.find(tag => tag.id === tagId) //todo 或许从数据库查保险些
        buildPathItems(tagId, tag?.tagName)

        /* getTagAPI(tagId).then(async res => { // 或许可以从store中查
            // 1.拉取所选标签的及其后代标签的卡片更新store
            const tag = res.data
            // 收集当前标签及其后代标签的id
            const allTagId = [tagId]
            // 孩子标签
            allTagId.push(...tag.children)
            // todo 后代标签
    
    
            // 获取卡片
            const promiseList = []
            for (let i = 0; i < allTagId.length; i++) {
                const tagId = allTagId[i];
                promiseList.push(await getCardsAPI(tagId)) //! 无法_like模糊匹配
            }
            const allCard = []
            Promise.all(promiseList).then(resList => {
                resList.forEach(res => {
                    allCard.push(...res.data)
                })
    
                const uniqAllCard = []
                // 有后代标签则对卡片去重（同一张卡片有可能既有当前标签又有后代标签，会被查出多次）
                resList.length > 1
                    ? uniqAllCard.push(...(_.uniqBy(allCard, 'id')))
                    : uniqAllCard.push(...allCard)
    
                // 更新store-cards
                dispatch(setCards(uniqAllCard))
    
            }).catch(error => {
                messageApi.error('操作失败，请稍后重试')
                console.error('Error: ', error);
            })
    
            // 2.更新路径栏
            const tagName = tag.tagName
            buildPathItems(tagName)
    
        }).catch(error => {
            messageApi.error('操作失败，请稍后重试')
            console.error('Error: ', error);
        }) */
    }


    // 卡片删除的函数
    async function handleCardDelete(id: number, tagIds: number[]) {

        const { code, message, result } = await deleteCardAPI({ id, tagIds })
        if (code === -1) {
            messageApi.error(message)
            console.error(result)
            return
        }

        // 重新拉取卡片和标签 当前在哪个标签下就拉取哪个
        // 获得当前标签
        let currentTagId = Number(_.last(pathItems)?.href)
        // 若当前标签被删除则标签树选中改为全部卡片，并拉取全部卡片
        if (currentTagId && result!.deletedTagIds.includes(currentTagId)) {
            setSelectedKey(0)
            dispatch(fetchGetCards({ del: false }))

            // 若没被删除则重新拉取当前标签下的卡片
        } else {
            currentTagId
                ? dispatch(fetchGetCards({ tagId: currentTagId }))
                : dispatch(fetchGetCards({ del: false })) // 在全部卡片下
        }

        // 有标签被删除时，重新拉取标签树
        result!.deletedTagIds.length && dispatch(fetchGetTags())

    }

    // 处理卡片菜单点击
    const onCardMenuClick = (e: MenuInfo, id: number, tagIds: number[]) => {
        e.domEvent.stopPropagation()

        switch (e.key) {
            case 'edit':

                break;
            case 'pin':

                break;
            case 'detail':

                break;
            case 'comment':

                break;
            case 'delete':
                handleCardDelete(id, tagIds)
                break;
            default:
                break;
        }

    }


    // 执行标签菜单删除选项时的刷新卡片列表及标签树的函数
    async function flashCardsAndTagsWithTagDelete(pathItems: ItemType[], tagId: number, tagName: string) {
        // 获取当前标签的id
        const currentTagId = Number(_.last(pathItems)?.href)

        // 1.重新拉取卡片
        // 1.1 如果选中的标签是全部卡片时
        if (!currentTagId) {
            dispatch(fetchGetCards({ del: false }))
        } else {
            let res
            try { //! 这种方式出问题，可能导致请求不释放
                // 尝试查询当前标签，报错说明当前标签被删除了
                res = await getTagAPI(currentTagId)
            } catch (error) {
                // 1.3 如果选中的标签被删除（选中的标签为被删标签或被删标签的后代标签）
                // 选中改为全部卡片
                setSelectedKey(0)
                // 拉取全部卡片
                dispatch(fetchGetCards({ del: false }))

                console.log('当前标签被删除', error);
                // 2.重新拉取标签
                dispatch(fetchGetTags())
                return
            }
            // 1.4 如果选中的标签是被删标签的父级标签时
            const currentTagName = res.result.tagName
            if (tagName.startsWith(currentTagName)) {
                dispatch(fetchGetCards({ tagId: currentTagId }))
            }
        }

        // 2.重新拉取标签
        dispatch(fetchGetTags())
    }

    // 仅移除标签的函数
    const handleTagDelete = async (tagId: number, tagName: string) => {

        const { code, message, result } = await deleteTagAPI({ id: tagId, tagName })

        if (code === -1) {
            messageApi.error(message)
            console.error(result);
            return
        }

        // 重新拉取卡片及标签

        flashCardsAndTagsWithTagDelete(pathItems, tagId, tagName)
    }

    // 删除标签及其卡片
    const handleTagDeleteOverCards = async (tagId: number, tagName: string) => {

        const { code, message, result } = await deleteTagAPI({ id: tagId, tagName, overCards: true })

        if (code === -1) {
            messageApi.error(message)
            console.error(result);
            return
        }

        // 重新拉取卡片及标签
        flashCardsAndTagsWithTagDelete(pathItems, tagId, tagName)

        /* const currentTagId = _.last(pathItems).href
        let currentTagName
        if (currentTagId && (currentTagId !== tagId)) { // 选中的是正常标签且选中的标签没被删除
            const res = await getTagAPI(currentTagId)
            const currentTag = res.data
            currentTagName = currentTag.tagName
        }
 
        // 如果被删标签被选中（或选中的标签是其后代标签）
        if (currentTagId === tagId || (currentTagName && currentTagName.startsWith(tagName))) {
            // 选中改为全部卡片
            setSelectedKey('')
            // 拉取全部卡片
            dispatch(fetchGetAllCards(false))
 
            // 如果选中的标签是被删标签的父级标签时
        } else if (currentTagName && tagName.startsWith(currentTagName)) {
            dispatch(setCards(await getCardsByTagId(currentTagId)))
 
            // 如果选中的标签是全部卡片时
        } else if (!currentTagId) {
            dispatch(fetchGetAllCards(false))
        }
 
        // 重新拉取标签
        dispatch(fetchGetTags()) */
    }

    // 处理标签菜单点击
    const onTagMenuClick = (e: MenuInfo, tagId: number, tagName: string) => {
        e.domEvent.stopPropagation()
        switch (e.key) {
            case 'pin':

                break;
            case 'rename':

                break;
            case 'delete':
                showDeleteConfirm({ title: '从卡片中移除标签', content: `从所有卡片中移除 #${tagName}`, onOk: () => handleTagDelete(tagId, tagName) })
                break;
            case 'deleteOverCards':
                showDeleteConfirm({ title: '删除标签及卡片', content: `删除标签 #${tagName} 及其所有卡片`, onOk: () => handleTagDeleteOverCards(tagId, tagName) })
                break;
            default:
                break;
        }
    }


    /* -------------------------------------未获取到数据之前不允许进一步执行（数据拼接构造、渲染等)------------------------------------- */
    if (loadingCards || loadingTags) return (<div>加载中...</div>)
    /* -------------------------------------未获取到数据之前不允许进一步执行（数据拼接构造、渲染等)------------------------------------- */

    // 标签树数组
    const tagTrees: TreeDataNode[] = []

    interface Tag_ extends Tag {
        treeBuildAccomplished: boolean
    }
    // 初始化标记
    const tags_: Tag_[] = tags.map(tag => ({ ...tag, treeBuildAccomplished: false }))

    // 标签项菜单
    const tagMenuItems: MenuProps['items'] = [
        { label: '置顶', key: 'pin', style: { color: '#6d6d6d' } },
        { label: '重命名', key: 'rename', style: { color: '#6d6d6d' } },
        { type: 'divider' },
        { label: '仅移除标签', key: 'delete', style: { color: '#e47571' } },
        { label: '删除标签和卡片', key: 'deleteOverCards', style: { color: '#e47571' } }
    ]

    // 构建标签树的函数
    function buildTagTree(tag: Tag_) {
        // 递归终止条件：已完成标签树的构建
        if (tag.treeBuildAccomplished) {
            // 查找该标签树的索引
            const tempTreeIndex = tagTrees.findIndex(tree => tree.key === tag.id)
            // 获得该标签树
            const tempTree = tagTrees[tempTreeIndex]
            // 删除该标签树
            tagTrees.splice(tempTreeIndex, 1)
            return tempTree
        }

        const children = tag.children
        // 有孩子
        if (children.length) {
            const childNodes: TreeDataNode[] = []
            children.forEach(cid => {
                const ctag = tags_.find(tag => tag.id === cid)! // todo 后续看是否可优化
                //递归
                childNodes.push(buildTagTree(ctag))
            })

            // 标记当前tag为已构建标签树
            tag.treeBuildAccomplished = true

            // 业务逻辑
            return ({
                title:
                    <Dropdown
                        menu={{
                            items: tagMenuItems,
                            onClick: (e) => onTagMenuClick(e, tag.id, tag.tagName),
                            style: { backgroundColor: '#454545' }
                        }}
                        trigger={['contextMenu']}
                        overlayStyle={{ width: 128.18 }}>
                        <span>{_.last(tag.tagName.split('/'))}<span style={{ float: 'inline-end' }}>{tag.cardCount}</span></span>
                    </Dropdown>,
                key: tag.id,
                icon: '#',
                children: childNodes
            })
        } else {
            // 无孩子（临界值处理）：叶子节点直接返回
            tag.treeBuildAccomplished = true // 标记为已构建
            return ({
                title:
                    <Dropdown
                        menu={{
                            items: tagMenuItems,
                            onClick: (e) => onTagMenuClick(e, tag.id, tag.tagName),
                            style: { backgroundColor: '#454545' }
                        }}
                        trigger={['contextMenu']}
                        overlayStyle={{ width: 128.18 }}>
                        <span>{_.last(tag.tagName.split('/'))}<span style={{ float: 'inline-end' }}>{tag.cardCount}</span></span>
                    </Dropdown>,
                key: tag.id,
                icon: '#',
                isLeaf: true
            })
        }
    }

    // 开始构建
    tags_.forEach(tag => {
        if (!tag.treeBuildAccomplished) tagTrees.push(buildTagTree(tag))
    })

    return (
        <>
            <Flex gap={20} justify="center">
                <Flex vertical={true} style={{ width: '600px' }} justify={'flex-start'} align={'center'}>
                    <Flex justify={'space-between'} style={{ width: '100%' }}>
                        <Flex style={{ maxWidth: '60%' }} gap={10} align="center">

                            {/* 路径栏 */}
                            <PathBar pathItems={pathItems} />

                            {/* 排序菜单 */}
                            <SortMenu />
                        </Flex>

                        {/* 搜索框 */}
                        <SearchBar />

                        {/* 筛选器 */}
                        <div style={{ display: "none" }}>filter</div>
                    </Flex>
                    <Flex style={{ width: '100%', paddingTop: '10px', paddingBottom: '10px' }} justify="center">

                        {/* 输入框 */}
                        <SlipEditor inputSubmit={inputSubmit} />
                    </Flex>
                    <Flex style={{ width: '100%' }}>

                        {/* 卡片容器 */}
                        <CardList cards={cards} onCardMenuClick={onCardMenuClick} />
                    </Flex>
                </Flex>

                {/* 右侧边栏-标签树 */}
                <RightSider treeData={tagTrees} onSelect={handleTagSelected} selectedKey={selectedKey} />
            </Flex >
        </>


    )
}

export default SlipBox