import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import type { ClientReminder } from "@shared/schema";

interface ReminderWithClient extends ClientReminder {
  clientName: string;
  projectName: string | null;
  assignedToName: string | null;
}

const PRIORITY_DOT_CLASS: Record<string, string> = {
  urgent: "bg-red-600",
  normal: "bg-amber-500",
  low: "bg-sky-600",
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RemindersCalendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const { data: reminders, isLoading } = useQuery<ReminderWithClient[]>({
    queryKey: ["/api/admin/reminders"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const byDate = new Map<string, ReminderWithClient[]>();
  for (const r of reminders ?? []) {
    if (!r.dueDate) continue;
    const list = byDate.get(r.dueDate) ?? [];
    list.push(r);
    byDate.set(r.dueDate, list);
  }

  const days = buildMonthGrid(year, month);
  const todayIso = toIsoDate(new Date());

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <CalendarDays className="w-6 h-6" />
          Календарь напоминаний
        </h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))} data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center" data-testid="text-current-month">
            {cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
          </span>
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))} data-testid="button-next-month">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" asChild data-testid="link-reminders-list">
            <Link href="/cabinet/reminders">
              <List className="w-4 h-4 mr-1" />
              Список
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" data-testid="grid-calendar">
        {days.map((d) => {
          const iso = toIsoDate(d);
          const inMonth = d.getMonth() === month;
          const dayReminders = byDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={`min-h-24 rounded-md border p-1 space-y-1 ${inMonth ? "" : "opacity-40"} ${iso === todayIso ? "border-primary" : ""}`}
              data-testid={`cell-day-${iso}`}
            >
              <div className="text-xs text-muted-foreground">{d.getDate()}</div>
              {dayReminders.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center gap-1 text-[11px] leading-tight" data-testid={`event-reminder-${r.id}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT_CLASS[r.priority] ?? PRIORITY_DOT_CLASS.normal}`} />
                  <span className={`truncate ${r.status === "done" ? "line-through text-muted-foreground" : ""}`}>{r.clientName}: {r.text}</span>
                </div>
              ))}
              {dayReminders.length > 3 && (
                <Badge variant="outline" className="text-[10px]" data-testid={`badge-more-${iso}`}>
                  +{dayReminders.length - 3}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
