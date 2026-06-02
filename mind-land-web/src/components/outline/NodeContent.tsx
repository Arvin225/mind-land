import { useState, useRef, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface NodeContentProps {
  content: string;
  onUpdate: (content: string) => void;
}

function saveCaret(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function restoreCaret(el: HTMLElement, offset: number) {
  let charIndex = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nextIndex = charIndex + node.length;
    if (offset <= nextIndex) {
      const range = document.createRange();
      range.setStart(node, offset - charIndex);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    charIndex = nextIndex;
  }
  // fallback: end
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export default function NodeContent({ content, onUpdate }: NodeContentProps) {
  const isReadOnly = useSelector((s: RootState) => s.outline.isReadOnly);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const divRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);

  // Sync external content changes (e.g. undo, select different node)
  useEffect(() => {
    if (!divRef.current) return;
    const currentHTML = divRef.current.innerHTML;
    const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: ["b","strong","i","em","u","br","h1","h2","h3","code","del","blockquote","ul","li"], ALLOWED_ATTR: [] });
    if (currentHTML !== sanitized) {
      divRef.current.innerHTML = sanitized;
      contentRef.current = sanitized;
    }
  }, [content]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (isReadOnly) { setShowToolbar(false); return; }
    const html = e.currentTarget.innerHTML;
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "h1", "h2", "h3", "code", "del", "blockquote", "ul", "li"],
      ALLOWED_ATTR: [],
    });
    contentRef.current = sanitized;
    onUpdate(sanitized);
    setShowToolbar(false);
  }, [onUpdate, isReadOnly]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }, [isReadOnly]);

  const handleMouseUp = useCallback(() => {
    if (isReadOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !divRef.current) {
      setShowToolbar(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!divRef.current.contains(range.commonAncestorContainer)) {
      setShowToolbar(false);
      return;
    }
    const rect = range.getBoundingClientRect();
    const parentRect = divRef.current.parentElement?.getBoundingClientRect();
    if (parentRect) {
      setToolbarPos({
        top: rect.top - parentRect.top - 36,
        left: rect.left - parentRect.left + rect.width / 2,
      });
    }
    setShowToolbar(true);
  }, [isReadOnly]);

  const exec = useCallback((command: string) => {
    document.execCommand(command, false);
    divRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (isReadOnly) return;
    const el = divRef.current;
    if (!el) return;

    const text = el.innerText || "";
    const html = el.innerHTML;

    // Markdown block conversion
    const blockMatch = text.match(/^(#{1,3}|[->])\s/);
    if (blockMatch) {
      let converted: string | null = null;
      if (/^### (.+)/.test(text)) converted = text.replace(/^### (.+)/, "<h3>$1</h3>");
      else if (/^## (.+)/.test(text)) converted = text.replace(/^## (.+)/, "<h2>$1</h2>");
      else if (/^# (.+)/.test(text)) converted = text.replace(/^# (.+)/, "<h1>$1</h1>");
      else if (/^- (.+)/.test(text)) converted = text.replace(/^- (.+)/, "<ul><li>$1</li></ul>");
      else if (/^> (.+)/.test(text)) converted = text.replace(/^> (.+)/, "<blockquote>$1</blockquote>");

      if (converted && converted !== html) {
        const pos = saveCaret(el);
        el.innerHTML = converted;
        restoreCaret(el, Math.min(pos, el.innerText.length));
        contentRef.current = converted;
        return;
      }
    }

    // Inline Markdown conversion
    if (/[*`~]/.test(text) && !/<[^>]+>/.test(html)) {
      const converted = text
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>");

      if (converted !== text) {
        const pos = saveCaret(el);
        el.innerHTML = converted;
        restoreCaret(el, Math.min(pos, el.innerText.length));
        contentRef.current = converted;
        return;
      }
    }

    contentRef.current = html;
  }, []);

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={divRef}
        contentEditable={!isReadOnly}
        suppressContentEditableWarning
        className={cn(
          "outline-none text-base text-text-primary py-0.5 px-1 rounded",
          isReadOnly && "cursor-default"
        )}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        onInput={handleInput}
      />
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-50 flex items-center gap-0.5 bg-surface border border-border rounded-lg shadow-lg px-1.5 py-1"
          style={{ top: toolbarPos.top, left: toolbarPos.left, transform: "translateX(-50%)" }}
        >
          <button className="p-1 rounded-lg hover:bg-hover transition-colors" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}>
            <span className="text-xs font-bold text-text-primary">B</span>
          </button>
          <button className="p-1 rounded-lg hover:bg-hover transition-colors" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}>
            <span className="text-xs italic text-text-primary">I</span>
          </button>
          <button className="p-1 rounded-lg hover:bg-hover transition-colors" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}>
            <span className="text-xs underline text-text-primary">U</span>
          </button>
        </div>
      )}
    </div>
  );
}
