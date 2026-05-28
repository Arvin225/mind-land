import { type Editor } from "@tiptap/react";
import {
  Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Image as ImageIcon,
} from "lucide-react";
export default function Toolbar({ editor, onImageClick }: { editor: Editor; onImageClick: () => void }) {
  const btnClass = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${
      active
        ? "bg-accent/10 text-accent"
        : "text-[--foreground]/50 hover:text-[--foreground] hover:bg-accent/10"
    }`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[--border] shrink-0 flex-wrap">
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass(false)} title="撤销"><Undo2 size={14} /></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass(false)} title="重做"><Redo2 size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))} title="左对齐"><AlignLeft size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))} title="居中"><AlignCenter size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))} title="右对齐"><AlignRight size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btnClass(editor.isActive({ textAlign: "justify" }))} title="两端对齐"><AlignJustify size={14} /></button>
        <button onClick={() => editor.chain().focus().sinkListItem("listItem").run()} className={btnClass(false)} title="增加缩进"><Indent size={14} /></button>
        <button onClick={() => editor.chain().focus().liftListItem("listItem").run()} className={btnClass(false)} title="减少缩进"><Outdent size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      <div className="flex items-center gap-0.5">
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="字体颜色"
        />
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: level as any }).run();
          }}
          className="text-xs bg-transparent border border-[--border] rounded px-1 py-0.5 text-[--foreground]/70"
          title="字号"
        >
          <option value={0}>正文</option>
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="加粗"><Bold size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="斜体"><Italic size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))} title="下划线"><Underline size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))} title="删除线"><Strikethrough size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="无序列表"><List size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="有序列表"><ListOrdered size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      <div className="flex items-center gap-0.5">
        <button onClick={onImageClick} className={btnClass(false)} title="插入图片"><ImageIcon size={14} /></button>
      </div>
    </div>
  );
}
