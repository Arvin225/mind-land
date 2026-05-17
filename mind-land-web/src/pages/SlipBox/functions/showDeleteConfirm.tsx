const showDeleteConfirm = ({ title, content, onOk }: { title: string, content: string, onOk: () => void }) => {
    // 使用原生 confirm 作为临时方案
    if (confirm(`${title}\n\n${content}\n\n确定删除？`)) {
        onOk();
    }
};

export default showDeleteConfirm