import { toDay, toTime, toWeekday } from "./dateFormat";

interface DiaryCardProps {
  entry: any;
  date: Date;
  selected: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export default function DiaryCard({ entry, date, selected, onClick, onContextMenu }: DiaryCardProps) {
  const summary = stripHtml(entry.content).slice(0, 100);
  const day = toDay(date);
  const time = toTime(date);
  const [zhou, yi] = toWeekday(date);

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        flex items-stretch gap-0 py-4 px-4 rounded-lg cursor-pointer select-none
        transition-colors duration-150 mx-4
        ${selected ? "bg-hover" : "hover:bg-hover"}
      `}
    >
      <div className="flex flex-col items-end justify-center shrink-0 w-[50px] pr-1">
        <span className="text-lg font-bold text-[--foreground] leading-tight">
          {day}
        </span>
        <span className="text-[11px] text-[--foreground]/50 leading-tight mt-0.5">
          {time}
        </span>
      </div>

      <div className="flex flex-col justify-center items-center shrink-0 w-[16px] text-[11px] text-[--foreground]/40 leading-tight">
        <span>{zhou}</span>
        <span>{yi}</span>
      </div>

      <div className="flex-1 min-w-0 flex items-start pl-4 pr-4">
        <p className="text-sm text-[--foreground]/70 leading-relaxed whitespace-pre-wrap line-clamp-2">
          {summary || ""}
        </p>
      </div>
    </div>
  );
}
