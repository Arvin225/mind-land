import { ViewPlugin, EditorView, Decoration, DecorationSet, WidgetType, ViewUpdate } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { buildBlockTable, lookupBlock, BlockEntry, md } from "./blockTable";

class RenderedBlockWidget extends WidgetType {
    constructor(readonly html: string) { super(); }
    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = "draft-typora-widget";
        wrap.setAttribute("contenteditable", "false");
        wrap.innerHTML = this.html;
        return wrap;
    }
    // 不忽略 mousedown，让 view 的 domEventHandlers 处理点击 → 拆源码
    ignoreEvent(event: Event) {
        return event.type !== "mousedown";
    }
}

// 取视口文本 + 起始行号（用于块表行号全局化）
function viewportTextAndStartLine(view: EditorView): { text: string; startLine: number } {
    const lines: string[] = [];
    let startLine = 1;
    for (let i = 0; i < view.visibleRanges.length; i++) {
        const r = view.visibleRanges[i];
        const sLine = view.state.doc.lineAt(r.from).number;
        const eLine = view.state.doc.lineAt(r.to).number;
        if (i === 0) startLine = sLine;
        for (let n = sLine; n <= eLine; n++) {
            lines.push(view.state.doc.line(n).text);
        }
    }
    return { text: lines.join("\n"), startLine };
}

// 当前块（光标所在）
function activeBlock(view: EditorView, table: BlockEntry[]): BlockEntry | null {
    const sel = view.state.selection.main;
    const line = view.state.doc.lineAt(sel.head).number;
    return lookupBlock(table, line);
}

// 选区覆盖的块起点集合
function selectionCoveredBlockStarts(view: EditorView, table: BlockEntry[]): Set<number> {
    const covered = new Set<number>();
    const sel = view.state.selection.main;
    if (sel.empty) return covered;
    const fromLine = view.state.doc.lineAt(sel.from).number;
    const toLine = view.state.doc.lineAt(sel.to).number;
    for (const b of table) {
        if (b.lineEnd >= fromLine && b.lineStart <= toLine) {
            covered.add(b.lineStart);
        }
    }
    return covered;
}

const plugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet = Decoration.none;

        update(update: ViewUpdate) {
            if (!update.docChanged && !update.selectionSet && !update.viewportChanged) return;
            this.rebuild(update.view);
        }

        rebuild(view: EditorView) {
            const { text, startLine } = viewportTextAndStartLine(view);
            const table = buildBlockTable(text, startLine);
            const active = activeBlock(view, table);
            const covered = selectionCoveredBlockStarts(view, table);

            const ranges: { from: number; to: number; deco: Decoration }[] = [];
            const doc = view.state.doc;
            const totalLines = doc.lines;

            for (const b of table) {
                if (b.type === "empty") continue;
                if (b.lineStart === active?.lineStart) continue;
                if (covered.has(b.lineStart)) continue;
                if (b.lineStart > totalLines || b.lineEnd > totalLines) continue;
                const from = doc.line(b.lineStart).from;
                const to = doc.line(b.lineEnd).to;
                if (to <= from) continue;
                const blockText = doc.sliceString(from, to);
                const html = md.render(blockText).trim();
                if (!html) continue;
                ranges.push({
                    from,
                    to,
                    deco: Decoration.replace({ widget: new RenderedBlockWidget(html) }),
                });
            }

            ranges.sort((a, b) => a.from - b.from);
            // Decoration.set 内部会 diff 旧 set，只更新变化 DOM
            this.decorations = Decoration.set(ranges.map((r) => r.deco.range(r.from, r.to)));
        }
    },
    { decorations: (v) => v.decorations },
);

// 鼠标点击 widget → 拆该块为源码，光标落点击位置
const clickHandler = EditorView.domEventHandlers({
    mousedown(event, view) {
        const target = event.target as HTMLElement | null;
        const widgetEl = target?.closest?.(".draft-typora-widget") as HTMLElement | null;
        if (!widgetEl) return false;
        const pos = view.posAtCoords({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY });
        if (pos == null) return false;
        view.dispatch({
            selection: { anchor: pos },
            scrollIntoView: true,
        });
        view.focus();
        event.preventDefault();
        return true;
    },
});

// ArrowUp / ArrowDown 进相邻 widget：依赖 CM6 默认 moveVertically 把光标移入 widget 的源码 range，
// selectionSet 触发 rebuild → 该块 widget 拆为源码。无需自定义 keymap。
// （若实测发现默认行为跳过 widget，再在此处补 keymap 拦截。）

export function typoraPlugin(): Extension {
    return [plugin, clickHandler];
}
