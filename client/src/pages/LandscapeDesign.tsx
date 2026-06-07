import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Leaf, Plus, Upload, Trash2, Loader2, FileText, Download,
  Sparkles, ImageIcon, RefreshCw, Trees,
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

function DesignImage({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className="relative aspect-video rounded-t-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-emerald-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-xs font-medium">Загрузка...</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-emerald-400 p-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Leaf className="h-12 w-12 opacity-40" />
          </motion.div>
          <span className="text-xs text-center text-emerald-600/70">
            Изображение недоступно.<br />Нажмите «Скачать» для просмотра.
          </span>
        </div>
      )}
      <img
        src={url}
        alt="Ландшафтный дизайн"
        className={`w-full h-full object-cover transition-all duration-500 ${status === "ok" ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}

const defaultQ: Questionnaire = {
  style: "", area: "", plants: "", features: "", colors: "", budget: "", wishes: "",
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

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

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
      const prompt = buildPrompt(q, address ?? "");
      const res = await fetch("/api/admin/landscape-designs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, questionnaire: q, prompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Ошибка генерации");
      }
      const design = await res.json();
      setPreviewUrl(design.generatedImageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape-designs"] });
      toast({ title: "Дизайн сгенерирован!" });
    } catch (e: any) {
      toast({ title: e.message ?? "Ошибка генерации. Попробуйте ещё раз.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  if (filesLoading || designsLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-emerald-100 to-green-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 md:p-8 text-white shadow-lg"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-2 left-16 w-24 h-24 rounded-full bg-emerald-300/40 blur-xl" />
        </div>
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -5, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="bg-white/20 rounded-xl p-2.5"
            >
              <Leaf className="h-6 w-6" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Ландшафтный дизайн</h1>
              <p className="text-emerald-100 text-sm mt-0.5">AI-генерация и документы участка</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 border backdrop-blur-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить выписку
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Загрузить выписку ЕГРН</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200"
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
                        <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-emerald-400" />
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                  <Button className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm">
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
                        <Input value={q.area} onChange={(e) => setQ({ ...q, area: e.target.value })} placeholder="600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Растения и насаждения</Label>
                      <Input value={q.plants} onChange={(e) => setQ({ ...q, plants: e.target.value })} placeholder="Деревья, кустарники, цветники, газон..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Элементы благоустройства</Label>
                      <Input value={q.features} onChange={(e) => setQ({ ...q, features: e.target.value })} placeholder="Беседка, пруд, дорожки, освещение..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Цветовая палитра</Label>
                        <Input value={q.colors} onChange={(e) => setQ({ ...q, colors: e.target.value })} placeholder="Зелёный, белый, серый..." />
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
                      <Textarea value={q.wishes} onChange={(e) => setQ({ ...q, wishes: e.target.value })} placeholder="Детская площадка, место для отдыха..." rows={3} />
                    </div>
                    <AnimatePresence>
                      {previewUrl && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="rounded-xl overflow-hidden border-2 border-emerald-200 shadow-md"
                        >
                          <img src={previewUrl} alt="Сгенерированный дизайн" className="w-full" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
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
                    <p className="text-xs text-muted-foreground text-center">
                      Генерация занимает 15–30 секунд. Используется бесплатный AI (Pollinations.ai)
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="designs">
        <TabsList className="bg-emerald-50 border border-emerald-100">
          <TabsTrigger value="designs" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ImageIcon className="h-4 w-4 mr-1.5" />
            Дизайны ({designs?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-1.5" />
            Документы ({files?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="mt-4">
          {designs && designs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {designs.map((d, i) => {
                const parsed = (() => { try { return JSON.parse(d.questionnaire); } catch { return {}; } })();
                return (
                  <motion.div
                    key={d.id}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300 rounded-xl">
                      <CardContent className="p-0">
                        {d.generatedImageUrl ? (
                          <DesignImage url={d.generatedImageUrl} />
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center rounded-t-xl">
                            <Leaf className="h-12 w-12 text-emerald-200" />
                          </div>
                        )}
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1.5 min-w-0">
                              {parsed.style && (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
                                  {parsed.style}
                                </Badge>
                              )}
                              {parsed.area && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Площадь:</span> {parsed.area} м²
                                </p>
                              )}
                              {parsed.features && (
                                <p className="text-xs text-muted-foreground truncate">{parsed.features}</p>
                              )}
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 shrink-0"
                                onClick={() => deleteDesignMutation.mutate(d.id)}
                                disabled={deleteDesignMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {d.generatedImageUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              asChild
                            >
                              <a href={d.generatedImageUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-4 w-4 mr-2" />
                                Скачать изображение
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/30">
                <CardContent className="p-12 text-center space-y-4">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="mx-auto w-fit"
                  >
                    <div className="bg-emerald-100 rounded-2xl p-4">
                      <Sparkles className="h-10 w-10 text-emerald-500" />
                    </div>
                  </motion.div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Дизайны ещё не созданы</p>
                    {isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Нажмите «Создать дизайн», заполните опросник и получите AI-визуализацию
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4 space-y-3">
          {files && files.length > 0 ? (
            files.map((f, i) => (
              <motion.div
                key={f.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-emerald-100 rounded-lg p-2 shrink-0">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-600 mt-0.5">
                      {f.type === "egrn" ? "Выписка ЕГРН" : f.type === "topo" ? "Топосъёмка" : f.type === "photo" ? "Фото" : "Документ"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50" asChild>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      onClick={() => deletFileMutation.mutate(f.id)}
                      disabled={deletFileMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/30">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Документы не загружены
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
