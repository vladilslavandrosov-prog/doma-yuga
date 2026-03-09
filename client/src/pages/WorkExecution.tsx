import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HardHat,
  CalendarDays,
  List,
  Layers,
  ChevronDown,
  ChevronRight,
  CloudOff,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Textarea } from "@/components/ui/textarea";
import type { Estimate, EstimateItem, NonWorkingDay, EstimateItemPhoto, DayComment } from "@shared/schema";

type EstimateItemWithPhotos = EstimateItem & { photos?: EstimateItemPhoto[] };
type EstimateWithItems = Estimate & { items: EstimateItemWithPhotos[] };
type ViewMode = "all" | "by-day" | "by-group";

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Выполнено";
    case "in_progress":
      return "В работе";
    case "planned":
    default:
      return "Запланировано";
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed"
    ? "default"
    : status === "in_progress"
    ? "secondary"
    : "outline";

  const colorClass = status === "completed"
    ? "bg-emerald-600 dark:bg-emerald-700 text-white"
    : status === "in_progress"
    ? "bg-amber-500 dark:bg-amber-600 text-white"
    : "";

  return (
    <Badge
      variant={variant}
      className={`no-default-hover-elevate no-default-active-elevate ${colorClass}`}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDayOfWeek(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { weekday: "long" });
}

function categoryLabel(cat: string) {
  switch (cat) {
    case "works": return "Работы";
    case "materials": return "Материалы";
    case "transport": return "Транспорт";
    default: return cat;
  }
}

interface DayGroup {
  date: string;
  items: EstimateItemWithPhotos[];
  total: number;
}

interface WorkGroupData {
  groupName: string;
  items: EstimateItemWithPhotos[];
  total: number;
}

type TimelineEntry =
  | { type: "work"; group: DayGroup }
  | { type: "off"; days: NonWorkingDay[] };

function WorkExecutionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-10 w-80" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function NonWorkingDaysCard({ days }: { days: NonWorkingDay[] }) {
  const [open, setOpen] = useState(false);

  if (days.length === 1) {
    const d = days[0];
    return (
      <Card className="border-dashed border-muted-foreground/30 bg-muted/30" data-testid={`card-off-day-${d.date}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted text-muted-foreground">
            <CloudOff className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {formatDate(d.date)} <span className="capitalize">({formatDayOfWeek(d.date)})</span>
            </p>
            <p className="text-sm text-muted-foreground/80">{d.reason}</p>
          </div>
          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-muted-foreground shrink-0">
            Нерабочий день
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/30" data-testid={`card-off-days-${days[0].date}`}>
      <CardHeader
        className="p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted text-muted-foreground">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {formatDate(days[0].date)} — {formatDate(days[days.length - 1].date)}
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">{days.length} нерабочих дн.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-muted-foreground">
              Нерабочие дни
            </Badge>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0 border-t border-dashed border-muted-foreground/20">
          <div className="divide-y divide-dashed divide-muted-foreground/20">
            {days.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-off-day-${d.date}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {formatDate(d.date)} <span className="capitalize">({formatDayOfWeek(d.date)})</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">{d.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PhotoLightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: { url: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  if (!photo) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-black/95 border-none">
        <VisuallyHidden>
          <DialogTitle>Фото</DialogTitle>
        </VisuallyHidden>
        <div className="relative">
          <img
            src={photo.url}
            alt=""
            className="w-full max-h-[80vh] object-contain"
            data-testid="img-lightbox"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={onClose}
            data-testid="button-lightbox-close"
          >
            <X />
          </Button>
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                data-testid="button-lightbox-prev"
              >
                <ChevronRight className="rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                data-testid="button-lightbox-next"
              >
                <ChevronRight />
              </Button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/70 text-xs">
            {index + 1} / {photos.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemPhotos({
  item,
  projectId,
  isAdmin,
}: {
  item: EstimateItemWithPhotos;
  projectId: number;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = item.photos ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("estimateItemId", String(item.id));
      const res = await fetch("/api/admin/estimate-item-photos/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Фото загружено" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/admin/estimate-item-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
    },
  });

  if (photos.length === 0 && !isAdmin) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {photos.map((photo, idx) => (
          <div key={photo.id} className="relative group" data-testid={`item-photo-${photo.id}`}>
            <img
              src={photo.url}
              alt=""
              className="w-16 h-16 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
            />
            {isAdmin && (
              <button
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); deleteMut.mutate(photo.id); }}
                data-testid={`button-delete-item-photo-${photo.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMut.mutate(file);
                e.target.value = "";
              }}
            />
            <button
              className="w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              disabled={uploadMut.isPending}
              data-testid={`button-upload-item-photo-${item.id}`}
            >
              {uploadMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
        />
      )}
    </>
  );
}

