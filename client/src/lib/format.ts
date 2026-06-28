export function formatCurrency(value: string | number, maximumFractionDigits = 0): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(num);
}

// dateStr is a date-only string (e.g. "2024-01-15") — appending T00:00:00
// makes Date parse it in local time instead of UTC, avoiding an off-by-one
// day shift in timezones west of UTC.
export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Сколько дней просрочено напоминание/задача (положительное число — просрочено,
// отрицательное — ещё есть время, 0 — срок сегодня).
export function daysOverdue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86400000);
}

// Чем дольше просрочено, тем краснее карточка напоминания.
export function overdueUrgencyClass(dueDate: string | null | undefined): string {
  const overdue = daysOverdue(dueDate);
  if (overdue === null || overdue < 0) return "";
  if (overdue === 0) return "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20";
  if (overdue <= 2) return "border-orange-500/60 bg-orange-50 dark:bg-orange-950/20";
  if (overdue <= 5) return "border-red-500/70 bg-red-50 dark:bg-red-950/30";
  return "border-red-700 bg-red-100 dark:bg-red-950/50";
}

export function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
