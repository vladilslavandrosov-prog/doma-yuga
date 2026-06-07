import { useState, useRef } from "react";
import { LeafletMap } from "@/components/LeafletMap";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Map, Upload, Trash2, Loader2, FileText, Download,
  Save, Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HousePlan {
  id: number;
  projectId: number;
  cadastralNumber: string | null;
  communicationsNotes: string | null;
  updatedAt: string;
}

interface HousePlanFile {
  id: number;
  projectId: number;
  url: string;
  name: string;
  type: string;
  createdAt: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  cadastral: "Кадастровая выписка",
  plan: "План дома",
  communication: "Схема коммуникаций",
  other: "Другое",
};


export default function HousePlan({ projectId, address }: { projectId: number; address?: string }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cadastralNumber, setCadastralNumber] = useState("");
  const [notes, setNotes] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("cadastral");

  const { data: plan, isLoading: planLoading } = useQuery<HousePlan | null>({
    queryKey: ["/api/project", projectId, "house-plan"],
  });

  const { data: files, isLoading: filesLoading } = useQuery<HousePlanFile[]>({
    queryKey: ["/api/project", projectId, "house-plan-files"],
  });

  const savePlanMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/api/admin/house-plan", {
        projectId,
        cadastralNumber: cadastralNumber.trim() || null,
        communicationsNotes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "house-plan"] });
      toast({ title: "Данные сохранены" });
      setEditOpen(false);
    },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", String(projectId));
      fd.append("name", fileName.trim() || file.name);
      fd.append("type", fileType);
      const res = await fetch("/api/admin/house-plan-files/upload", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Ошибка");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "house-plan-files"] });
      toast({ title: "Файл загружен" });
      setUploadOpen(false);
      setFile(null);
      setFileName("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/house-plan-files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "house-plan-files"] });
      toast({ title: "Файл удалён" });
    },
  });

  function openEdit() {
    setCadastralNumber(plan?.cadastralNumber ?? "");
    setNotes(plan?.communicationsNotes ?? "");
    setEditOpen(true);
  }

  const mapAddress = address ?? "";

  if (planLoading || filesLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">План дома</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEdit}>
              <Save className="h-4 w-4 mr-2" />
              {plan ? "Изменить данные" : "Добавить данные"}
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Загрузить файл
            </Button>
          </div>
        )}
      </div>

      {/* Кадастровые данные */}
      {plan && (plan.cadastralNumber || plan.communicationsNotes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Кадастровые данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.cadastralNumber && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Кадастровый номер:</span>
                <Badge variant="secondary" className="font-mono">{plan.cadastralNumber}</Badge>
              </div>
            )}
            {plan.communicationsNotes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Коммуникации:</p>
                <p className="text-sm whitespace-pre-line">{plan.communicationsNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Карта */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4" />
            Карта объекта
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mapAddress ? (
            <LeafletMap address={mapAddress} className="h-[450px] w-full rounded-b-lg" communicationsNotes={plan?.communicationsNotes} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2 p-6">
              <Map className="h-12 w-12 opacity-20" />
              <p className="text-sm text-center">
                Адрес объекта не указан. Карта появится автоматически после добавления адреса в проект.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Файлы */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Документы и схемы</h2>
          <Badge variant="secondary">{files?.length ?? 0} файлов</Badge>
        </div>
        {files && files.length > 0 ? (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {FILE_TYPE_LABELS[f.type] ?? f.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFileMutation.mutate(f.id)}
                      disabled={deleteFileMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Документы не загружены
            </CardContent>
          </Card>
        )}
      </div>

      {/* Диалог редактирования данных */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Кадастровые данные и коммуникации</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Кадастровый номер</Label>
              <Input
                value={cadastralNumber}
                onChange={(e) => setCadastralNumber(e.target.value)}
                placeholder="Например: 23:49:0204007:123"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Формат: регион:район:квартал:участок
              </p>
            </div>
            <div className="space-y-2">
              <Label>Коммуникации</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Газ — от ул. Центральной&#10;Вода — централизованное&#10;Электричество — 15 кВт&#10;Канализация — септик..."
                rows={5}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => savePlanMutation.mutate()}
              disabled={savePlanMutation.isPending}
            >
              {savePlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог загрузки файла */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) { setFile(null); setFileName(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Загрузить документ</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) setFileName(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">PDF, Word, изображение</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Кадастровая выписка" />
            </div>
            <div className="space-y-2">
              <Label>Тип документа</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cadastral">Кадастровая выписка</SelectItem>
                  <SelectItem value="plan">План дома</SelectItem>
                  <SelectItem value="communication">Схема коммуникаций</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !file}
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Загрузить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