function DayCommentSection({
  date,
  projectId,
  comments,
  isAdmin,
  isAuthenticated,
}: {
  date: string;
  projectId: number;
  comments: DayComment[];
  isAdmin: boolean;
  isAuthenticated: boolean;
}) {
  const { toast } = useToast();
  const dayComment = comments.find(c => c.date === date);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(dayComment?.text ?? "");
  const canEdit = isAuthenticated;
  const canManage = isAdmin || (dayComment?.sender !== "admin");

  const createMut = useMutation({
    mutationFn: async (commentText: string) => {
      const res = await apiRequest("POST", `/api/project/${projectId}/day-comments`, {
        date,
        text: commentText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "day-comments"] });
      toast({ title: "Сообщение добавлено" });
      setEditing(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: async (commentText: string) => {
      const res = await apiRequest("PATCH", `/api/project/${projectId}/day-comments/${dayComment!.id}`, { text: commentText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "day-comments"] });
      toast({ title: "Сообщение обновлено" });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/project/${projectId}/day-comments/${dayComment!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "day-comments"] });
      toast({ title: "Сообщение удалено" });
      setText("");
    },
  });

  const handleSave = () => {
    if (!text.trim()) return;
    if (dayComment) {
      updateMut.mutate(text.trim());
    } else {
      createMut.mutate(text.trim());
    }
  };

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  if (!canEdit && !dayComment) return null;

  if (dayComment && !editing) {
    const senderLabel = dayComment.sender === "admin" ? "Администратор" : "Клиент";
    const bgClass = dayComment.sender === "admin"
      ? "bg-blue-50/50 dark:bg-blue-950/20"
      : "bg-amber-50/50 dark:bg-amber-950/20";
    const iconColor = dayComment.sender === "admin" ? "text-blue-500" : "text-amber-500";

    return (
      <div className={`border-t ${bgClass} p-3`} data-testid={`day-comment-${date}`}>
        <div className="flex items-start gap-2">
          <MessageSquare className={`w-4 h-4 ${iconColor} mt-0.5 shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{senderLabel}</p>
            <p className="text-sm whitespace-pre-wrap">{dayComment.text}</p>
          </div>
          {canManage && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setText(dayComment.text); setEditing(true); }}
                data-testid={`button-edit-day-comment-${date}`}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm("Удалить сообщение?")) deleteMut.mutate(); }}
                data-testid={`button-delete-day-comment-${date}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (canEdit && editing) {
    return (
      <div className="border-t bg-blue-50/50 dark:bg-blue-950/20 p-3" data-testid={`day-comment-edit-${date}`}>
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение дня..."
            rows={2}
            className="text-sm"
            data-testid={`textarea-day-comment-${date}`}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setEditing(false); }}
              data-testid={`button-cancel-day-comment-${date}`}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={isPending || !text.trim()}
              data-testid={`button-save-day-comment-${date}`}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Отправить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (canEdit && !dayComment) {
    return (
      <div className="border-t">
        <button
          className="w-full p-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 flex items-center justify-center gap-1 transition-colors"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          data-testid={`button-add-day-comment-${date}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Добавить сообщение
        </button>
      </div>
    );
  }

  return null;
}

interface ItemFormData {
  name: string;
  date: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  status: string;
  workGroup: string;
}

function ItemFormDialog({
  open,
  onOpenChange,
  projectId,
  estimateId,
  editItem,
  category,
  existingGroups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  estimateId: number | null;
  editItem?: EstimateItemWithPhotos | null;
  category: string;
  existingGroups: string[];
}) {
  const { toast } = useToast();
  const isEdit = !!editItem;

  const [form, setForm] = useState<ItemFormData>({
    name: editItem?.name ?? "",
    date: editItem?.date ?? new Date().toISOString().slice(0, 10),
    quantity: editItem?.quantity ?? "1",
    unit: editItem?.unit ?? "шт",
    unitPrice: editItem?.unitPrice ?? "0",
    status: editItem?.status ?? "completed",
    workGroup: editItem?.workGroup ?? "",
  });

  const totalPrice = (parseFloat(form.quantity || "0") * parseFloat(form.unitPrice || "0")).toFixed(2);

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      let eid = data.estimateId;
      if (!eid) {
        const estRes = await apiRequest("POST", "/api/admin/estimates", {
          projectId,
          category,
          title: categoryLabel(category),
        });
        const est = await estRes.json();
        eid = est.id;
      }
      const res = await apiRequest("POST", "/api/admin/estimate-items", { ...data, estimateId: eid });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Запись добавлена" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Ошибка при сохранении", variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/estimate-items/${editItem!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Запись обновлена" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Ошибка при сохранении", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      estimateId: editItem?.estimateId ?? estimateId,
      name: form.name,
      date: form.date,
      quantity: form.quantity,
      unit: form.unit,
      unitPrice: form.unitPrice,
      totalPrice,
      status: form.status,
      workGroup: form.workGroup || null,
    };
    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать запись" : "Новая запись"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Наименование</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              data-testid="input-item-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Группа работ</Label>
            <Input
              value={form.workGroup}
              onChange={(e) => setForm({ ...form, workGroup: e.target.value })}
              placeholder="Например: Земляные работы, Фундамент..."
              list="work-groups-list"
              data-testid="input-item-work-group"
            />
            {existingGroups.length > 0 && (
              <datalist id="work-groups-list">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                data-testid="input-item-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="select-item-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Выполнено</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="planned">Запланировано</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Кол-во</Label>
              <Input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                data-testid="input-item-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Ед. изм.</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
                data-testid="input-item-unit"
              />
            </div>
            <div className="space-y-2">
              <Label>Цена за ед.</Label>
              <Input
                type="number"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                required
                data-testid="input-item-price"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Итого: <span className="font-semibold text-foreground">{formatCurrency(totalPrice)}</span>
          </div>
          <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-item">
            {isPending ? <Loader2 className="animate-spin" /> : isEdit ? "Сохранить" : "Добавить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DayCard({
  group,
  isMobile,
  isAdmin,
  isAuthenticated,
  projectId,
  onEdit,
  onDelete,
  dayComments,
}: {
  group: DayGroup;
  isMobile: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  projectId: number;
  onEdit: (item: EstimateItemWithPhotos) => void;
  onDelete: (id: number) => void;
  dayComments: DayComment[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card data-testid={`card-day-${group.date}`}>
      <CardHeader
        className="p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {formatDate(group.date)}
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{formatDayOfWeek(group.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{group.items.length} поз.</span>
            <span className="font-semibold" data-testid={`text-day-total-${group.date}`}>{formatCurrency(group.total)}</span>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0 border-t">
          {isMobile ? (
            <div className="divide-y">
              {group.items.map((item) => (
                <div key={item.id} className="p-3 space-y-1" data-testid={`card-exec-item-${item.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} data-testid={`button-edit-item-${item.id}`}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} data-testid={`button-delete-item-${item.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead>Ед.</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    {isAdmin && <TableHead className="w-20">Фото</TableHead>}
                    {isAdmin && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item, idx) => (
                    <TableRow key={item.id} data-testid={`row-exec-item-${item.id}`}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          {item.name}
                          <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{(item.photos ?? []).length > 0 ? `${(item.photos ?? []).length} фото` : "—"}</span>
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)} data-testid={`button-edit-item-${item.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)} data-testid={`button-delete-item-${item.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DayCommentSection
            date={group.date}
            projectId={projectId}
            comments={dayComments}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
          />
        </CardContent>
      )}
    </Card>
  );
}

function WorkGroupCard({
  group,
  isMobile,
  isAdmin,
  projectId,
  onEdit,
  onDelete,
}: {
  group: WorkGroupData;
  isMobile: boolean;
  isAdmin: boolean;
  projectId: number;
  onEdit: (item: EstimateItemWithPhotos) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card data-testid={`card-group-${group.groupName}`}>
      <CardHeader
        className="p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{group.groupName}</CardTitle>
              <p className="text-xs text-muted-foreground">{group.items.length} позиций</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold" data-testid={`text-group-total-${group.groupName}`}>{formatCurrency(group.total)}</span>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0 border-t">
          {isMobile ? (
            <div className="divide-y">
              {group.items.map((item) => (
                <div key={item.id} className="p-3 space-y-1" data-testid={`card-group-item-${item.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={item.status} />
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(item)} data-testid={`button-edit-group-item-${item.id}`}>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                          <button onClick={() => onDelete(item.id)} data-testid={`button-delete-group-item-${item.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead>Ед.</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, idx) => (
                  <TableRow key={item.id} data-testid={`row-group-item-${item.id}`}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        {item.name}
                        <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.date)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)} data-testid={`button-edit-group-item-${item.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)} data-testid={`button-delete-group-item-${item.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function WorkExecution({ projectId }: { projectId: number }) {
  const [category, setCategory] = useState<string>("works");
  const [viewMode, setViewMode] = useState<ViewMode>("by-day");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstimateItemWithPhotos | null>(null);
  const isMobile = useIsMobile();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: estimates, isLoading, error } = useQuery<EstimateWithItems[]>({
    queryKey: ["/api/project", projectId, "estimates"],
  });

  const { data: nonWorkingDays } = useQuery<NonWorkingDay[]>({
    queryKey: ["/api/project", projectId, "non-working-days"],
  });

  const { data: dayCommentsData } = useQuery<DayComment[]>({
    queryKey: ["/api/project", projectId, "day-comments"],
  });

  const currentEstimate = useMemo(() => {
    if (!estimates) return null;
    return estimates.find(e => e.category === category) ?? null;
  }, [estimates, category]);

  const completedItems = useMemo(() => {
    if (!estimates) return [];
    return estimates
      .filter((e) => e.category === category)
      .flatMap((e) => e.items)
      .filter((item) => item.status === "completed" || item.status === "in_progress");
  }, [estimates, category]);

  const allItems = useMemo(() => {
    if (!estimates) return [];
    return estimates
      .filter((e) => e.category === category)
      .flatMap((e) => e.items);
  }, [estimates, category]);

  const existingGroups = useMemo(() => {
    if (!estimates) return [];
    const groups = new Set<string>();
    estimates.flatMap((e) => e.items).forEach((item) => {
      if (item.workGroup) groups.add(item.workGroup);
    });
    return Array.from(groups).sort();
  }, [estimates]);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, EstimateItemWithPhotos[]>();
    for (const item of completedItems) {
      const existing = groups.get(item.date) || [];
      existing.push(item);
      groups.set(item.date, existing);
    }
    const result: DayGroup[] = [];
    for (const [date, items] of groups) {
      result.push({
        date,
        items,
        total: items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0),
      });
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [completedItems]);

  const allDayGroups = useMemo(() => {
    const groups = new Map<string, EstimateItemWithPhotos[]>();
    for (const item of allItems) {
      const existing = groups.get(item.date) || [];
      existing.push(item);
      groups.set(item.date, existing);
    }
    const result: DayGroup[] = [];
    for (const [date, items] of groups) {
      result.push({
        date,
        items,
        total: items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0),
      });
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [allItems]);

  const workGroups = useMemo((): WorkGroupData[] => {
    const groups = new Map<string, EstimateItemWithPhotos[]>();
    for (const item of allItems) {
      const groupName = item.workGroup || "Без группы";
      const existing = groups.get(groupName) || [];
      existing.push(item);
      groups.set(groupName, existing);
    }
    const result: WorkGroupData[] = [];
    for (const [groupName, items] of groups) {
      items.sort((a, b) => a.date.localeCompare(b.date));
      result.push({
        groupName,
        items,
        total: items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0),
      });
    }
    result.sort((a, b) => {
      if (a.groupName === "Без группы") return 1;
      if (b.groupName === "Без группы") return -1;
      return a.groupName.localeCompare(b.groupName);
    });
    return result;
  }, [allItems]);

  const timeline = useMemo((): TimelineEntry[] => {
    if (!nonWorkingDays || nonWorkingDays.length === 0) {
      return dayGroups.map((g) => ({ type: "work" as const, group: g }));
    }

    const workDates = new Set(dayGroups.map((g) => g.date));
    const sortedOffDays = [...nonWorkingDays]
      .filter((d) => !workDates.has(d.date))
      .sort((a, b) => b.date.localeCompare(a.date));

    const allDates: { date: string; kind: "work" | "off"; index: number }[] = [];

    dayGroups.forEach((g, i) => allDates.push({ date: g.date, kind: "work", index: i }));
    sortedOffDays.forEach((d, i) => allDates.push({ date: d.date, kind: "off", index: i }));

    allDates.sort((a, b) => b.date.localeCompare(a.date));

    const entries: TimelineEntry[] = [];
    let pendingOffDays: NonWorkingDay[] = [];

    for (const entry of allDates) {
      if (entry.kind === "off") {
        pendingOffDays.push(sortedOffDays[entry.index]);
      } else {
        if (pendingOffDays.length > 0) {
          pendingOffDays.sort((a, b) => b.date.localeCompare(a.date));
          entries.push({ type: "off", days: pendingOffDays });
          pendingOffDays = [];
        }
        entries.push({ type: "work", group: dayGroups[entry.index] });
      }
    }
    if (pendingOffDays.length > 0) {
      pendingOffDays.sort((a, b) => b.date.localeCompare(a.date));
      entries.push({ type: "off", days: pendingOffDays });
    }

    return entries;
  }, [dayGroups, nonWorkingDays]);

  const grandTotal = useMemo(() => {
    return completedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  }, [completedItems]);

  const allTotal = useMemo(() => {
    return allItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  }, [allItems]);

  const offDaysCount = nonWorkingDays?.length ?? 0;

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/estimate-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Запись удалена" });
    },
  });

  const handleEdit = (item: EstimateItemWithPhotos) => {
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить эту запись?")) {
      deleteMut.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <WorkExecutionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить данные</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Выполнение работ</h1>
        {isAdmin && (
          <Button size="sm" onClick={handleAdd} data-testid="button-add-item">
            <Plus className="w-4 h-4 mr-1" />
            Добавить запись
          </Button>
        )}
      </div>

      <Tabs value={category} onValueChange={setCategory} data-testid="tabs-exec-category">
        <TabsList>
          <TabsTrigger value="works" data-testid="tab-exec-works">Работы</TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-exec-materials">Материалы</TabsTrigger>
          <TabsTrigger value="transport" data-testid="tab-exec-transport">Транспорт</TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card data-testid="card-summary-total">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Итого выполнено</p>
                <p className="text-lg font-bold" data-testid="text-grand-total">{formatCurrency(grandTotal)}</p>
                <p className="text-xs text-muted-foreground">{completedItems.length} позиций</p>
              </CardContent>
            </Card>
            <Card data-testid="card-summary-days">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Рабочих дней</p>
                  <p className="text-lg font-bold" data-testid="text-working-days">{dayGroups.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-summary-off-days">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted text-muted-foreground">
                  <CloudOff className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Нерабочих дней</p>
                  <p className="text-lg font-bold" data-testid="text-off-days">{offDaysCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === "by-day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("by-day")}
              data-testid="button-view-by-day"
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              По дням
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("all")}
              data-testid="button-view-all"
            >
              <List className="w-4 h-4 mr-1" />
              Общая
            </Button>
            <Button
              variant={viewMode === "by-group" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("by-group")}
              data-testid="button-view-by-group"
            >
              <Layers className="w-4 h-4 mr-1" />
              По видам работ
            </Button>
          </div>

          {viewMode === "by-day" ? (
            completedItems.length === 0 && offDaysCount === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p data-testid="text-no-results">
                    Нет выполненных позиций в категории «{categoryLabel(category)}»
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {timeline.map((entry, idx) =>
                  entry.type === "work" ? (
                    <DayCard
                      key={`work-${entry.group.date}`}
                      group={entry.group}
                      isMobile={isMobile}
                      isAdmin={isAdmin}
                      isAuthenticated={!!user}
                      projectId={projectId}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      dayComments={dayCommentsData ?? []}
                    />
                  ) : (
                    <NonWorkingDaysCard key={`off-${idx}`} days={entry.days} />
                  )
                )}
              </div>
            )
          ) : viewMode === "by-group" ? (
            workGroups.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p data-testid="text-no-results">
                    Нет позиций в категории «{categoryLabel(category)}»
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {workGroups.map((group) => (
                  <WorkGroupCard
                    key={group.groupName}
                    group={group}
                    isMobile={isMobile}
                    isAdmin={isAdmin}
                    projectId={projectId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-semibold">Итого ({allItems.length} позиций)</span>
                    <span className="font-bold text-lg" data-testid="text-group-total-all">{formatCurrency(allTotal)}</span>
                  </CardContent>
                </Card>
              </div>
            )
          ) : (
            allItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p data-testid="text-no-results">
                    Нет позиций в категории «{categoryLabel(category)}»
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allDayGroups.map((group) => (
                  <Card key={group.date} data-testid={`card-all-day-${group.date}`}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                          <HardHat className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {formatDate(group.date)}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">{formatDayOfWeek(group.date)}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{group.items.length} поз.</span>
                          <span className="font-semibold">{formatCurrency(group.total)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 border-t">
                      {isMobile ? (
                        <div className="divide-y">
                          {group.items.map((item) => (
                            <div key={item.id} className="p-3 space-y-1" data-testid={`card-all-item-${item.id}`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{item.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={item.status} />
                                  {isAdmin && (
                                    <div className="flex gap-1">
                                      <button onClick={() => handleEdit(item)} data-testid={`button-edit-all-item-${item.id}`}>
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                      </button>
                                      <button onClick={() => handleDelete(item.id)} data-testid={`button-delete-all-item-${item.id}`}>
                                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                                <span>{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
                                <span className="font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
                              </div>
                              <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Наименование</TableHead>
                              <TableHead className="text-right">Кол-во</TableHead>
                              <TableHead>Ед.</TableHead>
                              <TableHead className="text-right">Цена</TableHead>
                              <TableHead className="text-right">Сумма</TableHead>
                              <TableHead>Статус</TableHead>
                              {isAdmin && <TableHead className="w-20" />}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, idx) => (
                              <TableRow key={item.id} data-testid={`row-all-item-${item.id}`}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    {item.name}
                                    <ItemPhotos item={item} projectId={projectId} isAdmin={isAdmin} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                <TableCell><StatusBadge status={item.status} /></TableCell>
                                {isAdmin && (
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)} data-testid={`button-edit-all-item-${item.id}`}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)} data-testid={`button-delete-all-item-${item.id}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <DayCommentSection
                        date={group.date}
                        projectId={projectId}
                        comments={dayCommentsData ?? []}
                        isAdmin={isAdmin}
                        isAuthenticated={!!user}
                      />
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-semibold">Итого ({allItems.length} позиций)</span>
                    <span className="font-bold text-lg" data-testid="text-all-total">{formatCurrency(allTotal)}</span>
                  </CardContent>
                </Card>
              </div>
            )
          )}
        </TabsContent>
      </Tabs>

      {itemDialogOpen && (
        <ItemFormDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          projectId={projectId}
          estimateId={currentEstimate?.id ?? null}
          editItem={editingItem}
          category={category}
          existingGroups={existingGroups}
        />
      )}
    </div>
  );
}
