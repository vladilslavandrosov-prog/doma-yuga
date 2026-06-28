import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Users, Phone, Mail, KeyRound, Loader2, FolderKanban, Pencil, Trash2, HelpCircle, Bell, Mic, MicOff, Check, X, Flame, Clock } from "lucide-react";
import type { Project, ClientReminder } from "@shared/schema";
import { OnboardingTour, startOnboardingTour, type TourStep } from "@/components/OnboardingTour";
import { formatDate, overdueUrgencyClass, addDaysToToday } from "@/lib/format";

const CLIENTS_TOUR_STEPS: TourStep[] = [
  { target: "text-page-title", title: "Клиенты", description: "Список всех клиентов с доступом в личный кабинет и привязкой к их объектам." },
  { target: "button-add-client", title: "Добавить клиента", description: "Создайте учётную запись клиента и привяжите её к объекту." },
  { target: "grid-clients", title: "Карточки клиентов", description: "Здесь можно посмотреть контакты, сменить пароль или удалить клиента." },
];

const MONTHS_RU: Record<string, number> = {
  "январ": 0, "феврал": 1, "март": 2, "апрел": 3, "ма": 4, "июн": 5,
  "июл": 6, "август": 7, "сентябр": 8, "октябр": 9, "ноябр": 10, "декабр": 11,
};

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

// Разбирает голосовую фразу вида «позвонить заказчику до 5 июля, важно — согласовать смету»
// на дату исполнения, важность и сохраняет полный исходный текст.
function parseReminderTranscript(transcript: string): { text: string; dueDate: string | null; priority: string } {
  const lower = transcript.toLowerCase();

  let priority = "normal";
  if (/срочно|важно|критично/.test(lower)) priority = "urgent";
  else if (/не срочно|неважно|когда-нибудь/.test(lower)) priority = "low";

  let dueDate: string | null = null;
  const dayMonthMatch = lower.match(/(\d{1,2})\s*(январ\w*|феврал\w*|март\w*|апрел\w*|ма[яй]\w*|июн\w*|июл\w*|август\w*|сентябр\w*|октябр\w*|ноябр\w*|декабр\w*)/);
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
  } else if (/завтра/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dueDate = d.toISOString().slice(0, 10);
  } else if (/через неделю/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    dueDate = d.toISOString().slice(0, 10);
  } else if (/сегодня/.test(lower)) {
    dueDate = new Date().toISOString().slice(0, 10);
  }

  return { text: transcript.trim(), dueDate, priority };
}

