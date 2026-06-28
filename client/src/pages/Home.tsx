import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/format";
import { AlertTriangle, Wallet, Building2, Flame, CalendarClock, Check, Users } from "lucide-react";
import type { ClientReminder } from "@shared/schema";

interface DashboardSummary {
  activeCount: number;
  overdueCount: number;
  overdueTotal: number;
  completedCount: number;
  totalCount: number;
}

interface ReminderWithClient extends ClientReminder {
  clientName: string;
}

interface RemindersSummary {
  burning: ReminderWithClient[];
  upcoming: ReminderWithClient[];
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Срочно",
  normal: "Обычная",
  low: "Не срочно",
};

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  urgent: "bg-red-600 text-white no-default-hover-elevate",
  normal: "bg-amber-500 text-white no-default-hover-elevate",
  low: "bg-sky-600 text-white no-default-hover-elevate",
};

function ReminderRow({ reminder }: { reminder: ReminderWithClient }) {
  const doneMut = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/reminders/${reminder.id}`, { status: "done" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders-summary"] });
    },
  });

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm" data-testid={`row-home-reminder-${reminder.id}`}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={PRIORITY_BADGE_CLASS[reminder.priority] ?? PRIORITY_BADGE_CLASS.normal}>
            {PRIORITY_LABEL[reminder.priority] ?? reminder.priority}
          </Badge>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Users className="w-3 h-3" />
            {reminder.clientName}
          </span>
          {reminder.dueDate && <span className="text-muted-foreground text-xs">до {formatDate(reminder.dueDate)}</span>}
        </div>
        <p className="truncate">{reminder.text}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={() => doneMut.mutate()}
        aria-label="Отметить выполненным"
        data-testid={`button-home-done-reminder-${reminder.id}`}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function Home() {
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["/api/admin/dashboard-summary"],
  });
  const { data: reminders } = useQuery<RemindersSummary>({
    queryKey: ["/api/admin/reminders-summary"],
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Главная</h1>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="grid-home-summary">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-semibold" data-testid="text-home-active-count">{summary.activeCount}</div>
                <div className="text-sm text-muted-foreground">Активных объектов</div>
              </div>
            </CardContent>
          </Card>
          <Card className={summary.overdueCount > 0 ? "border-destructive/50" : undefined}>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 ${summary.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <div className="text-2xl font-semibold" data-testid="text-home-overdue-count">{summary.overdueCount}</div>
                <div className="text-sm text-muted-foreground">С долгом по оплате</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-semibold" data-testid="text-home-overdue-total">{formatCurrency(summary.overdueTotal)}</div>
                <div className="text-sm text-muted-foreground">Общий долг по объектам</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={reminders && reminders.burning.length > 0 ? "border-destructive/50" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-5 h-5 text-destructive" />
            Горящее
            {reminders && reminders.burning.length > 0 && (
              <Badge className="bg-destructive text-destructive-foreground no-default-hover-elevate">{reminders.burning.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!reminders || reminders.burning.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-burning">Нет срочных напоминаний</p>
          ) : (
            reminders.burning.map((r) => <ReminderRow key={r.id} reminder={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-muted-foreground" />
            На неделю
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!reminders || reminders.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-upcoming">Нет напоминаний на ближайшую неделю</p>
          ) : (
            reminders.upcoming.map((r) => <ReminderRow key={r.id} reminder={r} />)
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild data-testid="button-home-to-clients">
        <Link href="/cabinet/clients">Все клиенты и напоминания →</Link>
      </Button>
    </div>
  );
}
