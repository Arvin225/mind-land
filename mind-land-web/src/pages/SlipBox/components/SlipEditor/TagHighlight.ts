import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const tagRegex = /#[\u4e00-\u9fa5a-zA-Z0-9_]+/g

function findTags(doc: any): DecorationSet {
    const decorations: Decoration[] = []

    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return false

        const text = node.text || ''
        let match: RegExpExecArray | null

        while ((match = tagRegex.exec(text)) !== null) {
            const from = pos + match.index
            const to = from + match[0].length
            decorations.push(
                Decoration.inline(from, to, {
                    class: 'tag-highlight',
                })
            )
        }
        return false
    })

    return DecorationSet.create(doc, decorations)
}

export const TagHighlight = Extension.create({
    name: 'tagHighlight',

    addProseMirrorPlugins() {
        const key = new PluginKey('tagHighlight')
        const plugin: Plugin<DecorationSet> = new Plugin({
            key,
            state: {
                init(_, { doc }) {
                    return findTags(doc)
                },
                apply(tr, decorationSet) {
                    if (tr.docChanged) {
                        return findTags(tr.doc)
                    }
                    return decorationSet.map(tr.mapping, tr.doc)
                },
            },
            props: {
                decorations(state): DecorationSet | null {
                    return plugin.getState(state) ?? null
                },
            },
        })
        return [plugin]
    },
})
