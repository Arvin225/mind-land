const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function yearToChinese(year: number): string {
  return String(year)
    .split("")
    .map((d) => CN_DIGITS[+d])
    .join("");
}

function monthToChinese(month: number): string {
  const digits = String(month).split("").map((d) => CN_DIGITS[+d]);
  if (month >= 10 && month <= 19) {
    return month === 10 ? "十" : `十${digits[1]}`;
  }
  return digits.join("");
}

export function toYearMonthKey(d: Date): string {
  return `${yearToChinese(d.getFullYear())}年${monthToChinese(d.getMonth() + 1)}月`;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export function toWeekday(d: Date): [string, string] {
  const w = WEEKDAYS[d.getDay()];
  return [w[0], w[1]];
}

export function toDay(d: Date): string {
  return `${d.getDate()}日`;
}

export function toTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export interface DiaryGroup {
  yearMonth: string;
  entries: { entry: any; date: Date }[];
}

export function groupByYearMonth(
  entries: any[],
  getDate: (e: any) => Date
): DiaryGroup[] {
  const map = new Map<string, any[]>();
  for (const e of entries) {
    const d = getDate(e);
    const key = toYearMonthKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ entry: e, date: d });
  }
  const groups: DiaryGroup[] = [];
  for (const [key, items] of map) {
    groups.push({ yearMonth: key, entries: items });
  }
  groups.sort((a, b) => {
    const da = a.entries[0].date.getTime();
    const db = b.entries[0].date.getTime();
    return db - da;
  });
  return groups;
}
