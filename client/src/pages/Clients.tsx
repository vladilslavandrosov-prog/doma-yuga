import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { UserPlus, Users, Phone, Mail, KeyRound, Loader2, FolderKanban, Pencil, Trash2, HelpCircle } from "lucide-react";
import type { Project } from "@shared/schema";
import { OnboardingTour, startOnboardingTour, type TourStep } from "@/components/OnboardingTour";

const CLIENTS_TOUR_STEPS: TourStep[] = [
  { target: "text-page-title", title: "Клиенты", description: "Список всех клиентов с доступом в личный кабинет и привязкой к их объектам." },
  { target: "button-add-client", title: "Добавить клиента", description: "Создайте учётную запись клиента и привяжите её к объекту." },
  { target: "grid-clients", title: "Карточки клиентов", description: "Здесь можно посмотреть контакты, сменить пароль или удалить клиента." },
];

interface ClientWithAccount {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  uid: string;
  username: string | null;
  hasAccount: boolean;
  projects: { id: number; name: string }[];
}

export default function Clients() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithAccount | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formProjectId, setFormProjectId] = useState("");

  const { data: clients, isLoading } = useQuery<ClientWithAccount[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/admin/clients", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка создания");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Клиент и аккаунт созданы" });
      setAddOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/clients/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Данные клиента обновлены" });
      setEditOpen(false);
      setEditingClient(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/clients/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Готово", description: "Клиент удалён" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function handleDelete(client: ClientWithAccount) {
    if (confirm(`Удалить клиента «${client.name}»? Это действие нельзя отменить.`)) {
      deleteMutation.mutate(client.id);
    }
  }

  function resetForm() {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormUsername("");
    setFormPassword("");
    setFormProjectId("");
  }

  function openEdit(client: ClientWithAccount) {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone || "");
    setFormEmail(client.email || "");
    setEditOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      phone: formPhone,
      email: formEmail,
      username: formUsername,
      password: formPassword,
      projectId: formProjectId || undefined,
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClient) return;
    updateMutation.mutate({
      id: editingClient.id,
      data: { name: formName, phone: formPhone, email: formEmail },
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Клиенты</h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={startOnboardingTour} aria-label="Показать инструкцию" data-testid="button-show-tour">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button onClick={() => { resetForm(); setAddOpen(true); }} data-testid="button-add-client">
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить клиента
          </Button>
        </div>
      </div>
      <OnboardingTour steps={CLIENTS_TOUR_STEPS} storageKey="tour-admin-clients-v1" />

      {!clients || clients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p data-testid="text-no-clients">Нет зарегистрированных клиентов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-clients">
          {clients.map((client) => (
            <Card key={client.id} data-testid={`card-client-${client.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {client.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {client.hasAccount ? (
                      <Badge className="bg-emerald-600 text-white no-default-hover-elevate">Есть аккаунт</Badge>
                    ) : (
                      <Badge variant="outline">Нет аккаунта</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(client)}
                      data-testid={`button-edit-client-${client.id}`}
                      aria-label="Редактировать клиента"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(client)}
                      data-testid={`button-delete-client-${client.id}`}
                      aria-label="Удалить клиента"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-phone-${client.id}`}>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-email-${client.id}`}>{client.email}</span>
                  </div>
                )}
                {client.username && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span data-testid={`text-client-username-${client.id}`}>Логин: {client.username}</span>
                  </div>
                )}
                {client.projects.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>{client.projects.map(p => p.name).join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО клиента *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
                data-testid="input-client-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+7 (900) 000-00-00"
                  data-testid="input-client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@mail.ru"
                  data-testid="input-client-email"
                />
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium">Данные для входа</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Логин *</Label>
                  <Input
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="ivanov"
                    required
                    data-testid="input-client-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пароль *</Label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    data-testid="input-client-password"
                  />
                </div>
              </div>
            </div>
            {projects && projects.length > 0 && (
              <div className="space-y-2">
                <Label>Привязать к объекту</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger data-testid="select-client-project">
                    <SelectValue placeholder="Не привязывать" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не привязывать</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-client">
              {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Создать клиента"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClient(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО клиента *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
                data-testid="input-edit-client-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+7 (900) 000-00-00"
                  data-testid="input-edit-client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@mail.ru"
                  data-testid="input-edit-client-email"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-edit-client">
              {updateMutation.isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
