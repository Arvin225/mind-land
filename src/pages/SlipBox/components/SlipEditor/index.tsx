import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { Boot, IButtonMenu, IDomEditor } from "@wangeditor/editor";
import { useEffect, useState } from 'react';
import { Button, Typography } from 'antd';

function SlipEditor({ inputSubmit }: { inputSubmit: Function }) {

    // editor 实例
    const [editor, setEditor] = useState<IDomEditor | null>(null)

    // 自定义菜单
    class TagMenu implements IButtonMenu {
        title: string;
        iconSvg: string;
        tag: string;
        constructor() {
            this.title = 'tag' // 自定义菜单标题
            this.iconSvg = '<svg t="1726933228535" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1577" data-darkreader-inline-fill="" width="200" height="200"><path d="M413.482667 86.122667a42.666667 42.666667 0 0 1 33.728 50.026666L415.616 298.666667h275.733333l34.773334-178.816a42.666667 42.666667 0 1 1 83.754666 16.298666L778.282667 298.666667H917.333333a42.666667 42.666667 0 1 1 0 85.333333h-155.648l-49.770666 256H874.666667a42.666667 42.666667 0 1 1 0 85.333333h-179.349334l-34.773333 178.816a42.666667 42.666667 0 1 1-83.754667-16.298666L608.384 725.333333H332.650667l-34.773334 178.816a42.666667 42.666667 0 1 1-83.754666-16.298666L245.717333 725.333333H106.666667a42.666667 42.666667 0 1 1 0-85.333333h155.648l49.770666-256H149.333333a42.666667 42.666667 0 1 1 0-85.333333h179.349334l34.773333-178.816a42.666667 42.666667 0 0 1 50.026667-33.728zM624.981333 640l49.770667-256H399.018667l-49.770667 256h275.733333z" p-id="1578"></path></svg>' // 可选
            this.tag = 'button'
        }

        // 获取菜单执行时的 value ，用不到则返回空 字符串或 false
        getValue(editor: IDomEditor): string | boolean {                              // JS 语法
            return false
        }

        // 菜单是否需要激活（如选中加粗文本，“加粗”菜单会激活），用不到则返回 false
        isActive(editor: IDomEditor): boolean {                    // JS 语法
            return false
        }

        // 菜单是否需要禁用（如选中 H1 ，“引用”菜单被禁用），用不到则返回 false
        isDisabled(editor: IDomEditor): boolean {                     // JS 语法
            return false
        }

        // 点击菜单时触发的函数
        exec(editor: IDomEditor) {                              // JS 语法
            if (this.isDisabled(editor)) return
            editor.insertText('#') // value 即 this.value(editor) 的返回值
        }

    }
    // 菜单配置
    const menuTagConf = {
        key: 'tag', // 定义 menu key ：要保证唯一、不重复（重要）
        factory() {
            return new TagMenu() // 把 `YourMenuClass` 替换为你菜单的 class
        }
    }
    //判断: 如果已经插入进去，不在二次插入
    if (editor && !editor.getAllMenuKeys().includes("tag")) {
        Boot.registerMenu(menuTagConf)
    }

    // 工具栏配置
    const toolbarConfig = {
        toolbarKeys: [
            'uploadImage', '|',
            {
                key: 'group-font', // 必填，要以 group 开头
                title: '字体', // 必填
                iconSvg: '<svg t="1726931613178" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4222" data-darkreader-inline-fill="" width="200" height="200"><path d="M341.333333 213.333333a42.666667 42.666667 0 0 1 39.381334 26.24l213.333333 512a42.666667 42.666667 0 1 1-78.762667 32.853334L341.333333 366.933333l-173.952 417.493334a42.666667 42.666667 0 0 1-78.762666-32.853334l213.333333-512A42.666667 42.666667 0 0 1 341.333333 213.333333z" fill="#14181F" p-id="4223" data-darkreader-inline-fill="" style="--darkreader-inline-fill: #16181e;"></path><path d="M170.666667 597.333333a42.666667 42.666667 0 0 1 42.666666-42.666666h256a42.666667 42.666667 0 1 1 0 85.333333H213.333333a42.666667 42.666667 0 0 1-42.666666-42.666667zM896 469.333333a42.666667 42.666667 0 0 1 42.666667 42.666667v256a42.666667 42.666667 0 1 1-85.333334 0v-256a42.666667 42.666667 0 0 1 42.666667-42.666667z" fill="#14181F" p-id="4224" data-darkreader-inline-fill="" style="--darkreader-inline-fill: #16181e;"></path><path d="M768 554.666667a85.333333 85.333333 0 1 0 0 170.666666 85.333333 85.333333 0 0 0 0-170.666666z m-170.666667 85.333333a170.666667 170.666667 0 1 1 341.333334 0 170.666667 170.666667 0 0 1-341.333334 0z" fill="#14181F" p-id="4225" data-darkreader-inline-fill="" style="--darkreader-inline-fill: #16181e;"></path></svg>', // 可选
                menuKeys: ['bold', 'underline', 'bgColor',] // 下级菜单 key ，必填
            }
            , 'bulletedList', 'numberedList'
        ],
        insertKeys: {
            index: 0,
            keys: 'tag'
        }
    }
    // 编辑器配置
    const editorConfig = {
        placeholder: '现在的想法是...',
    }

    // 及时销毁 editor
    useEffect(() => {
        return () => {
            if (editor == null) return
            editor.destroy()
            setEditor(null)
        }
    }, [editor])

    const [html, setHtml] = useState('')

    return (
        <>
            <div style={{ border: '1px solid #ccc', zIndex: 100, width: '100%' }}>
                <Editor
                    defaultConfig={editorConfig}
                    // value={html}
                    onCreated={setEditor}
                    onChange={editor => setHtml(editor.getHtml())}
                    mode="default"
                    style={{ height: '121.99px', overflowY: 'hidden' }}
                />
                <Toolbar
                    editor={editor}
                    defaultConfig={toolbarConfig}
                    mode="default"
                    style={{ height: '40px', borderBottom: '1px solid #ccc' }}
                />
                <Button onClick={() => inputSubmit(editor)} >{'submit'}</Button>
                <div><Typography.Text >{html}</Typography.Text></div>
            </div>

        </>
    )

}

export default SlipEditor