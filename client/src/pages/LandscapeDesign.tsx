import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Leaf, Plus, Upload, Trash2, Loader2, FileText, Download,
  Sparkles, ImageIcon, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LandscapeFile {
  id: number;
  projectId: number;
  url: string;
  name: string;
  type: string;
  createdAt: string;
}

interface LandscapeDesign {
  id: number;
  projectId: number;
  questionnaire: string;
  generatedImageUrl: string | null;
  status: string;
  createdAt: string;
}

interface Questionnaire {
  style: string;
  area: string;
  plants: string;
  features: string;
  colors: string;
  budget: string;
  wishes: string;
}

const defaultQ: Questionnaire = {
  style: "",
  area: "",
  plants: "",
  features: "",
  colors: "",
  budget: "",
  wishes: "",
};

function buildPrompt(q: Questionnaire, address: string): string {
  const parts = [
    `Landscape design for a residential property in Russia`,
    address && `Location: ${address}`,
    q.style && `Style: ${q.style}`,
    q.area && `Area: ${q.area} sq.m.`,
    q.plants && `Plants: ${q.plants}`,
    q.features && `Features: ${q.features}`,
    q.colors && `Color palette: ${q.colors}`,
    q.wishes && `Additional: ${q.wishes}`,
    `photorealistic, professional landscape design, high quality, bird eye view, detailed garden plan`,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function LandscapeDesign({ projectId, address }: { projectId: number; address?: string }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [q, setQ] = useState<Questionnaire>(defaultQ);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("egrn");

  const { data: files, isLoading: filesLoading } = useQuery<LandscapeFile[]>({
    queryKey: ["/api/project", projectId, "landscape-files"],
  });

  const { data: designs, isLoading: designsLoading } = useQuery<LandscapeDesign[]>({
    queryKey: ["/api/project", projectId, "landscape-designs"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", String(projectId));
      fd.append("name", fileName.trim() || file.name);
      fd.append("type", fileType);
      const res = await fetch("/api/admin/landscape-files/upload", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Ошибка");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape-files"] });
      toast({ title: "Файл загружен" });
      setUploadOpen(false);
      setFile(null);
      setFileName("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deletFileMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/landscape-files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape-files"] });
      toast({ title: "Файл удалён" });
    },
  });

  const deleteDesignMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/landscape-designs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape-designs"] });
      toast({ title: "Дизайн удалён" });
    },
  });

  async function handleGenerate() {
    if (!q.style) {
      toast({ title: "Выберите стиль", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setPreviewUrl(null);
    try {
      const prompt = encodeURIComponent(buildPrompt(q, address ?? ""));
      const url = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true&seed=${Date.now()}`;
      // Проверяем что изображение загрузится
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Не удалось сгенерировать изображение"));
        img.src = url;
      });
      setPreviewUrl(url);
      // Сохраняем дизайн
      await apiRequest("POST", "/api/admin/landscape-designs", {
        projectId,
        questionnaire: q,
        generatedImageUrl: url,
        status: "done",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape-designs"] });
      toast({ title: "Дизайн сгенерирован!" });
    } catch {
      toast({ title: "Ошибка генерации. Попробуйте ещё раз.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  if (filesLoading || designsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-semibold">Ландшафтный дизайн</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить выписку
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Загрузить выписку ЕГРН</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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
                    <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Выписка ЕГРН" />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="egrn">Выписка ЕГРН</SelectItem>
                        <SelectItem value="topo">Топосъёмка</SelectItem>
                        <SelectItem value="photo">Фото участка</SelectItem>
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

            <Dialog open={designOpen} onOpenChange={(v) => { setDesignOpen(v); if (!v) { setPreviewUrl(null); setQ(defaultQ); } }}>
              <DialogTrigger asChild>
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Создать дизайн
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Генерация ландшафтного дизайна</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Стиль *</Label>
                      <Select value={q.style} onValueChange={(v) => setQ({ ...q, style: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите стиль" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern minimalist">Современный минимализм</SelectItem>
                          <SelectItem value="classic formal garden">Классический</SelectItem>
                          <SelectItem value="natural cottage garden">Природный / Деревенский</SelectItem>
                          <SelectItem value="japanese zen garden">Японский</SelectItem>
                          <SelectItem value="mediterranean garden">Средиземноморский</SelectItem>
                          <SelectItem value="English country garden">Английский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Площадь участка (м²)</Label>
                      <Input
                        value={q.area}
                        onChange={(e) => setQ({ ...q, area: e.target.value })}
                        placeholder="Например: 600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Растения и насаждения</Label>
                    <Input
                      value={q.plants}
                      onChange={(e) => setQ({ ...q, plants: e.target.value })}
                      placeholder="Деревья, кустарники, цветники, газон, огород..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Элементы благоустройства</Label>
                    <Input
                      value={q.features}
                      onChange={(e) => setQ({ ...q, features: e.target.value })}
                      placeholder="Беседка, пруд, дорожки, освещение, забор, барбекю..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Цветовая палитра</Label>
                      <Input
                        value={q.colors}
                        onChange={(e) => setQ({ ...q, colors: e.target.value })}
                        placeholder="Зелёный, белый, серый..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Бюджет</Label>
                      <Select value={q.budget} onValueChange={(v) => setQ({ ...q, budget: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economical">Экономичный</SelectItem>
                          <SelectItem value="moderate">Средний</SelectItem>
                          <SelectItem value="premium">Премиум</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Особые пожелания</Label>
                    <Textarea
                      value={q.wishes}
                      onChange={(e) => setQ({ ...q, wishes: e.target.value })}
                      placeholder="Детская площадка, место для отдыха, огород..."
                      rows={3}
                    />
                  </div>

                  {previewUrl && (
                    <div className="rounded-lg overflow-hidden border">
                      <img src={previewUrl} alt="Сгенерированный дизайн" className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleGenerate}
                      disabled={generating || !q.style}
                    >
                      {generating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Генерация...</>
                      ) : previewUrl ? (
                        <><RefreshCw className="h-4 w-4 mr-2" />Сгенерировать заново</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" />Сгенерировать дизайн</>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Генерация занимает 15–30 секунд. Используется бесплатный AI (Pollinations.ai)
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="designs">
        <TabsList>
          <TabsTrigger value="designs">
            <ImageIcon className="h-4 w-4 mr-1.5" />
            Дизайны ({designs?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-1.5" />
            Документы ({files?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="mt-4 space-y-4">
          {designs && designs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {designs.map((d) => {
                const parsed = (() => { try { return JSON.parse(d.questionnaire); } catch { return {}; } })();
                return (
                  <Card key={d.id}>
                    <CardContent className="p-0">
                      {d.generatedImageUrl ? (
                        <img
                          src={d.generatedImageUrl}
                          alt="Ландшафтный дизайн"
                          className="w-full rounded-t-lg object-cover aspect-video"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                          <Leaf className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            {parsed.style && <Badge variant="secondary">{parsed.style}</Badge>}
                            {parsed.area && <p className="text-xs text-muted-foreground">Площадь: {parsed.area} м²</p>}
                            {parsed.features && <p className="text-xs text-muted-foreground truncate">{parsed.features}</p>}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDesignMutation.mutate(d.id)}
                              disabled={deleteDesignMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {d.generatedImageUrl && (
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <a href={d.generatedImageUrl} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4 mr-2" />
                              Скачать изображение
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground space-y-3">
                <Sparkles className="h-12 w-12 mx-auto opacity-20" />
                <p>Дизайны ещё не созданы</p>
                {isAdmin && (
                  <p className="text-xs">Нажмите «Создать дизайн», заполните опросник и получите AI-визуализацию</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4 space-y-3">
          {files && files.length > 0 ? (
            files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {f.type === "egrn" ? "Выписка ЕГРН" : f.type === "topo" ? "Топосъёмка" : f.type === "photo" ? "Фото" : "Документ"}
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
                      onClick={() => deletFileMutation.mutate(f.id)}
                      disabled={deletFileMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Документы не загружены
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
