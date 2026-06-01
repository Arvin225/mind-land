import { X } from "lucide-react";

interface ShortcutHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "Enter", desc: "新建同级节点" },
  { keys: "Tab", desc: "缩进" },
  { keys: "Shift + Tab", desc: "提升" },
  { keys: "Backspace", desc: "删除空节点" },
  { keys: "Delete", desc: "删除节点" },
  { keys: "Ctrl + Z", desc: "撤销" },
  { keys: "Ctrl + Shift + Z / Ctrl + Y", desc: "重做" },
  { keys: "Ctrl + B / Ctrl + I / Ctrl + U", desc: "加粗 / 斜体 / 下划线" },
  { keys: "Alt + ↑ / Alt + ↓", desc: "上移 / 下移" },
  { keys: "Ctrl + [", desc: "退出聚焦" },
  { keys: "Ctrl + F", desc: "搜索" },
  { keys: "Ctrl + /", desc: "快捷键列表" },
  { keys: "Ctrl + S", desc: "强制保存" },
  { keys: "Esc", desc: "关闭面板 / 退出聚焦" },
];

export default function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl p-5 w-[440px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-text-primary">快捷键</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left py-1.5 pr-4 font-medium">按键</th>
              <th className="text-left py-1.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ keys, desc }) => (
              <tr key={keys} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4">
                  <kbd className="inline-block px-1.5 py-0.5 bg-background border border-border rounded text-text-primary text-[11px] font-mono whitespace-nowrap">
                    {keys}
                  </kbd>
                </td>
                <td className="py-2 text-text-secondary">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
