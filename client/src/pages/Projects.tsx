import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Client } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/lib/auth";
import { MapPin, Calendar, CheckCircle2, Clock, CircleDot, ChevronRight, FolderKanban, User, Plus, Loader2 } from "lucide-react";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ProjectCard({ project }: { project: Project }) {
  const { data: client } = useQuery<Client>({
    queryKey: ["/api/project", project.id, "client"],
  });

  return (
    <Link href={`/cabinet/project/${project.id}`}>
      <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-project-${project.id}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-medium truncate" data-testid={`text-project-name-${project.id}`}>
            {project.name}
          </CardTitle>
          {getStatusBadge(project.status)}
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
          <div className="flex items-center justify-end pt-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
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
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formClientId, setFormClientId] = useState("");

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    enabled: isAdmin,
  });

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

  function resetForm() {
    setFormName("");
    setFormAddress("");
    setFormStartDate("");
    setFormStatus("active");
    setFormClientId("");
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
        {isAdmin && (
          <Button onClick={() => { resetForm(); setAddOpen(true); }} data-testid="button-add-project">
            <Plus className="h-4 w-4 mr-2" />
            Новый объект
          </Button>
        )}
      </div>

      {(!projects || projects.length === 0) ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-projects">
            Объекты не найдены
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
                  data-testid="input-project-start-date"
                />
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
    </div>
  );
}
