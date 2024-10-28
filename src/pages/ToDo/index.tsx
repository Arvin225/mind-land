import { useParams } from "react-router-dom"
import ToDoItem from "./components/ToDoItem"
import { useEffect, useState } from "react"
import { Card, Input, Affix } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import { postToDoItemAPI } from "@/apis/toDo"
import { Bounce, ToastContainer, toast } from "react-toastify"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGetToDoItems, setLoadingToDoItems } from "@/store/modules/toDoStore"

function ToDo() {

    const systemList = [
        { id: 'all', name: '全部' },
        { id: 'star', name: '星标' },
        { id: 'done', name: '已完成' },
        { id: 'bin', name: '回收站' },
    ]

    const params = useParams()

    const list = params.list!

    const dispatch = useAppDispatch()

    // 异步请求当前列表数据
    useEffect(() => {
        dispatch(setLoadingToDoItems(true)) // 路由每次进来都重置下loading
        dispatch(fetchGetToDoItems(list)) // 更新完toDoList后会更新loading
    }, [list])
    // 获取加载状态
    const loading = useAppSelector(state => state.toDo.loadingToDoItems)
    // 获取当前列表数据
    const toDoItems = useAppSelector(state => state.toDo.toDoItems)


    // 获取列表名
    const toDoLists = useAppSelector(state => state.toDo.toDoLists)

    let listName: string | undefined, sysListName: string | undefined, star: boolean, listId: string
    // list是number类型则在自定义列表，否则（是string类型）在智能列表
    // 自定义列表中
    if (typeof list === 'number') {
        const findList = toDoLists.find(item => item.id === list)
        if (findList) {
            listName = findList.name
            listId = list // 如果是在自定义列表中，则设置所属列表
        } else {
            // todo 不存在的列表,路由到404页面
        }

        // 在智能列表中
    } else {
        const findSystemList = systemList.find(item => item.id === list)
        if (findSystemList) {
            sysListName = findSystemList.name
            sysListName === '星标' && (star = true) // 如果是在星标列表，star为true
        } else {
            // todo 不存在的列表,路由到404页面
        }
    }

    // 新增todo
    const [inputValue, setInputValue] = useState('')
    const addToDo = async () => {
        if (inputValue.trim()) {
            // todo 禁用输入框

            // 提交到数据库
            const { code, message, result } = await postToDoItemAPI({ content: inputValue, star: star, listId: listId, listName: listName })
            if (code === -1) {
                toast.error(message)
                console.error(result)
                return
            }

            // 成功，重新请求列表更新store渲染列表，取消禁用输入框
            dispatch(fetchGetToDoItems(list))
            // 清空输入框
            setInputValue('')

        }
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
                {sysListName ? toDoItems.map(item => <ToDoItem item={item} tag={item.listName} key={item.id} />) : toDoItems.map(item => <ToDoItem item={item} key={item.id} />)}

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