import { EditorView, keymap } from "@codemirror/view";
import { Extension, EditorSelection } from "@codemirror/state";

// 输入 ** → 若有选区则包裹选区；若为光标则自动闭合 ****，光标落中间
const boldClose = EditorView.inputHandler.of((view, _from, _to, text): boolean => {
    if (text !== "**") return false;
    view.dispatch(view.state.changeByRange((r) => {
        if (r.from !== r.to) {
            // 选区：包裹
            const selected = view.state.doc.sliceString(r.from, r.to);
            return {
                changes: { from: r.from, to: r.to, insert: `**${selected}**` },
                range: EditorSelection.range(r.from + 2, r.from + 2 + selected.length),
            };
        }
        // 光标：自动闭合
        return {
            changes: { from: r.from, to: r.to, insert: "****" },
            range: EditorSelection.range(r.from + 2, r.from + 2),
        };
    }));
    return true;
});

// 判断行是否是"空列表项"（只有 marker 没有内容）
function matchEmptyListItem(lineText: string): { markerEnd: number } | null {
    // markerEnd = marker 在行内的结束偏移（0-based）
    const m = lineText.match(/^(\s*[-*+]\s)$/);
    if (m) return { markerEnd: m[1].length };
    const m2 = lineText.match(/^(\s*\d+\.\s)$/);
    if (m2) return { markerEnd: m2[1].length };
    return null;
}

// Enter 在空列表项行末 → 清 marker 退出列表
// Backspace 在空列表项 marker 末尾 → 清 marker 退出列表
const listExitKeys = keymap.of([
    {
        key: "Enter",
        run(view): boolean {
            const sel = view.state.selection.main;
            if (!sel.empty) return false;
            const line = view.state.doc.lineAt(sel.head);
            if (sel.head !== line.to) return false;
            const info = matchEmptyListItem(line.text);
            if (!info) return false;
            view.dispatch({
                changes: { from: line.from, to: line.to, insert: "" },
                selection: EditorSelection.cursor(line.from),
            });
            return true;
        },
    },
    {
        key: "Backspace",
        run(view): boolean {
            const sel = view.state.selection.main;
            if (!sel.empty) return false;
            const line = view.state.doc.lineAt(sel.head);
            const info = matchEmptyListItem(line.text);
            if (!info) return false;
            const markerEnd = line.from + info.markerEnd;
            if (sel.head !== markerEnd) return false;
            view.dispatch({
                changes: { from: line.from, to: markerEnd, insert: "" },
                selection: EditorSelection.cursor(line.from),
            });
            return true;
        },
    },
]);

export function draftInputRules(): Extension {
    return [boldClose, listExitKeys];
}
