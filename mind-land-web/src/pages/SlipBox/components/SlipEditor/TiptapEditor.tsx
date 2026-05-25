import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Image } from '@tiptap/extension-image'
import { useEffect, useRef, useState } from 'react'
import { TagHighlight } from './TagHighlight'
import ImageUploadDialog from '../ImageUploadDialog'
import {
    Bold,
    Underline as UnderlineIcon,
    Highlighter,
    List,
    ListOrdered,
    Image as ImageIcon,
    Hash
} from 'lucide-react'

interface TiptapEditorProps {
    inputSubmit: (editor: Editor | null) => void
    submitting?: boolean
}

function TiptapEditor({ inputSubmit, submitting }: TiptapEditorProps) {
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    const inputSubmitRef = useRef(inputSubmit);
    inputSubmitRef.current = inputSubmit;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({ multicolor: false }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Placeholder.configure({
                placeholder: '现在的想法是...',
            }),
            TagHighlight,
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
            },
        },
    })

    // Ctrl+Enter 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter' && editor) {
                e.preventDefault()
                inputSubmitRef.current(editor)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [editor])

    // 确保编辑器销毁时清理
    useEffect(() => {
        return () => {
            editor?.destroy()
        }
    }, [editor])

    if (!editor) {
        return null
    }

    const ToolbarButton = ({
        onClick,
        active,
        icon: Icon,
        title,
    }: {
        onClick: () => void
        active: boolean
        icon: React.ComponentType<{ className?: string }>
        title: string
    }) => (
        <button
            onClick={onClick}
            title={title}
            aria-label={title}
            aria-pressed={active}
            className={`p-1.5 rounded-md transition-all duration-200 ${
                active
                    ? 'bg-[#D4A574]/15 text-[#D4A574]'
                    : 'text-[#F5F0E8]/50 hover:text-[#F5F0E8]/80 hover:bg-white/[0.06]'
            }`}
        >
            <Icon className="w-4 h-4" />
        </button>
    )

    return (
        <div className="surface-panel rounded-xl overflow-hidden">
            <EditorContent editor={editor} />
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().insertContent('#').run()}
                        active={false}
                        icon={Hash}
                        title="标签"
                    />
                    <div className="w-px h-4 bg-[rgba(255,255,232,0.1)] mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        icon={Bold}
                        title="粗体"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        icon={UnderlineIcon}
                        title="下划线"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        icon={Highlighter}
                        title="高亮"
                    />
                    <div className="w-px h-4 bg-[rgba(255,255,232,0.1)] mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        icon={List}
                        title="无序列表"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        icon={ListOrdered}
                        title="有序列表"
                    />
                    <div className="w-px h-4 bg-[rgba(255,255,232,0.1)] mx-1" />
                    <ToolbarButton
                        onClick={() => setImageDialogOpen(true)}
                        active={editor.isActive('image')}
                        icon={ImageIcon}
                        title="插入图片"
                    />
                </div>
                <button
                    onClick={() => inputSubmit(editor)}
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-xl bg-[#D4A574]/15 text-[#D4A574] text-sm hover:bg-[#D4A574]/25 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    提交
                </button>
            </div>
            <ImageUploadDialog
                open={imageDialogOpen}
                onClose={() => setImageDialogOpen(false)}
                onConfirm={(url) => {
                    editor.chain().focus().setImage({ src: url }).run()
                }}
            />
        </div>
    )
}

export default TiptapEditor
