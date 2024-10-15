import { Breadcrumb } from "antd"
import { ItemType } from "antd/es/breadcrumb/Breadcrumb"

function PathBar({ pathItems }: { pathItems: ItemType[] }) {

    return (
        <Breadcrumb
            style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'HarmonyOS Sans SC, Consolas, Courier New, monospace' }}
            items={pathItems}
        />
    )

}

export default PathBar