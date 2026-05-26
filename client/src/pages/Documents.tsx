import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Document } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, FileCheck, FileSpreadsheet, Shield, ScrollText,
  Download, Plus, Trash2, Loader2, Upload, Link2, File,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const typeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  contract: { label: "Договор",     icon: ScrollText    },
  project:  { label: "Проект",      icon: FileText      },
  estimate: { label: "Смета",       icon: FileSpreadsheet },
  act:      { label: "Акт",         icon: FileCheck     },
  permit:   { label: "Разрешение",  icon: Shield        },
};

function getTypeInfo(type: string) {
  return typeConfig[type] ?? { label: type, icon: FileText };
}

/** Угадываем тип по расширению файла */
function guessTypeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xls" || ext === "xlsx") return "estimate";
  if (ext === "doc" || ext === "docx") return "contract";
  return "";
}

/** Имя файла без расширения */
function basenameNoExt(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) parts.pop();
  return parts.join(".").replace(/[-_]/g, " ").trim();
}

function DocumentsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

export default function Documents({ projectId }: { projectId: number }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  // ── Режим «файл» ──────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");

  // ── Режим «ссылка» ────────────────────────────────────────
  const [urlName, setUrlName] = useState("");
  const [url, setUrl]         = useState("");
  const [urlType, setUrlType] = useState("");

  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ["/api/project", projectId, "documents"],
  });

  // ── Загрузка файла ────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", String(projectId));
      fd.append("name", fileName.trim() || file.name);
      fd.append("type", fileType);
      const res = await fetch("/api/admin/documents/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Ошибка загрузки");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "documents"] });
      toast({ title: "Документ загружен" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ── Добавление по ссылке ──────────────────────────────────
  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/documents", {
        projectId, name: urlName.trim(), url: url.trim(), type: urlType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "documents"] });
      toast({ title: "Документ добавлен" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ── Удаление ──────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "documents"] });
      toast({ title: "Документ удалён" });
    },
  });

  function closeDialog() {
    setAddOpen(false);
    setFile(null);
    setFileName("");
    setFileType("");
    setUrlName("");
    setUrl("");
    setUrlType("");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setFileName(basenameNoExt(f.name));
      setFileType(guessTypeFromExt(f.name));
    }
  }

  if (isLoading) return <DocumentsSkeleton />;

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">
              Не удалось загрузить документы
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = (documents ?? []).reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold" data-testid="text-documents-title">
          Документы
        </h1>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setAddOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-document">
                <Plus className="h-4 w-4 mr-2" />
                Добавить документ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить документ</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="file" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="file" className="flex-1" data-testid="tab-file">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Загрузить файл
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex-1" data-testid="tab-url">
                    <Link2 className="w-4 h-4 mr-1.5" />
                    Указать ссылку
                  </TabsTrigger>
                </TabsList>

                {/* ── Вкладка: файл ── */}
                <TabsContent value="file">
                  <form
                    className="space-y-4 pt-2"
                    onSubmit={(e) => { e.preventDefault(); uploadMutation.mutate(); }}
                  >
                    {/* Зона выбора файла */}
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="dropzone-document"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={onFileChange}
                        data-testid="input-file-document"
                      />
                      {file ? (
                        <div className="flex items-center justify-center gap-2">
                          <File className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(0)} КБ)
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Нажмите для выбора файла
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, Word, Excel · до 20 МБ
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="upload-name">Название</Label>
                      <Input
                        id="upload-name"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Например: Договор подряда №127"
                        data-testid="input-upload-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={fileType} onValueChange={setFileType}>
                        <SelectTrigger data-testid="select-upload-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Договор</SelectItem>
                          <SelectItem value="project">Проект</SelectItem>
                          <SelectItem value="estimate">Смета</SelectItem>
                          <SelectItem value="act">Акт</SelectItem>
                          <SelectItem value="permit">Разрешение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={uploadMutation.isPending || !file || !fileType}
                      data-testid="button-submit-upload"
                    >
                      {uploadMutation.isPending
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Upload className="h-4 w-4 mr-2" />}
                      Загрузить
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Вкладка: ссылка ── */}
                <TabsContent value="url">
                  <form
                    className="space-y-4 pt-2"
                    onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="doc-name">Название</Label>
                      <Input
                        id="doc-name"
                        value={urlName}
                        onChange={(e) => setUrlName(e.target.value)}
                        placeholder="Например: Разрешение на строительство"
                        data-testid="input-doc-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-url">URL документа</Label>
                      <Input
                        id="doc-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        data-testid="input-doc-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={urlType} onValueChange={setUrlType}>
                        <SelectTrigger data-testid="select-doc-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Договор</SelectItem>
                          <SelectItem value="project">Проект</SelectItem>
                          <SelectItem value="estimate">Смета</SelectItem>
                          <SelectItem value="act">Акт</SelectItem>
                          <SelectItem value="permit">Разрешение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={addMutation.isPending || !urlName.trim() || !url.trim() || !urlType}
                      data-testid="button-submit-document"
                    >
                      {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Добавить
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" data-testid="badge-document-count">
          {documents?.length ?? 0} документов
        </Badge>
      </div>

      {/* Список по типам */}
      {Object.entries(grouped).map(([type, docs]) => {
        const info = getTypeInfo(type);
        const Icon = info.icon;
        return (
          <Card key={type} data-testid={`card-docgroup-${type}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <Icon className="h-4 w-4" />
                {info.label}
                <Badge variant="outline" className="ml-auto">{docs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40"
                  data-testid={`row-document-${doc.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="truncate" data-testid={`text-doc-name-${doc.id}`}>
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild data-testid={`button-download-${doc.id}`}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {(!documents || documents.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-documents">
            Документы не найдены
          </CardContent>
        </Card>
      )}
    </div>
  );
}
