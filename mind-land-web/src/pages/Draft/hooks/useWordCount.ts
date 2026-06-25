import { useEffect, useState } from "react";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

// 算 content_md 渲染后的纯文本字符数（debounce 200ms）
export function useWordCount(content: string): number {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => {
            if (!content) {
                setCount(0);
                return;
            }
            try {
                const html = md.render(content);
                // 剥离 HTML 标签
                const tmp = document.createElement("div");
                tmp.innerHTML = html;
                const text = tmp.textContent || tmp.innerText || "";
                // 按 rune 计数（中文友好）
                setCount([...text].length);
            } catch {
                setCount(0);
            }
        }, 200);
        return () => clearTimeout(t);
    }, [content]);
    return count;
}
