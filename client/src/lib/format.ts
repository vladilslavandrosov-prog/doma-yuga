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
