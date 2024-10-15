import { ExclamationCircleFilled } from "@ant-design/icons";
import { Modal } from "antd";

const { confirm } = Modal

const showDeleteConfirm = ({ title, content, onOk }: { title: string, content: string, onOk: () => void }) => {
    confirm({
        title: title,
        icon: <ExclamationCircleFilled />,
        content: content,
        okText: '确定删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: onOk,
        onCancel() {
        },
    });
};

export default showDeleteConfirm