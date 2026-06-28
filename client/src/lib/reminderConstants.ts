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
