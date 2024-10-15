import { Dropdown, Modal, Form, Input } from "antd"
import { ExclamationCircleFilled } from "@ant-design/icons"
import { deleteToDoListNameAPI, patchToDoListNameAPI } from "@/apis/layout"
import { useDispatch } from "react-redux"
import { fetchToDoListNames } from "@/store/modules/toDoStore"
import { Bounce, ToastContainer, toast } from "react-toastify"
import { getToDoListAPI, patchToDoItemAPI } from "@/apis/toDo"
import { useState } from "react"
import { useLocation, useHistory, useNavigate, useNavigation, redirect, Link } from "react-router-dom"

const { confirm } = Modal

function ListName({ item: { id, listName } }) {

    const [form] = Form.useForm();

    const dispatch = useDispatch()
    // 右键菜单项
    const items = [
        { label: '编辑', key: 'edit' },
        { label: '删除', key: 'delete' }
    ]

    const [open, setOpen] = useState(false)
    // 编辑保存事件
    const onEditSave = (values) => {
        // 具体的保存操作
        saveEdit(values)
        // 关闭Modal
        setOpen(false);
    };

    // 编辑操作
    const saveEdit = ({ newName }) => {
        if (newName.trim() && newName !== listName) {

            // 更新列表名的操作
            function updateListName() {
                // 请求数据库更新
                patchToDoListNameAPI({ id, listName: newName }).then(res => {
                    // 重新渲染自定义列表
                    dispatch(fetchToDoListNames())
                }).catch(err => {
                    // 提示用户
                    toast.error('保存失败，请稍后再试')
                })
            }

            getToDoListAPI({ listId: id, done: false }).then(res => {
                // 有待办则更新所有待办的listName
                if (res.data.length) {
                    const promiseList = []
                    res.data.forEach(async item => {
                        promiseList.push(await patchToDoItemAPI({ id: item.id, listName: newName }))
                    })
                    Promise.all(promiseList).then(resList => {
                        // 更新列表名
                        updateListName()
                    }).catch(err => {
                        toast.error('保存失败，请稍后再试')
                    })
                } else {
                    // 无待办则直接更新列表名
                    updateListName()
                }
            }).catch(err => {
                toast.error('保存失败，请稍后再试')
            })

        }

    }

    const location = useLocation()
    const navigate = useNavigate()

    // 删除列表操作
    const deleteList = () => {

        // 删除列表名操作
        function deleteListName() {
            deleteToDoListNameAPI(id).then(res => {
                // 成功 重新渲染数据
                dispatch(fetchToDoListNames())
                // todo 如果刚好选中了当前列表，删除后应该选中紧邻的上一个列表（上一个没有就选中紧邻的下一个列表）
                if (location.pathname.substring(6) === id) {
                    navigate('/todo/all')
                }

            }).catch(err => {
                // 失败 提示用户
                toast.error('删除失败，请稍后重试')
            })
        }

        // 请求数据库：待办也一块儿删了 // todo 应当后端用事务确保一致性
        // 有待办先删待办
        getToDoListAPI({ listId: id, done: false }).then(res => {
            // 有任务先删任务
            if (res.data.length) {
                // 依次发送修改请求 // todo 将就一下，有后端了后端做
                const promiseList = []
                res.data.forEach(async item => {
                    promiseList.push(await patchToDoItemAPI({ id: item.id, del: true, listId: '', listName: '' }))
                })
                Promise.all(promiseList).then(resList => {
                    // 任务都删除成功，删列表
                    deleteListName()
                }).catch(err => {
                    // （删除任务）失败 提示用户
                    toast.error('删除失败，请稍后重试')
                })
            } else {
                // 无待办直接删
                deleteListName()
            }
        }).catch(err => {
            // （获取列表）失败 提示用户
            toast.error('删除失败，请稍后重试')
        })


    }

    // 展示删除确认框
    const showDeleteConfirm = (listName) => {
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
    const handleContextMenuClick = (e) => {
        e.domEvent.stopPropagation()
        switch (e.key) {
            case 'edit':
                setOpen(true)
                break;
            case 'delete':
                showDeleteConfirm(listName)
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
                <div>{listName}</div>
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
                            newName: listName, //初始值：列表名（控制的是这个子组件的子组件的value属性）
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

export default ListName