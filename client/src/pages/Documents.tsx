import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Document } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, FileCheck, FileSpreadsheet, Shield, ScrollText, Download, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  contract: { label: "Договор", icon: ScrollText },
  project: { label: "Проект", icon: FileText },
  estimate: { label: "Смета", icon: FileSpreadsheet },
  act: { label: "Акт", icon: FileCheck },
  permit: { label: "Разрешение", icon: Shield },
};

function getTypeInfo(type: string) {
  return typeConfig[type] ?? { label: type, icon: FileText };
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
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");

  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ["/api/project", projectId, "documents"],
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/documents", { projectId, name, url, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "documents"] });
      setAddOpen(false);
      setName("");
      setUrl("");
      setType("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "documents"] });
    },
  });

  if (isLoading) {
    return <DocumentsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить документы</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = (documents ?? []).reduce<Record<string, Document[]>>((acc, doc) => {
    const key = doc.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold" data-testid="text-documents-title">Документы</h1>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addMutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="doc-name">Название</Label>
                  <Input
                    id="doc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-doc-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-url">URL</Label>
                  <Input
                    id="doc-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    data-testid="input-doc-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select value={type} onValueChange={setType}>
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
                <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit-document">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Добавить
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" data-testid="badge-document-count">
          {documents?.length ?? 0} документов
        </Badge>
      </div>

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
                    <span className="truncate" data-testid={`text-doc-name-${doc.id}`}>{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild data-testid={`button-download-${doc.id}`}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download />
                      </a>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 />
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
