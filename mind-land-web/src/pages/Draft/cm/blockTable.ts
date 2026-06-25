import MarkdownIt from "markdown-it";

export interface BlockEntry {
    lineStart: number; // 1-based, inclusive
    lineEnd: number;   // 1-based, inclusive
    type: string;      // heading / paragraph / list / blockquote / code_block / hr / table / empty / unknown
}

const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
});

// 缓存：按 (text, startLine) 缓存 block table
let cacheKey: string | null = null;
let cacheStartLine: number = 1;
let cacheTable: BlockEntry[] = [];

// 把视口文本切成块（按空行分隔 + 块类型识别）
// startLine 是视口第一行在文档中的全局行号（1-based），用于把块表行号转成全局
export function buildBlockTable(text: string, startLine: number = 1): BlockEntry[] {
    if (text === cacheKey && cacheStartLine === startLine) return cacheTable;
    const table = computeTable(text, startLine);
    cacheKey = text;
    cacheStartLine = startLine;
    cacheTable = table;
    return table;
}

function computeTable(text: string, startLine: number): BlockEntry[] {
    const lines = text.split("\n");
    const table: BlockEntry[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === "") {
            table.push({ lineStart: startLine + i, lineEnd: startLine + i, type: "empty" });
            i++;
            continue;
        }

        const start = startLine + i;
        const type = detectType(lines, i);

        let end = i;
        if (type === "code_block") {
            const fence = line.match(/^(\s*)(`{3,}|~{3,})/);
            const fenceMarker = fence?.[2]?.[0] ?? "`";
            end = i;
            let j = i + 1;
            for (; j < lines.length; j++) {
                if (new RegExp(`^\\s*${fenceMarker}{3,}`).test(lines[j])) {
                    end = j;
                    break;
                }
            }
            if (end === i) end = lines.length - 1;
        } else if (type === "heading" || type === "hr") {
            end = i;
        } else {
            end = i;
            let j = i + 1;
            for (; j < lines.length; j++) {
                if (lines[j].trim() === "") break;
                if (type === "paragraph") {
                    const nt = detectType(lines, j);
                    if (nt !== "paragraph") break;
                }
                end = j;
            }
        }

        table.push({ lineStart: start, lineEnd: startLine + end, type });
        i = end + 1;
    }
    return table;
}

function detectType(lines: string[], idx: number): string {
    const line = lines[idx];
    const trimmed = line.trimStart();
    if (/^#{1,6}\s/.test(trimmed)) return "heading";
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return "hr";
    if (/^\s*[-*+]\s/.test(trimmed)) return "list";
    if (/^\s*\d+\.\s/.test(trimmed)) return "list";
    if (/^>\s?/.test(trimmed)) return "blockquote";
    if (/^\s*(`{3,}|~{3,})/.test(trimmed)) return "code_block";
    if (/^\|.*\|\s*$/.test(trimmed)) return "table";
    return "paragraph";
}

// 二分查找 line 所在的块
export function lookupBlock(table: BlockEntry[], line: number): BlockEntry | null {
    let lo = 0, hi = table.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const b = table[mid];
        if (line < b.lineStart) hi = mid - 1;
        else if (line > b.lineEnd) lo = mid + 1;
        else return b;
    }
    return null;
}

export { md };
