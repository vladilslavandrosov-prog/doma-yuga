import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Client, ClientReminder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, overdueUrgencyClass, addDaysToToday } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { MapPin, Calendar, CheckCircle2, Clock, CircleDot, ChevronRight, FolderKanban, User, Plus, Loader2, Pencil, Trash2, Search, Filter, HelpCircle, AlertTriangle, Wallet, Building2, QrCode, Download, Bell, Check, X, History, Mic, MicOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import QRCode from "qrcode";
import { OnboardingTour, startOnboardingTour, type TourStep } from "@/components/OnboardingTour";
import { ReminderHistoryDialog } from "@/components/ReminderHistoryDialog";
import { PRIORITY_LABEL, PRIORITY_BADGE_CLASS, RECURRENCE_LABEL, parseReminderTranscript } from "@/lib/reminderConstants";

const PROJECTS_TOUR_STEPS: TourStep[] = [
  { target: "text-projects-title", title: "Объекты", description: "Здесь собраны все строительные объекты компании — карточки, статусы и быстрый доступ к каждому из них." },
  { target: "button-add-project", title: "Новый объект", description: "Создайте новый объект, привязав его к клиенту, адресу и дате начала работ." },
  { target: "input-search-projects", title: "Поиск", description: "Быстро найдите нужный объект по названию." },
  { target: "select-status-filter", title: "Фильтр по статусу", description: "Показывайте только активные объекты или все сразу." },
  { target: "grid-projects", title: "Карточки объектов", description: "Кликните по карточке, чтобы открыть личный кабинет объекта — прогресс, оплаты, документы и переписку." },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default"><CircleDot className="w-3 h-3 mr-1" />Активен</Badge>;
    case "completed":
      return <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Завершён</Badge>;
    case "paused":
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Приостановлен</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function ProjectCard({ project, isAdmin, debtAmount, onEdit, onDelete, onShowQr, onShowReminders }: { project: Project; isAdmin: boolean; debtAmount: number; onEdit: (p: Project) => void; onDelete: (p: Project) => void; onShowQr: (p: Project) => void; onShowReminders: (p: Project) => void }) {
  const hasDebt = debtAmount > 0;
  const { data: client } = useQuery<Client>({
    queryKey: ["/api/project", project.id, "client"],
  });

  return (
    <Card className={`hover-elevate h-full relative ${hasDebt ? "border-destructive/50" : ""}`} data-testid={`card-project-${project.id}`}>
      {isAdmin && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShowReminders(project); }}
            data-testid={`button-reminders-project-${project.id}`}
          >
            <Bell className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShowQr(project); }}
            data-testid={`button-qr-project-${project.id}`}
          >
            <QrCode className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
            data-testid={`button-edit-project-${project.id}`}
          >
            <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
            data-testid={`button-delete-project-${project.id}`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      )}
      <Link href={`/cabinet/project/${project.id}`}>
        <div className="cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pr-36">
            <CardTitle className="text-base font-medium truncate min-w-0" data-testid={`text-project-name-${project.id}`}>
              {project.name}
            </CardTitle>
            <div className="shrink-0 flex items-center gap-1">
              {hasDebt && <AlertTriangle className="w-4 h-4 text-destructive" data-testid={`icon-debt-${project.id}`} />}
              {getStatusBadge(project.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{project.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Начало: {formatDate(project.startDate)}</span>
            </div>
            {client && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span>{client.name}</span>
              </div>
            )}
            {hasDebt && (
              <div className="flex items-center gap-2 text-sm text-destructive" data-testid={`text-debt-${project.id}`}>
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Долг по оплате: {formatCurrency(debtAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-end pt-1">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}

interface DashboardSummary {
  activeCount: number;
  overdueCount: number;
  overdueTotal: number;
  completedCount: number;
  totalCount: number;
}

function AdminDashboardSummary() {
  const { data } = useQuery<DashboardSummary>({
    queryKey: ["/api/admin/dashboard-summary"],
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="grid-dashboard-summary">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          <div>
            <div className="text-2xl font-semibold" data-testid="text-summary-active-count">{data.activeCount}</div>
            <div className="text-sm text-muted-foreground">Активных объектов</div>
          </div>
        </CardContent>
      </Card>
      <Card className={data.overdueCount > 0 ? "border-destructive/50" : undefined}>
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className={`w-8 h-8 ${data.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          <div>
            <div className="text-2xl font-semibold" data-testid="text-summary-overdue-count">{data.overdueCount}</div>
            <div className="text-sm text-muted-foreground">С долгом по оплате</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-primary" />
          <div>
            <div className="text-2xl font-semibold" data-testid="text-summary-overdue-total">{formatCurrency(data.overdueTotal)}</div>
            <div className="text-sm text-muted-foreground">Общий долг по объектам</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectQrDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const targetUrl = project ? `${window.location.origin}/cabinet/project/${project.id}/photos` : "";

  useEffect(() => {
    if (project) {
      QRCode.toDataURL(targetUrl, { width: 320, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(null));
    }
  }, [project?.id]);

  return (
    <Dialog
      open={!!project}
      onOpenChange={(open) => {
        if (!open) {
          setDataUrl(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR-код объекта</DialogTitle>
        </DialogHeader>
        {project && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">{project.name}</p>
            {dataUrl ? (
              <img src={dataUrl} alt="QR-код" className="w-64 h-64" data-testid="img-project-qr" />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Сканируйте на объекте, чтобы быстро открыть фотоотчёт
            </p>
            {dataUrl && (
              <a href={dataUrl} download={`qr-${project.name}.png`} className="w-full">
                <Button variant="outline" className="w-full" data-testid="button-download-qr">
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StaffMember {
  id: number;
  username: string;
}

function ProjectReminderDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { toast } = useToast();
  const [manualText, setManualText] = useState("");
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualPriority, setManualPriority] = useState("normal");
  const [manualAssigneeId, setManualAssigneeId] = useState<string>("none");
  const [manualRecurrence, setManualRecurrence] = useState<string>("none");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const handledResultRef = useRef(false);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechRecognitionCtor =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const { data: reminders } = useQuery<ClientReminder[]>({
    queryKey: ["/api/admin/projects", project?.id, "reminders"],
    enabled: !!project,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: staff } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/staff"],
    enabled: !!project,
  });

  const sortedReminders = (reminders ?? []).slice().sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });

  const resetForm = () => {
    setManualText("");
    setManualDueDate("");
    setManualPriority("normal");
    setManualAssigneeId("none");
    setManualRecurrence("none");
    setEditingId(null);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", project?.id, "reminders"] });
  };

  const createMut = useMutation({
    mutationFn: async (data: { text: string; dueDate: string | null; priority: string; assignedToUserId?: number | null; recurrence?: string }) => {
      const res = await apiRequest("POST", `/api/admin/projects/${project!.id}/reminders`, data);
      if (!res.ok) throw new Error("Ошибка создания напоминания");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      resetForm();
      toast({ title: "Напоминание сохранено" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить напоминание", variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/reminders/${id}`, data);
      if (!res.ok) throw new Error("Ошибка обновления");
      return res.json();
    },
    onSuccess: () => invalidate(),
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
      invalidate();
      if (editingId === id) resetForm();
      if (resolvingId === id) { setResolvingId(null); setResolutionNote(""); }
    },
  });

  const startEdit = (r: ClientReminder) => {
    setResolvingId(null);
    setResolutionNote("");
    setEditingId(r.id);
    setManualText(r.text);
    setManualDueDate(r.dueDate ?? "");
    setManualPriority(r.priority);
    setManualAssigneeId(r.assignedToUserId != null ? String(r.assignedToUserId) : "none");
    setManualRecurrence(r.recurrence ?? "none");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) {
      toast({ title: "Введите текст напоминания", variant: "destructive" });
      return;
    }
    const assignedToUserId = manualAssigneeId === "none" ? null : parseInt(manualAssigneeId);
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: { text: manualText.trim(), dueDate: manualDueDate || null, priority: manualPriority, assignedToUserId, recurrence: manualRecurrence } },
        { onSuccess: () => { resetForm(); toast({ title: "Изменения сохранены" }); } },
      );
    } else {
      createMut.mutate({ text: manualText.trim(), dueDate: manualDueDate || null, priority: manualPriority, assignedToUserId, recurrence: manualRecurrence });
    }
  };

  const confirmResolve = (id: number, quality: "good" | "bad") => {
    updateMut.mutate(
      { id, data: { status: "done", resolutionNote: resolutionNote.trim() || null, resolutionQuality: quality } },
      { onSuccess: () => { setResolvingId(null); setResolutionNote(""); } },
    );
  };

  const handleTranscript = (transcript: string) => {
    const parsed = parseReminderTranscript(transcript);
    setManualText(parsed.text);
    setManualDueDate(parsed.dueDate ?? "");
    setManualPriority(parsed.priority);
    toast({ title: "Распознано", description: "Проверьте текст и нажмите «Добавить»" });
  };

  const toggleListening = () => {
    if (!SpeechRecognitionCtor) {
      toast({ title: "Голосовой ввод не поддерживается в этом браузере", variant: "destructive" });
      return;
    }
    if (listening) {
      if (listenTimeoutRef.current) {
        clearTimeout(listenTimeoutRef.current);
        listenTimeoutRef.current = null;
      }
      recognitionRef.current?.abort();
      setListening(false);
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
    }
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
    handledResultRef.current = false;
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      if (handledResultRef.current) return;
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        handledResultRef.current = true;
        handleTranscript(transcript);
      }
      recognition.stop();
    };
    recognition.onerror = () => {
      toast({ title: "Ошибка распознавания речи", variant: "destructive" });
      setListening(false);
    };
    recognition.onend = () => {
      if (listenTimeoutRef.current) {
        clearTimeout(listenTimeoutRef.current);
        listenTimeoutRef.current = null;
      }
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognition.start();
    setListening(true);
    listenTimeoutRef.current = setTimeout(() => {
      toast({ title: "Не удалось распознать речь", description: "Попробуйте ещё раз", variant: "destructive" });
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.abort();
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
      listenTimeoutRef.current = null;
    }, 8000);
  };

  return (
    <Dialog open={!!project} onOpenChange={(open) => { if (!open) { resetForm(); setResolvingId(null); setResolutionNote(""); setHistoryId(null); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Напоминания — {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-64 overflow-y-auto" data-testid="list-project-reminders">
          {sortedReminders.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет напоминаний</p>
          )}
          {sortedReminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-start justify-between gap-2 rounded-md border p-2 text-sm ${r.status === "done" ? "opacity-50" : overdueUrgencyClass(r.dueDate)}`}
              data-testid={`row-project-reminder-${r.id}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_BADGE_CLASS[r.priority] ?? PRIORITY_BADGE_CLASS.normal}>
                    {PRIORITY_LABEL[r.priority] ?? r.priority}
                  </Badge>
                  {r.dueDate && <span className="text-muted-foreground text-xs">до {formatDate(r.dueDate)}</span>}
                  {r.assignedToUserId != null && (
                    <Badge variant="outline" data-testid={`badge-assignee-${r.id}`}>
                      {staff?.find((s) => s.id === r.assignedToUserId)?.username ?? "Сотрудник"}
                    </Badge>
                  )}
                  {r.recurrence && r.recurrence !== "none" && (
                    <Badge variant="outline" data-testid={`badge-recurrence-${r.id}`}>{RECURRENCE_LABEL[r.recurrence] ?? r.recurrence}</Badge>
                  )}
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
                        onClick={() => updateMut.mutate({ id: r.id, data: { dueDate: addDaysToToday(days) } })}
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
                  data-testid={`button-history-project-reminder-${r.id}`}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
                {r.status === "pending" ? (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => startEdit(r)}
                      aria-label="Изменить напоминание"
                      data-testid={`button-edit-project-reminder-${r.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { resetForm(); setResolvingId(r.id); setResolutionNote(""); }}
                      aria-label="Отметить выполненным"
                      data-testid={`button-done-project-reminder-${r.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => deleteMut.mutate(r.id)}
                  aria-label="Удалить напоминание"
                  data-testid={`button-delete-project-reminder-${r.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {sortedReminders.map((r) =>
            resolvingId === r.id ? (
              <div key={`resolve-${r.id}`} className="rounded-md border p-2 space-y-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">Как прошло: «{r.text}»?</p>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Комментарий по результату (необязательно)"
                  data-testid={`input-resolution-note-project-${r.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => confirmResolve(r.id, "good")}
                    data-testid={`button-resolve-good-project-${r.id}`}
                  >
                    Хорошо
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmResolve(r.id, "bad")}
                    data-testid={`button-resolve-bad-project-${r.id}`}
                  >
                    Плохо
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setResolvingId(null); setResolutionNote(""); }}
                    data-testid={`button-resolve-cancel-project-${r.id}`}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : null
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          {SpeechRecognitionCtor && (
            <Button
              type="button"
              size="sm"
              variant={listening ? "destructive" : "outline"}
              onClick={toggleListening}
              className="w-full"
              data-testid="button-voice-project-reminder"
            >
              {listening ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
              {listening ? "Слушаю..." : "Добавить голосом"}
            </Button>
          )}
          <form
            onSubmit={handleManualSubmit}
            className={`space-y-2 ${editingId ? "rounded-md border-2 border-primary p-2 -m-2" : ""}`}
          >
            {editingId && (
              <p className="text-xs font-medium text-primary" data-testid="text-editing-project-reminder">
                Редактирование напоминания
              </p>
            )}
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Что нужно сделать по этому объекту"
              data-testid="input-project-reminder-text"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
                data-testid="input-project-reminder-due-date"
              />
              <Select value={manualPriority} onValueChange={setManualPriority}>
                <SelectTrigger data-testid="select-project-reminder-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Важно</SelectItem>
                  <SelectItem value="normal">Обычно</SelectItem>
                  <SelectItem value="low">Не важно</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {staff && staff.length > 0 && (
              <Select value={manualAssigneeId} onValueChange={setManualAssigneeId}>
                <SelectTrigger data-testid="select-project-reminder-assignee">
                  <SelectValue placeholder="Назначить сотруднику" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначено</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={manualRecurrence} onValueChange={setManualRecurrence}>
              <SelectTrigger data-testid="select-project-reminder-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{RECURRENCE_LABEL.none}</SelectItem>
                <SelectItem value="weekly">{RECURRENCE_LABEL.weekly}</SelectItem>
                <SelectItem value="monthly">{RECURRENCE_LABEL.monthly}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={(editingId ? updateMut.isPending : createMut.isPending) || !manualText.trim()}
                data-testid="button-add-project-reminder"
              >
                {(editingId ? updateMut.isPending : createMut.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Сохранить изменения"
                ) : (
                  "Добавить"
                )}
              </Button>
              {editingId ? (
                <Button type="button" size="sm" variant="ghost" onClick={resetForm} data-testid="button-cancel-edit-project-reminder">
                  Отмена
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </DialogContent>
      <ReminderHistoryDialog reminderId={historyId} onClose={() => setHistoryId(null)} />
    </Dialog>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [qrProject, setQrProject] = useState<Project | null>(null);
  const [remindersProject, setRemindersProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formClientId, setFormClientId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    enabled: isAdmin,
  });

  const { data: debtByProjectId } = useQuery<Record<number, number>>({
    queryKey: ["/api/admin/projects-debt"],
    enabled: isAdmin,
  });

  const sortedAndFiltered = useMemo(() => {
    if (!projects) return [];
    let filtered = [...projects];

    if (statusFilter === "active") {
      filtered = filtered.filter(p => p.status === "active");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const aActive = a.status === "active" ? 0 : 1;
      const bActive = b.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return filtered;
  }, [projects, searchQuery, statusFilter]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/admin/projects", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка создания");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Готово", description: "Объект создан" });
      setAddOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/projects/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/project", variables.id] });
      toast({ title: "Готово", description: "Объект обновлён" });
      if (editingProject && variables.data.status !== editingProject.status) {
        setStatusFilter("all");
      }
      setEditOpen(false);
      setEditingProject(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormName("");
    setFormAddress("");
    setFormStartDate("");
    setFormStatus("active");
    setFormClientId("");
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/projects/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Готово", description: "Объект удалён" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function handleDelete(project: Project) {
    if (confirm(`Удалить объект «${project.name}»? Это действие нельзя отменить.`)) {
      deleteMutation.mutate(project.id);
    }
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setFormName(project.name);
    setFormAddress(project.address);
    setFormStartDate(project.startDate);
    setFormStatus(project.status);
    setFormClientId(String(project.clientId || ""));
    setEditOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      address: formAddress,
      startDate: formStartDate,
      status: formStatus,
      clientId: formClientId ? parseInt(formClientId) : 0,
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;
    updateMutation.mutate({
      id: editingProject.id,
      data: {
        name: formName,
        address: formAddress,
        startDate: formStartDate,
        status: formStatus,
        clientId: formClientId ? parseInt(formClientId) : 0,
      },
    });
  }

  if (isLoading) return <ProjectsSkeleton />;

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить список объектов</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-projects-title">
            Объекты
          </h1>
          <p className="text-sm text-muted-foreground">
            Список всех строительных объектов
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="icon" variant="outline" onClick={startOnboardingTour} aria-label="Показать инструкцию" data-testid="button-show-tour">
              <HelpCircle className="w-4 h-4" />
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => { resetForm(); setAddOpen(true); }} data-testid="button-add-project">
              <Plus className="h-4 w-4 mr-2" />
              Новый объект
            </Button>
          )}
        </div>
      </div>
      {isAdmin && <OnboardingTour steps={PROJECTS_TOUR_STEPS} storageKey="tour-admin-projects-v1" />}
      {isAdmin && <AdminDashboardSummary />}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            <SelectItem value="active">Только активные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-projects">
            {searchQuery || statusFilter !== "all" ? "Ничего не найдено" : "Объекты не найдены"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-projects">
          {sortedAndFiltered.map((project) => (
            <ProjectCard key={project.id} project={project} isAdmin={isAdmin} debtAmount={debtByProjectId?.[project.id] ?? 0} onEdit={openEdit} onDelete={handleDelete} onShowQr={setQrProject} onShowReminders={setRemindersProject} />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый объект</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Название объекта *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Коттедж на Солнечной"
                required
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес *</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="г. Краснодар, ул. Солнечная, 10"
                required
                data-testid="input-project-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата начала *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                  max="2100-12-31"
                  data-testid="input-project-start-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger data-testid="select-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="paused">Приостановлен</SelectItem>
                  <SelectItem value="completed">Завершён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {clients && clients.length > 0 && (
              <div className="space-y-2">
                <Label>Клиент</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger data-testid="select-project-client">
                    <SelectValue placeholder="Не назначать" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Не назначать</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-project">
              {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Создать объект"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingProject(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование объекта</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Название объекта *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                data-testid="input-edit-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес *</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
                data-testid="input-edit-project-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата начала *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                  max="2100-12-31"
                  data-testid="input-edit-project-start-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger data-testid="select-edit-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="paused">Приостановлен</SelectItem>
                  <SelectItem value="completed">Завершён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {clients && clients.length > 0 && (
              <div className="space-y-2">
                <Label>Клиент</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger data-testid="select-edit-project-client">
                    <SelectValue placeholder="Не назначать" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Не назначать</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-edit-project">
              {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ProjectQrDialog project={qrProject} onClose={() => setQrProject(null)} />
      <ProjectReminderDialog project={remindersProject} onClose={() => setRemindersProject(null)} />
    </div>
  );
}
