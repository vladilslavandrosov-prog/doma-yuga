import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, overdueUrgencyClass, addDaysToToday } from "@/lib/format";
import { Bell, Users, Check, RotateCcw, Pencil, Trash2, Loader2, Clock, History, CalendarDays } from "lucide-react";
import type { ClientReminder } from "@shared/schema";
import { ReminderHistoryDialog } from "@/components/ReminderHistoryDialog";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { PRIORITY_LABEL, PRIORITY_BADGE_CLASS, RECURRENCE_LABEL } from "@/lib/reminderConstants";

interface ReminderWithClient extends ClientReminder {
  clientName: string;
  projectName: string | null;
  assignedToName: string | null;
  recurrence: string;
}

export default function Reminders() {
  const { toast } = useToast();
  const { isStaff } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editRecurrence, setEditRecurrence] = useState("none");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);

  const { data: reminders, isLoading } = useQuery<ReminderWithClient[]>({
    queryKey: ["/api/admin/reminders"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/reminders/${id}`, data);
      if (!res.ok) throw new Error("Ошибка обновления");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders-summary"] });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить напоминание", variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/reminders/${id}`);
      if (!res.ok) throw new Error("Ошибка удаления");
      return id;
    },
    onSuccess: (id: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders-summary"] });
      if (editingId === id) resetEdit();
      if (resolvingId === id) { setResolvingId(null); setResolutionNote(""); }
    },
  });

  const resetEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditDueDate("");
    setEditPriority("normal");
    setEditRecurrence("none");
  };

  const startEdit = (r: ReminderWithClient) => {
    setResolvingId(null);
    setResolutionNote("");
    setEditingId(r.id);
    setEditText(r.text);
    setEditDueDate(r.dueDate ?? "");
    setEditPriority(r.priority);
    setEditRecurrence(r.recurrence ?? "none");
  };

  const saveEdit = (id: number) => {
    if (!editText.trim()) {
      toast({ title: "Введите текст напоминания", variant: "destructive" });
      return;
    }
    updateMut.mutate(
      { id, data: { text: editText.trim(), dueDate: editDueDate || null, priority: editPriority, recurrence: editRecurrence } },
      { onSuccess: () => { resetEdit(); toast({ title: "Изменения сохранены" }); } },
    );
  };

  const startResolve = (r: ReminderWithClient) => {
    resetEdit();
    setResolvingId(r.id);
    setResolutionNote("");
  };

  const confirmResolve = (id: number, quality: "good" | "bad") => {
    updateMut.mutate(
      { id, data: { status: "done", resolutionNote: resolutionNote.trim() || null, resolutionQuality: quality } },
      { onSuccess: () => { setResolvingId(null); setResolutionNote(""); } },
    );
  };

  const reopen = (id: number) => {
    updateMut.mutate({ id, data: { status: "pending", resolutionNote: null, resolutionQuality: null } });
  };

  const snooze = (id: number, days: number) => {
    updateMut.mutate({ id, data: { dueDate: addDaysToToday(days) } });
  };

  const assigneeOptions = Array.from(
    new Map((reminders ?? []).filter((r) => r.assignedToUserId != null).map((r) => [r.assignedToUserId as number, r.assignedToName ?? String(r.assignedToUserId)])).entries(),
  );

  const query = searchQuery.trim().toLowerCase();
  const filtered = (reminders ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && String(r.assignedToUserId ?? "") !== assigneeFilter) return false;
    if (query && !r.text.toLowerCase().includes(query) && !r.clientName.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <Bell className="w-6 h-6" />
          Напоминания
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild data-testid="link-reminders-calendar">
            <Link href="/cabinet/reminders/calendar">
              <CalendarDays className="w-4 h-4 mr-1" />
              Календарь
            </Link>
          </Button>
          {(["pending", "done", "all"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              data-testid={`button-filter-${s}`}
            >
              {s === "pending" ? "Активные" : s === "done" ? "Выполненные" : "Все"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Поиск по тексту или клиенту"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-reminders"
        />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40" data-testid="select-filter-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все приоритеты</SelectItem>
            <SelectItem value="urgent">{PRIORITY_LABEL.urgent}</SelectItem>
            <SelectItem value="normal">{PRIORITY_LABEL.normal}</SelectItem>
            <SelectItem value="low">{PRIORITY_LABEL.low}</SelectItem>
          </SelectContent>
        </Select>
        {!isStaff && assigneeOptions.length > 0 && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-44" data-testid="select-filter-assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все исполнители</SelectItem>
              {assigneeOptions.map(([id, name]) => (
                <SelectItem key={id} value={String(id)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="text-no-reminders">Напоминаний нет</p>
      )}

      <div className="space-y-2" data-testid="list-all-reminders">
        {filtered.map((r) => (
          <Card
            key={r.id}
            data-testid={`row-reminder-${r.id}`}
            className={r.status === "pending" ? overdueUrgencyClass(r.dueDate) : undefined}
          >
            <CardContent className="p-3 space-y-2">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} data-testid={`input-edit-text-${r.id}`} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      data-testid={`input-edit-due-date-${r.id}`}
                    />
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger data-testid={`select-edit-priority-${r.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Важно</SelectItem>
                        <SelectItem value="normal">Обычно</SelectItem>
                        <SelectItem value="low">Не важно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={editRecurrence} onValueChange={setEditRecurrence}>
                    <SelectTrigger data-testid={`select-edit-recurrence-${r.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{RECURRENCE_LABEL.none}</SelectItem>
                      <SelectItem value="weekly">{RECURRENCE_LABEL.weekly}</SelectItem>
                      <SelectItem value="monthly">{RECURRENCE_LABEL.monthly}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(r.id)} disabled={updateMut.isPending} data-testid={`button-save-edit-${r.id}`}>
                      {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить изменения"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetEdit} data-testid={`button-cancel-edit-${r.id}`}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={PRIORITY_BADGE_CLASS[r.priority] ?? PRIORITY_BADGE_CLASS.normal}>
                        {PRIORITY_LABEL[r.priority] ?? r.priority}
                      </Badge>
                      <span className="text-muted-foreground text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {r.clientName}
                      </span>
                      {r.dueDate && <span className="text-muted-foreground text-xs">до {formatDate(r.dueDate)}</span>}
                      {r.projectName && <span className="text-muted-foreground text-xs">{r.projectName}</span>}
                      {r.assignedToName && <Badge variant="outline" data-testid={`badge-assignee-${r.id}`}>{r.assignedToName}</Badge>}
                      {r.recurrence && r.recurrence !== "none" && (
                        <Badge variant="outline" data-testid={`badge-recurrence-${r.id}`}>{RECURRENCE_LABEL[r.recurrence] ?? r.recurrence}</Badge>
                      )}
                      <Badge variant="outline">{r.status === "done" ? "Выполнено" : "В работе"}</Badge>
                    </div>
                    <p className={r.status === "done" ? "line-through" : ""}>{r.text}</p>
                    {r.status === "pending" ? (
                      <div className="flex items-center gap-1 pt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {[1, 3].map((days) => (
                          <Button
                            key={days}
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => snooze(r.id, days)}
                            data-testid={`button-snooze-${days}-${r.id}`}
                          >
                            +{days} дн.
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {r.status === "done" && r.resolutionNote ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {r.resolutionQuality === "good" ? (
                          <Badge className="bg-green-100 text-green-700">Хорошо</Badge>
                        ) : r.resolutionQuality === "bad" ? (
                          <Badge className="bg-red-100 text-red-700">Плохо</Badge>
                        ) : null}
                        {r.resolutionNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setHistoryId(r.id)}
                      aria-label="История изменений"
                      data-testid={`button-history-reminder-${r.id}`}
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    {r.status === "pending" ? (
                      <>
                        {!isStaff && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(r)}
                            aria-label="Изменить напоминание"
                            data-testid={`button-edit-reminder-${r.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startResolve(r)}
                          aria-label="Отметить выполненным"
                          data-testid={`button-resolve-reminder-${r.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => reopen(r.id)}
                        aria-label="Вернуть в работу"
                        data-testid={`button-reopen-reminder-${r.id}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!isStaff && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => deleteMut.mutate(r.id)}
                        aria-label="Удалить напоминание"
                        data-testid={`button-delete-reminder-${r.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {resolvingId === r.id && (
                <div className="rounded-md border p-2 space-y-2 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Как прошло: «{r.text}»?</p>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Комментарий по результату (необязательно)"
                    data-testid={`input-resolution-note-${r.id}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => confirmResolve(r.id, "good")}
                      data-testid={`button-resolve-good-${r.id}`}
                    >
                      Хорошо
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmResolve(r.id, "bad")}
                      data-testid={`button-resolve-bad-${r.id}`}
                    >
                      Плохо
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setResolvingId(null); setResolutionNote(""); }}
                      data-testid={`button-resolve-cancel-${r.id}`}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ReminderHistoryDialog reminderId={historyId} onClose={() => setHistoryId(null)} />
    </div>
  );
}
