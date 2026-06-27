import { useState, useMemo } from "react";
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
import { MapPin, Calendar, CheckCircle2, Clock, CircleDot, ChevronRight, FolderKanban, User, Plus, Loader2, Pencil, Search, Filter } from "lucide-react";

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

function ProjectCard({ project, isAdmin, onEdit }: { project: Project; isAdmin: boolean; onEdit: (p: Project) => void }) {
  const { data: client } = useQuery<Client>({
    queryKey: ["/api/project", project.id, "client"],
  });

  return (
    <Card className="hover-elevate h-full relative" data-testid={`card-project-${project.id}`}>
      {isAdmin && (
        <button
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md hover:bg-muted transition-colors"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
          data-testid={`button-edit-project-${project.id}`}
        >
          <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
        </button>
      )}
      <Link href={`/cabinet/project/${project.id}`}>
        <div className="cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pr-10">
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
        </div>
      </Link>
    </Card>
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
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formClientId, setFormClientId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    enabled: isAdmin,
  });

  const sortedAndFiltered = useMemo(() => {
    if (!projects) return [];
    let filtered = [...projects];

    if (statusFilter === "active") {
      filtered = filtered.filter(p => p.status === "active");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const aActive = a.status === "active" ? 0 : 1;
      const bActive = b.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return filtered;
  }, [projects, searchQuery, statusFilter]);

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/projects/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/project", variables.id] });
      toast({ title: "Готово", description: "Объект обновлён" });
      if (editingProject && variables.data.status !== editingProject.status) {
        setStatusFilter("all");
      }
      setEditOpen(false);
      setEditingProject(null);
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

  function openEdit(project: Project) {
    setEditingProject(project);
    setFormName(project.name);
    setFormAddress(project.address);
    setFormStartDate(project.startDate);
    setFormStatus(project.status);
    setFormClientId(String(project.clientId || ""));
    setEditOpen(true);
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

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;
    updateMutation.mutate({
      id: editingProject.id,
      data: {
        name: formName,
        address: formAddress,
        startDate: formStartDate,
        status: formStatus,
        clientId: formClientId ? parseInt(formClientId) : 0,
      },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            <SelectItem value="active">Только активные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-projects">
            {searchQuery || statusFilter !== "all" ? "Ничего не найдено" : "Объекты не найдены"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map((project) => (
            <ProjectCard key={project.id} project={project} isAdmin={isAdmin} onEdit={openEdit} />
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

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingProject(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование объекта</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Название объекта *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                data-testid="input-edit-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес *</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
                data-testid="input-edit-project-address"
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
                  data-testid="input-edit-project-start-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger data-testid="select-edit-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="paused">Приостановлен</SelectItem>
                  <SelectItem value="completed">Завершён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {clients && clients.length > 0 && (
              <div className="space-y-2">
                <Label>Клиент</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger data-testid="select-edit-project-client">
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
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-edit-project">
              {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
