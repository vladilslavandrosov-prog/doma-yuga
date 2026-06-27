import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Inbox, Phone, Mail, MapPin, Ruler, Wallet, Clock, Loader2, Home, Wrench, Paintbrush, MessageCircle, HelpCircle, Trash2 } from "lucide-react";
import type { Lead } from "@shared/schema";

const SERVICE_INFO: Record<string, { label: string; icon: typeof Home }> = {
  build: { label: "Строительство дома", icon: Home },
  repair: { label: "Ремонт / реконструкция", icon: Wrench },
  finish: { label: "Отделка помещений", icon: Paintbrush },
  consult: { label: "Консультация", icon: MessageCircle },
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  called: "Позвонили",
  working: "В работе",
  done: "Завершена",
  declined: "Отказ",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white",
  called: "bg-amber-500 text-white",
  working: "bg-violet-600 text-white",
  done: "bg-emerald-600 text-white",
  declined: "bg-muted text-muted-foreground",
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LeadCard({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(lead.notes || "");

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/admin/leads/${lead.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Готово", description: "Заявка обновлена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить заявку", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/leads/${lead.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Готово", description: "Заявка удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить заявку", variant: "destructive" });
    },
  });

  function handleDelete() {
    if (confirm(`Удалить заявку от «${lead.name}»? Это действие нельзя отменить.`)) {
      deleteMutation.mutate();
    }
  }

  const services = parseJsonArray(lead.services);
  const contactMethods = parseJsonArray(lead.contactMethods);
  const callTimes = parseJsonArray(lead.callTimes);

  return (
    <Card data-testid={`card-lead-${lead.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <span data-testid={`text-lead-name-${lead.id}`}>{lead.name}</span>
          <div className="flex items-center gap-2">
            <Badge className={`no-default-hover-elevate ${STATUS_COLORS[lead.status] || ""}`} data-testid={`badge-lead-status-${lead.id}`}>
              {STATUS_LABELS[lead.status] || lead.status}
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-lead-date-${lead.id}`}>
              {formatDate(lead.createdAt)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-lead-${lead.id}`}
              aria-label="Удалить заявку"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-foreground" data-testid={`link-lead-phone-${lead.id}`}>
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
          {lead.email && (
            <span className="flex items-center gap-1.5" data-testid={`text-lead-email-${lead.id}`}>
              <Mail className="h-3.5 w-3.5" />
              {lead.email}
            </span>
          )}
          {lead.city && (
            <span className="flex items-center gap-1.5" data-testid={`text-lead-city-${lead.id}`}>
              <MapPin className="h-3.5 w-3.5" />
              {lead.city}
            </span>
          )}
          {lead.area != null && (
            <span className="flex items-center gap-1.5" data-testid={`text-lead-area-${lead.id}`}>
              <Ruler className="h-3.5 w-3.5" />
              {lead.area} м²
            </span>
          )}
          {lead.budget && (
            <span className="flex items-center gap-1.5" data-testid={`text-lead-budget-${lead.id}`}>
              <Wallet className="h-3.5 w-3.5" />
              {lead.budget}
            </span>
          )}
          {lead.timeline && (
            <span className="flex items-center gap-1.5" data-testid={`text-lead-timeline-${lead.id}`}>
              <Clock className="h-3.5 w-3.5" />
              {lead.timeline}
            </span>
          )}
        </div>

        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => {
              const info = SERVICE_INFO[s];
              const Icon = info?.icon || HelpCircle;
              return (
                <Badge key={s} variant="secondary" className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {info?.label || s}
                </Badge>
              );
            })}
          </div>
        )}

        {lead.objectType && (
          <p className="text-muted-foreground">Объект: {lead.objectType}</p>
        )}

        {lead.description && (
          <p className="whitespace-pre-wrap" data-testid={`text-lead-description-${lead.id}`}>{lead.description}</p>
        )}

        {(contactMethods.length > 0 || callTimes.length > 0) && (
          <p className="text-xs text-muted-foreground">
            {contactMethods.length > 0 && `Способ связи: ${contactMethods.join(", ")}`}
            {contactMethods.length > 0 && callTimes.length > 0 && " · "}
            {callTimes.length > 0 && `Время: ${callTimes.join(", ")}`}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
          <Select
            value={lead.status}
            onValueChange={(status) => updateMutation.mutate({ status })}
          >
            <SelectTrigger className="w-40" data-testid={`select-lead-status-${lead.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Заметка..."
            className="flex-1 min-w-[160px] resize-none text-sm"
            rows={1}
            data-testid={`input-lead-notes-${lead.id}`}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={updateMutation.isPending || notes === (lead.notes || "")}
            onClick={() => updateMutation.mutate({ notes })}
            data-testid={`button-save-lead-notes-${lead.id}`}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ["/api/admin/leads"],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить заявки</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = (leads ?? []).filter((l) => statusFilter === "all" || l.status === statusFilter);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Заявки</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-lead-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-2" data-testid="text-no-leads">
            <Inbox className="h-8 w-8 mx-auto opacity-50" />
            <p>Заявок не найдено</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