function ReminderDialog({ client, onClose }: { client: ClientWithAccount | null; onClose: () => void }) {
  const { toast } = useToast();
  const [manualText, setManualText] = useState("");
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualPriority, setManualPriority] = useState("normal");
  const [manualProjectId, setManualProjectId] = useState<string>("none");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const handledResultRef = useRef(false);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const SpeechRecognitionCtor =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const { data: reminders } = useQuery<ClientReminder[]>({
    queryKey: ["/api/admin/clients", client?.id, "reminders"],
    enabled: !!client,
  });

  const sortedReminders = (reminders ?? []).slice().sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });

  const createMut = useMutation({
    mutationFn: async (data: { text: string; dueDate: string | null; priority: string; projectId?: number | null }) => {
      const res = await apiRequest("POST", `/api/admin/clients/${client!.id}/reminders`, data);
      if (!res.ok) throw new Error("Ошибка создания напоминания");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", client?.id, "reminders"] });
      setManualText("");
      setManualDueDate("");
      setManualPriority("normal");
      setManualProjectId("none");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", client?.id, "reminders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", client?.id, "reminders"] });
      if (editingId === id) resetForm();
      if (resolvingId === id) { setResolvingId(null); setResolutionNote(""); }
    },
  });

  const resetForm = () => {
    setManualText("");
    setManualDueDate("");
    setManualPriority("normal");
    setManualProjectId("none");
    setEditingId(null);
  };

  const startEdit = (r: ClientReminder) => {
    setResolvingId(null);
    setResolutionNote("");
    setEditingId(r.id);
    setManualText(r.text);
    setManualDueDate(r.dueDate ?? "");
    setManualPriority(r.priority);
    setManualProjectId(r.projectId != null ? String(r.projectId) : "none");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) {
      toast({ title: "Введите текст напоминания", variant: "destructive" });
      return;
    }
    const projectId = manualProjectId === "none" ? null : parseInt(manualProjectId);
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: { text: manualText.trim(), dueDate: manualDueDate || null, priority: manualPriority, projectId } },
        { onSuccess: () => resetForm() },
      );
    } else {
      createMut.mutate({ text: manualText.trim(), dueDate: manualDueDate || null, priority: manualPriority, projectId });
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
    createMut.mutate(parsed);
    toast({ title: "Напоминание добавлено", description: transcript });
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
    <Dialog open={!!client} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Напоминания — {client?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-64 overflow-y-auto" data-testid="list-reminders">
          {sortedReminders.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет напоминаний</p>
          )}
          {sortedReminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-start justify-between gap-2 rounded-md border p-2 text-sm ${r.status === "done" ? "opacity-50" : overdueUrgencyClass(r.dueDate)}`}
              data-testid={`row-reminder-${r.id}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_BADGE_CLASS[r.priority] ?? PRIORITY_BADGE_CLASS.normal}>
                    {PRIORITY_LABEL[r.priority] ?? r.priority}
                  </Badge>
                  {r.dueDate && <span className="text-muted-foreground text-xs">до {formatDate(r.dueDate)}</span>}
                  {r.projectId != null && (
                    <span className="text-muted-foreground text-xs">
                      {client?.projects.find((p) => p.id === r.projectId)?.name ?? "Объект"}
                    </span>
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
                {r.status === "pending" ? (
                  <>
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { resetForm(); setResolvingId(r.id); setResolutionNote(""); }}
                      aria-label="Отметить выполненным"
                      data-testid={`button-done-reminder-${r.id}`}
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
                  data-testid={`button-delete-reminder-${r.id}`}
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
            ) : null
          )}
        </div>

        <div className="border-t pt-3 space-y-3">
          {SpeechRecognitionCtor && (
            <Button
              type="button"
              size="sm"
              variant={listening ? "destructive" : "outline"}
              onClick={toggleListening}
              className="w-full"
              data-testid="button-voice-reminder"
            >
              {listening ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
              {listening ? "Слушаю..." : "Добавить голосом"}
            </Button>
          )}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Что нужно сделать"
              data-testid="input-reminder-text"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
                data-testid="input-reminder-due-date"
              />
              <Select value={manualPriority} onValueChange={setManualPriority}>
                <SelectTrigger data-testid="select-reminder-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Срочно</SelectItem>
                  <SelectItem value="normal">Обычная</SelectItem>
                  <SelectItem value="low">Не срочно</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {client && client.projects.length > 0 && (
              <Select value={manualProjectId} onValueChange={setManualProjectId}>
                <SelectTrigger data-testid="select-reminder-project">
                  <SelectValue placeholder="Привязать к объекту" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без объекта</SelectItem>
                  {client.projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={(editingId ? updateMut.isPending : createMut.isPending) || !manualText.trim()}
                data-testid="button-add-reminder"
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
                <Button type="button" size="sm" variant="ghost" onClick={resetForm} data-testid="button-cancel-edit-reminder">
                  Отмена
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ClientWithAccount {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  uid: string;
  username: string | null;
  hasAccount: boolean;
  projects: { id: number; name: string }[];
}

export default function Clients() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithAccount | null>(null);
  const [remindersClient, setRemindersClient] = useState<ClientWithAccount | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formProjectId, setFormProjectId] = useState("");

  const { data: clients, isLoading } = useQuery<ClientWithAccount[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: remindersSummary } = useQuery<{ burning: { clientId: number; text: string }[]; upcoming: { clientId: number }[] }>({
    queryKey: ["/api/admin/reminders-summary"],
    refetchInterval: 30000,
  });
  const burningByClientId = new Map<number, string[]>();
  for (const r of remindersSummary?.burning ?? []) {
    burningByClientId.set(r.clientId, [...(burningByClientId.get(r.clientId) ?? []), r.text]);
  }

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/admin/clients", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка создания");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Клиент и аккаунт созданы" });
      setAddOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/clients/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Данные клиента обновлены" });
      setEditOpen(false);
      setEditingClient(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/clients/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Клиент удалён" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function handleDelete(client: ClientWithAccount) {
    if (confirm(`Удалить клиента «${client.name}»? Это действие нельзя отменить.`)) {
      deleteMutation.mutate(client.id);
    }
  }

  function resetForm() {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormUsername("");
    setFormPassword("");
    setFormProjectId("");
  }

  function openEdit(client: ClientWithAccount) {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone || "");
    setFormEmail(client.email || "");
    setEditOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      phone: formPhone,
      email: formEmail,
      username: formUsername,
      password: formPassword,
      projectId: formProjectId || undefined,
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClient) return;
    updateMutation.mutate({
      id: editingClient.id,
      data: { name: formName, phone: formPhone, email: formEmail },
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Клиенты</h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={startOnboardingTour} aria-label="Показать инструкцию" data-testid="button-show-tour">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button onClick={() => { resetForm(); setAddOpen(true); }} data-testid="button-add-client">
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить клиента
          </Button>
        </div>
      </div>
      <OnboardingTour steps={CLIENTS_TOUR_STEPS} storageKey="tour-admin-clients-v1" />

      {!clients || clients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p data-testid="text-no-clients">Нет зарегистрированных клиентов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-clients">
          {clients.map((client) => {
            const burningTexts = burningByClientId.get(client.id) ?? [];
            return (
            <Card key={client.id} data-testid={`card-client-${client.id}`} className={burningTexts.length > 0 ? "border-destructive/50" : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {client.name}
                    {burningTexts.length > 0 && (
                      <Flame className="h-4 w-4 text-destructive" data-testid={`icon-burning-client-${client.id}`} />
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {client.hasAccount ? (
                      <Badge className="bg-emerald-600 text-white no-default-hover-elevate">Есть аккаунт</Badge>
                    ) : (
                      <Badge variant="outline">Нет аккаунта</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setRemindersClient(client)}
                      data-testid={`button-reminders-client-${client.id}`}
                      aria-label="Напоминания"
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(client)}
                      data-testid={`button-edit-client-${client.id}`}
                      aria-label="Редактировать клиента"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(client)}
                      data-testid={`button-delete-client-${client.id}`}
                      aria-label="Удалить клиента"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-phone-${client.id}`}>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-email-${client.id}`}>{client.email}</span>
                  </div>
                )}
                {client.username && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-username-${client.id}`}>Логин: {client.username}</span>
                  </div>
                )}
                {client.projects.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>{client.projects.map(p => p.name).join(", ")}</span>
                  </div>
                )}
                {burningTexts.length > 0 && (
                  <div className="space-y-1 pt-1" data-testid={`text-burning-${client.id}`}>
                    {burningTexts.map((text, i) => (
                      <div key={i} className="flex items-start gap-2 text-destructive">
                        <Flame className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО клиента *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
                data-testid="input-client-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+7 (900) 000-00-00"
                  data-testid="input-client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@mail.ru"
                  data-testid="input-client-email"
                />
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium">Данные для входа</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Логин *</Label>
                  <Input
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="ivanov"
                    required
                    data-testid="input-client-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пароль *</Label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    data-testid="input-client-password"
                  />
                </div>
              </div>
            </div>
            {projects && projects.length > 0 && (
              <div className="space-y-2">
                <Label>Привязать к объекту</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger data-testid="select-client-project">
                    <SelectValue placeholder="Не привязывать" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не привязывать</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-client">
              {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Создать клиента"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClient(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО клиента *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
                data-testid="input-edit-client-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+7 (900) 000-00-00"
                  data-testid="input-edit-client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@mail.ru"
                  data-testid="input-edit-client-email"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-edit-client">
              {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ReminderDialog client={remindersClient} onClose={() => setRemindersClient(null)} />
    </div>
  );
}
