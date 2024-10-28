import { Dropdown, Modal, Form, Input, MenuProps } from "antd"
import { ExclamationCircleFilled } from "@ant-design/icons"
import { deleteToDoListAPI, patchToDoListAPI } from "@/apis/layout"
import { fetchGetToDoLists } from "@/store/modules/toDoStore"
import { Bounce, ToastContainer, toast } from "react-toastify"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAppDispatch } from "@/store/hooks"


const { confirm } = Modal

function List({ item: { id, name } }: { item: { id: number, name: string } }) {

    const [form] = Form.useForm();

    const dispatch = useAppDispatch()
    // 右键菜单项
    const items = [
        { label: '编辑', key: 'edit' },
        { label: '删除', key: 'delete' }
    ]

    const [open, setOpen] = useState(false)
    // 编辑保存事件
    const onEditSave = (values: { newName: string }) => {
        // 具体的保存操作
        saveEdit(values)
        // 关闭Modal
        setOpen(false);
    };

    // 编辑操作
    const saveEdit = async ({ newName }: { newName: string }) => {
        if (newName.trim() && newName !== name) {

            const { code, message, result } = await patchToDoListAPI({ id, name: newName })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }

            // 重新渲染自定义列表
            dispatch(fetchGetToDoLists())
        }

    }

    const location = useLocation()
    const navigate = useNavigate()

    // 删除列表操作
    const deleteList = async () => {

        const { code, message, result } = await deleteToDoListAPI(id)
        if (code === -1) {
            toast.error(message)
            console.error(result)
            return
        }

        // 重新渲染自定义列表
        dispatch(fetchGetToDoLists())

        // todo 如果刚好选中了当前列表，删除后应该选中紧邻的上一个列表（上一个没有就选中紧邻的下一个列表）
        if (location.pathname.substring(6) === id + '') {
            navigate('/todo/all')
        }

    }

    // 展示删除确认框
    const showDeleteConfirm = (listName: string) => {
        confirm({
            title: `删除 ${listName} 列表？`,
            icon: <ExclamationCircleFilled />,
            content: `该列表下的所有任务也将被删除`,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: deleteList,
            onCancel() {
            },
        });
    };


    // 处理右键菜单点击
    const handleContextMenuClick: MenuProps["onClick"] = (e) => {
        e.domEvent.stopPropagation()
        switch (e.key) {
            case 'edit':
                setOpen(true)
                break;
            case 'delete':
                showDeleteConfirm(name)
                break;
            default:
                break;
        }
    }


    return (
        <>
            <ToastContainer position="top-center"
                autoClose={2000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
            <Dropdown menu={{ items, onClick: handleContextMenuClick }} trigger={['contextMenu']}>
                <div>{name}</div>
            </Dropdown>
            <Modal
                open={open}
                title="编辑列表"
                okText="保存"
                cancelText="取消"
                okButtonProps={{
                    autoFocus: true,
                    htmlType: 'submit',
                }}
                onCancel={() => setOpen(false)}
                destroyOnClose
                modalRender={(dom) => (
                    <Form
                        layout="vertical"
                        form={form}
                        name="form_in_modal"
                        initialValues={{
                            newName: name, //初始值：列表名（控制的是这个子组件的子组件的value属性）
                        }}
                        clearOnDestroy
                        onFinish={(values) => onEditSave(values)}
                    >
                        {dom}
                    </Form>
                )}
            >
                <Form.Item
                    name="newName"
                    label="列表名"
                    rules={[
                        {
                            required: true,
                            message: '列表名不能为空!',
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
            </Modal>
        </>

    )
}

export default List