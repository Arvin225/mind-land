import TiptapEditor from './TiptapEditor'
import type { Editor } from '@tiptap/react'

interface SlipEditorProps {
    inputSubmit: (editor: Editor | null) => void
    submitting?: boolean
}

function SlipEditor({ inputSubmit, submitting }: SlipEditorProps) {
    return <TiptapEditor inputSubmit={inputSubmit} submitting={submitting} />
}

export default SlipEditor
