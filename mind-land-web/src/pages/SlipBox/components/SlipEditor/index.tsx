import TiptapEditor from './TiptapEditor'
import type { Editor } from '@tiptap/react'

interface SlipEditorProps {
    inputSubmit: (editor: Editor | null) => void
}

function SlipEditor({ inputSubmit }: SlipEditorProps) {
    return <TiptapEditor inputSubmit={inputSubmit} />
}

export default SlipEditor