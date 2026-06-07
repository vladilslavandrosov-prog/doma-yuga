import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Lead } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  called: "Позвонили",
  working: "В работе",
  done: "Завершена",
  declined: "Отклонена",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  called: "secondary",
  working: "default",
  done: "secondary",
  declined: "destructive",
};

const SERVICE_LABELS: Record<string, string> = {
  construction: "Строительство дома",
  renovation: "Ремонт / реконструкция",
  finishing: "Отделка",
  consultation: "Консультация",
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: "Как можно скорее",
  "1-3months": "1–3 месяца",
  "3-6months": "3–6 месяцев",
  flexible: "Гибко",
};

function parseJsonField(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function LeadCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (l: Lead) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const services = parseJsonField(lead.services);

  return (
    <Card className="hover-elevate" data-testid={`card-lead-${lead.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {lead.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(lead.createdAt)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[lead.status] ?? "secondary"}>
            {STATUS_LABELS[lead.status] ?? lead.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {services.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {SERVICE_LABELS[s] ?? s}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="font-medium text-foreground">{lead.phone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.city && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{lead.city}</span>
            </div>
          )}
        </div>

        {expanded && (
          <div className="space-y-2 text-sm border-t pt-3 mt-1">
            {lead.objectType && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Тип объекта:</span>
                <span>{lead.objectType}</span>
              </div>
            )}
            {lead.area && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Площадь:</span>
                <span>{lead.area} м²</span>
              </div>
            )}
            {lead.budget && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Бюджет:</span>
                <span>{lead.budget}</span>
              </div>
            )}
            {lead.timeline && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Сроки:</span>
                <span>{TIMELINE_LABELS[lead.timeline] ?? lead.timeline}</span>
              </div>
            )}
            {lead.description && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Описание:</span>
                <span>{lead.description}</span>
              </div>
            )}
            {lead.notes && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Заметки:</span>
                <span className="text-primary">{lead.notes}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="w-4 h-4 mr-1" />Скрыть</>
            ) : (
              <><ChevronDown className="w-4 h-4 mr-1" />Подробнее</>
            )}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onOpen(lead)}
            data-testid={`button-edit-lead-${lead.id}`}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Обработать
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const { toast } = useToast();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formStatus, setFormStatus] = useState("new");
  const [formNotes, setFormNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/admin/leads"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/leads/${id}`, { status, notes });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Готово", description: "Заявка обновлена" });
      setEditingLead(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setFormStatus(lead.status);
    setFormNotes(lead.notes ?? "");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLead) return;
    updateMutation.mutate({ id: editingLead.id, status: formStatus, notes: formNotes });
  }

  const filtered = (leads ?? []).filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.city ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = (leads ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-leads-title">
          Заявки
        </h1>
        <p className="text-sm text-muted-foreground">
          Обращения от потенциальных заказчиков
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Badge key={key} variant={counts[key] ? STATUS_VARIANTS[key] : "outline"} className="gap-1 cursor-default">
            {label}
            {counts[key] ? <span className="font-bold">{counts[key]}</span> : null}
          </Badge>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, телефону, городу..."
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-leads-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все заявки</SelectItem>
            <SelectItem value="new">Новые</SelectItem>
            <SelectItem value="called">Позвонили</SelectItem>
            <SelectItem value="working">В работе</SelectItem>
            <SelectItem value="done">Завершены</SelectItem>
            <SelectItem value="declined">Отклонены</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3" data-testid="text-no-leads">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {leads?.length === 0 ? "Заявок пока нет" : "Ничего не найдено"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={openEdit} />
          ))}
        </div>
      )}

      <Dialog open={!!editingLead} onOpenChange={(open) => { if (!open) setEditingLead(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обработка заявки — {editingLead?.name}</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{editingLead.phone}</span>
                </div>
                {editingLead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{editingLead.email}</span>
                  </div>
                )}
                {editingLead.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{editingLead.city}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 pt-1">
                  {parseJsonField(editingLead.services).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {SERVICE_LABELS[s] ?? s}
                    </Badge>
                  ))}
                </div>
                {editingLead.description && (
                  <p className="text-muted-foreground italic">«{editingLead.description}»</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Статус заявки</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger data-testid="select-lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новая</SelectItem>
                    <SelectItem value="called">Позвонили</SelectItem>
                    <SelectItem value="working">В работе</SelectItem>
                    <SelectItem value="done">Завершена</SelectItem>
                    <SelectItem value="declined">Отклонена</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Заметки</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Запишите результат звонка, договорённости..."
                  rows={3}
                  data-testid="textarea-lead-notes"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
                data-testid="button-save-lead"
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
