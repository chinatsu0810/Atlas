// 「集まる」の日付の計算。日付は 'YYYY-MM-DD' の文字列で扱う（DBの date 列と同じ形）。
// 「今日」は日本時間で数える。開催日は現地の日付だが、一覧の区切りに使うだけなので、数時間のずれは気にしない。

const WEEKDAYS = '日月火水木金土';

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayInJapan(): string {
  // en-CA の書式は YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(
    new Date()
  );
}

export function addDays(date: string, days: number): string {
  const result = toUtcDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return toDateString(result);
}

// months か月前後の同じ日。その月に同じ日がなければ月末（例: 3月31日の1か月前は2月28日）
export function addMonths(date: string, months: number): string {
  const base = toUtcDate(date);
  const target = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1)
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(base.getUTCDate(), lastDay));
  return toDateString(target);
}

// その月の1日。offset で前後の月にずらす
export function monthStart(date: string, offset = 0): string {
  const base = toUtcDate(date);
  return toDateString(
    new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1))
  );
}

// 今週末（土・日）。日曜日なら、前日の土曜日からの2日間
export function weekendRange(today: string): [string, string] {
  const weekday = toUtcDate(today).getUTCDay();
  const saturday = weekday === 0 ? addDays(today, -1) : addDays(today, 6 - weekday);
  return [saturday, addDays(saturday, 1)];
}

// これから開催されるイベントの最初の日。
// 日本より時差が遅い国のために、日本時間の前日に開催されたものまで「これから」に含める
export function firstUpcomingDate(): string {
  return addDays(todayInJapan(), -1);
}

export function isEndedEvent(eventDate: string): boolean {
  return eventDate < firstUpcomingDate();
}

export function dateParts(date: string) {
  const value = toUtcDate(date);
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    weekday: WEEKDAYS[value.getUTCDay()],
  };
}

export function formatEventDate(date: string): string {
  const { year, month, day, weekday } = dateParts(date);
  return `${year}年${month}月${day}日（${weekday}）`;
}
