export const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Важно",
  normal: "Обычно",
  low: "Не важно",
};

export const PRIORITY_BADGE_CLASS: Record<string, string> = {
  urgent: "bg-red-600 text-white no-default-hover-elevate",
  normal: "bg-amber-500 text-white no-default-hover-elevate",
  low: "bg-sky-600 text-white no-default-hover-elevate",
};

export const PRIORITY_DOT_CLASS: Record<string, string> = {
  urgent: "bg-red-600",
  normal: "bg-amber-500",
  low: "bg-sky-600",
};

export const RECURRENCE_LABEL: Record<string, string> = {
  none: "Не повторять",
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
};

const MONTHS_RU: Record<string, number> = {
  "январ": 0, "феврал": 1, "март": 2, "апрел": 3, "ма": 4, "июн": 5,
  "июл": 6, "август": 7, "сентябр": 8, "октябр": 9, "ноябр": 10, "декабр": 11,
};

const WEEKDAYS_RU: Record<string, number> = {
  "понедельник": 1, "вторник": 2, "сред": 3, "четверг": 4,
  "пятниц": 5, "суббот": 6, "воскресень": 0,
};

// Разбирает голосовую фразу вида «позвонить заказчику до 5 июля, важно — согласовать смету»
// на дату исполнения, важность и сохраняет полный исходный текст.
export function parseReminderTranscript(transcript: string): { text: string; dueDate: string | null; priority: string } {
  const lower = transcript.toLowerCase();

  let priority = "normal";
  if (/не\s*важно|неважно|когда-нибудь/.test(lower)) priority = "low";
  else if (/\bважно\b|срочно|критично/.test(lower)) priority = "urgent";

  let dueDate: string | null = null;
  const inDaysMatch = lower.match(/через\s+(\d+)\s*д(?:ень|ня|ней)/);
  const dayMonthMatch = lower.match(/(\d{1,2})\s*(январ\w*|феврал\w*|март\w*|апрел\w*|ма[яй]\w*|июн\w*|июл\w*|август\w*|сентябр\w*|октябр\w*|ноябр\w*|декабр\w*)/);
  const weekdayMatch = lower.match(/понедельник|вторник|сред\w*|четверг|пятниц\w*|суббот\w*|воскресень\w*/);

  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthWord = dayMonthMatch[2];
    const monthKey = Object.keys(MONTHS_RU).find((k) => monthWord.startsWith(k));
    if (monthKey !== undefined && day >= 1 && day <= 31) {
      const month = MONTHS_RU[monthKey];
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, month, day);
      if (candidate.getTime() < now.setHours(0, 0, 0, 0)) year += 1;
      dueDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  } else if (/послезавтра/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    dueDate = d.toISOString().slice(0, 10);
  } else if (/завтра/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dueDate = d.toISOString().slice(0, 10);
  } else if (inDaysMatch) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(inDaysMatch[1], 10));
    dueDate = d.toISOString().slice(0, 10);
  } else if (/через неделю/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    dueDate = d.toISOString().slice(0, 10);
  } else if (/через месяц/.test(lower)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    dueDate = d.toISOString().slice(0, 10);
  } else if (weekdayMatch) {
    const key = Object.keys(WEEKDAYS_RU).find((k) => weekdayMatch[0].startsWith(k));
    if (key !== undefined) {
      const target = WEEKDAYS_RU[key];
      const d = new Date();
      const diff = (target - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      dueDate = d.toISOString().slice(0, 10);
    }
  } else if (/сегодня/.test(lower)) {
    dueDate = new Date().toISOString().slice(0, 10);
  }

  return { text: transcript.trim(), dueDate, priority };
}
