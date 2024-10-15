import { Card, Checkbox, Input, Tag, Dropdown } from "antd"
import { StarFilled, StarOutlined } from "@ant-design/icons"
import { useEffect, useState } from "react"
import { deleteToDoItemAPI, patchToDoItemAPI } from "@/apis/toDo"
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ToDoItem({ item, tag }) { //只有在 全部 中时，tag才有值（所属列表名）

    const { id, content, done, star, del } = item

    // 处理星标点击
    const [star_, setStar_] = useState(star)
    const handleStarClick = () => {
        // 提交修改到数据库
        patchToDoItemAPI({ id: id, star: !star_ }).then(res => {
            // 成功：修改星标状态
            setStar_(!star_) //异步
            // todo 在星标列表中时 visible false
        }).catch(err => {
            // 失败：提示失败
            toast.error('操作失败，请稍后重试')
        })
    }


    // 处理输入框失焦
    let content_ = content
    const handleBlur = (e) => {
        //内容发生改变则提交修改到数据库
        if (e.target.value !== content_) {
            patchToDoItemAPI({ id: id, content: e.target.value }).then(res => {
                // 修改成功，保存本次修改的内容，以供下次比对使用
                content_ = e.target.value
            }).catch(err => {
                // 修改失败，提示失败，并复原旧值
                toast.error('修改失败，请稍后再试');
                e.target.defaultValue = content_
            })
        }
    }


    // 具体的"完成"操作
    const [disabled, setDisabled] = useState(false)
    const [visible, setVisible] = useState(done ? done : !done)
    function checkItem(e, done) { // 值得注意的是，此代码块中的两个函数均为异步函数，会按顺序执行
        // 禁用checkbox
        setDisabled(true)
        // 提交数据库修改done
        patchToDoItemAPI({ id: id, done: done }).then(res => {
            // 修改成功，卸载当前todo项
            setVisible(!visible)
        }).catch(err => {
            // 修改失败，提示用户
            toast.error('提交失败，请稍后再试')
            // 回滚check状态
            e.target.checked = !done //todo 可能无效，后续用状态
            // 取消checkBox的禁用
            setDisabled(false)
        })
    }

    // 处理check事件
    const handleCheck = (e) => {
        // 表明在非‘已完成’和‘删除’列表，执行了提交完成的操作
        if (e.target.checked) {
            checkItem(e, true)

            // 表明在已完成列表中，执行的撤销完成的操作
        } else {
            checkItem(e, false)
        }
    }


    // 删除操作
    const deleteItem = (permanent) => {
        // todo 禁用删除选项
        // 永久删除 // todo 只有在回收站列表才有永久删除选项,且有且只有永久删除和恢复选项
        if (permanent) {
            deleteToDoItemAPI(id).then(res => {
                // 删除成功
                // visible false
                setVisible(false)
            }).catch(err => {
                // 删除失败
                // 提示用户
                toast.error('删除失败，请稍后再试')
            })
        } else {
            // 非永久删除
            patchToDoItemAPI({ id: id, del: true }).then(res => {
                // 删除成功
                // visible false
                // toast.success('删除成功')
                setVisible(false)
            }).catch(err => {
                // 删除失败
                // 提示用户
                toast.error('删除失败，请稍后再试')
            })
        }
        // 取消禁用删除选项
    }

    // 右键菜单 // todo 后续适配不同列表
    const items = [
        {
            label: '待添菜单项',
            key: '1',
        },
        {
            label: '待添菜单项',
            key: '2',
        },
        {
            label: '删除',
            key: 'delete',
        },
    ];

    // 处理右键菜单点击
    const handleContextMenuClick = ({ key }) => {
        switch (key) {
            case 'delete':
                deleteItem()
                break;
            case 'deletePermanent':
                deleteItem(true)
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
            {
                visible &&
                <Dropdown menu={{ items, onClick: handleContextMenuClick }} trigger={['contextMenu']}>
                    <a onClick={(e) => e.preventDefault()}>
                        <Card type="inner" style={{ marginTop: 6 }
                        } size="default" >
                            <Checkbox className="checkBox" style={{ marginLeft: 6 }} checked={done} onChange={handleCheck} disabled={disabled} />
                            <Input defaultValue={content} variant="borderless" style={{ marginLeft: 12, minWidth: '50%', maxWidth: '86%' }} onBlur={(e) => handleBlur(e)} onPressEnter={(e) => e.target.blur(e, true)} />
                            <div style={{ float: 'right' }} >
                                <Tag bordered={false} style={{ marginLeft: 20, marginRight: 20 }} >{tag}</Tag>
                                {/* 条件渲染：根据星标状态切换icon样式 */}
                                {star_ ? <StarFilled className="star" style={{ marginRight: 6 }} onClick={handleStarClick} />
                                    : <StarOutlined className="star" style={{ marginRight: 6 }} onClick={handleStarClick} />}
                            </div>
                        </Card >
                    </a>
                </Dropdown>
            }

        </>

    )
}

export default ToDoItem