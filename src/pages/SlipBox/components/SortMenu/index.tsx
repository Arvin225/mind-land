import { DownOutlined } from "@ant-design/icons"
import { Dropdown } from "antd"

function SortMenu() {

    return (
        <Dropdown
            menu={{
                items: [{
                    key: 'c-asc',
                    label: '创建时间升序'
                },
                {
                    key: 'c-dec',
                    label: '创建时间降序'
                },
                {
                    key: 'e-asc',
                    label: '编辑时间升序'
                },
                {
                    key: 'e-dec',
                    label: '编辑时间降序'
                }],
                selectable: true,
            }}
            trigger={['click']}
        >
            <DownOutlined onClick={(e) => e.preventDefault()} />
        </Dropdown>
    )

}

export default SortMenu