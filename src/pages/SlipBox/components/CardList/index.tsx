import { Dropdown, Flex, List, Card } from "antd"
import { EllipsisOutlined } from "@ant-design/icons"
import VirtualList from 'rc-virtual-list'
import { ItemType } from "antd/es/menu/interface"
import { Card as MyCard } from "../../interfaces"
import { MenuInfo } from "rc-menu/lib/interface"

/* interface Card {
    id: string
    content: string
    builtOrDelTime: string
    statistics: { builtTime: string, updateTime: string, words: number }
    tags: string[]
    del: boolean
} */
/* interface CardMenuItem {
    key?: string
    label?: string
    style?: { color: string },
    type?: string
} */
function CardList({ cards, onCardMenuClick }: { cards: MyCard[], onCardMenuClick: (e: MenuInfo, id: string, tagIds: string[]) => void }) {

    const cardMenuItems: ItemType[] = [
        {
            key: 'edit',
            label: '编辑',
            style: { color: '#6d6d6d' }
        },
        {
            key: 'pin',
            label: '置顶',
            style: { color: '#6d6d6d' }
        },
        { type: 'divider' },
        {
            key: 'detail',
            label: '查看详情',
            style: { color: '#6d6d6d' }
        },
        {
            key: 'comment',
            label: '批注',
            style: { color: '#6d6d6d' }
        },
        {
            key: 'delete',
            label: '删除',
            style: { color: '#e47571' }
        },
    ]

    return (
        <List split={false} style={{ width: '100%' }}>
            <VirtualList data={cards} height={766.81} itemHeight={95.2} itemKey={'id'}>
                {item => (
                    <List.Item key={item.id} style={{ padding: '5px 0' }}>
                        <Card size="small" style={{ width: '100%', backgroundColor: '#202020', color: '#d9d9d9', fontSize: '14px' }} bordered={false}>
                            <div style={{ padding: '3px' }}>
                                <Flex justify="space-between" style={{ paddingBottom: '10px' }}>
                                    <div style={{ fontSize: '12px' }}>{item.builtOrDelTime}</div>
                                    <Dropdown
                                        menu={{
                                            items: cardMenuItems.concat(
                                                [
                                                    { type: 'divider' },
                                                    {
                                                        key: 'words',
                                                        label: `字数：${item.statistics.words}`,
                                                        style: { fontSize: '12px', color: '#646464' }
                                                    },
                                                    {
                                                        key: 'b-time',
                                                        label: `创建时间：${item.statistics.builtTime}`,
                                                        style: { fontSize: '12px', color: '#646464' }
                                                    },
                                                    {
                                                        key: 'u-time',
                                                        label: `最后编辑：${item.statistics.updateTime}`,
                                                        style: { fontSize: '12px', color: '#646464' }
                                                    }
                                                ]
                                            ),
                                            onClick: (e) => onCardMenuClick(e, item.id, item.tags),
                                            style: { backgroundColor: '#454545' }
                                        }}
                                        placement="bottom"
                                        overlayStyle={{ width: 180 }}
                                    >
                                        <EllipsisOutlined />
                                    </Dropdown>
                                </Flex>
                                <div style={{ paddingBottom: '7px' }}>{item.content}</div>
                                {/* {item.tags.map(item => (<div key={item.tagId}>{'#' + item.tagName}</div>))} */}
                            </div>

                        </Card>
                    </List.Item>
                )}
            </VirtualList>
        </List>
    )
}

export default CardList