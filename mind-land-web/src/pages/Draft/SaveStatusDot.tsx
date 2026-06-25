import type { SaveStatus } from "@/store/modules/draftStore";

interface Props {
    status: SaveStatus;
}

export default function SaveStatusDot({ status }: Props) {
    const color =
        status === "saved" ? "bg-emerald-400" :
        status === "saving" ? "bg-amber-400 animate-pulse" :
        status === "unsaved" ? "bg-orange-400" :
        status === "error" ? "bg-gray-400" :
        "bg-transparent";
    const label =
        status === "saved" ? "已保存" :
        status === "saving" ? "保存中" :
        status === "unsaved" ? "未保存" :
        status === "error" ? "保存失败" :
        "";
    return (
        <div className="flex items-center gap-1.5" title={label}>
            <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
            {label && <span className="text-xs text-text-muted">{label}</span>}
        </div>
    );
}
