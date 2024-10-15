import { redirect, useParams } from "react-router-dom"
import ToDoItem from "./components/ToDoItem"
import { useEffect, useState } from "react"
import { fetchGetToDoList, setLoadingToDoList } from "@/store/modules/toDoStore"
import { useDispatch, useSelector } from "react-redux"
import { Card, Input, Affix } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import { postToDoItemAPI } from "@/apis/toDo"
import { Bounce, ToastContainer, toast } from "react-toastify"

function ToDo() {

    const systemListName = [
        { id: 'all', listName: '全部' },
        { id: 'star', listName: '星标' },
        { id: 'done', listName: '已完成' },
        { id: 'bin', listName: '回收站' },
    ]

    const params = useParams()

    const list = params.list

    const dispatch = useDispatch()

    // 异步请求当前列表数据
    useEffect(() => {
        dispatch(setLoadingToDoList(true)) // 路由每次进来都重置下loading
        dispatch(fetchGetToDoList(list)) // 更新完toDoList后会更新loading
    }, [list])
    // 获取加载状态
    const { loading } = useSelector(state => state.toDo)
    // 获取当前列表数据
    const { toDoList } = useSelector(state => state.toDo)


    // 获取列表名
    const { toDoListNames } = useSelector(state => state.toDo)
    // 假设传递的list是listId，查找其列表名，查到了就是在自定义列表，没查到就是在智能列表
    let listName, sysListName, star, listId
    const findListName = toDoListNames.find(item => item.id === list)
    if (findListName) {
        // 自定义列表中
        listName = findListName.listName
        listId = list // 如果是在自定义列表中，则设置所属列表
    } else {
        const findSystemListName = systemListName.find(item => item.id === list)
        if (findSystemListName) {
            // 智能列表中
            sysListName = findSystemListName.listName
            sysListName === '星标' && (star = true) // 如果是在星标列表，star为true
        } else {
            // todo 不存在的列表,路由到404页面
        }
    }

    // 新增todo
    const [inputValue, setInputValue] = useState('')
    const addToDo = () => {
        if (inputValue.trim()) //非空判断
            // todo 禁用输入框
            // 提交到数据库
            postToDoItemAPI({ content: inputValue, star: star, listId: listId, listName: listName }).then(res => {
                // 成功，重新请求列表更新store渲染列表，取消禁用输入框
                dispatch(fetchGetToDoList(list))
                // 清空输入框
                setInputValue('')
            }).catch(err => {
                // 失败，提示用户，取消禁用输入框
                toast.error('操作失败，请稍后再试')
            })
    }

    if (loading) {
        return <div>加载中...</div>
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
            <Card title={listName ? listName : sysListName} bordered={false}>
                {/* 渲染to-do项组件 */}
                {/* 条件渲染：在智能列表时加上tag属性（给列表名） */}
                {sysListName ? toDoList.map(item => <ToDoItem item={item} tag={item.listName} key={item.id} />) : toDoList.map(item => <ToDoItem item={item} key={item.id} />)}

                {/* to-do input表单 */}
                <Affix offsetTop={830}>
                    <Card type="inner">
                        <PlusOutlined style={{ marginLeft: 6 }} />
                        <Input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="添加任务" variant="borderless" style={{ marginLeft: 12, minWidth: '50%', maxWidth: '86%' }} onPressEnter={addToDo} />
                    </Card>
                </Affix>
            </Card>
        </>

    )
}

export default ToDo