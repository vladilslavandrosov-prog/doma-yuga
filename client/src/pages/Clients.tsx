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
import { UserPlus, Users, Phone, Mail, KeyRound, Loader2, FolderKanban } from "lucide-react";
import type { Project } from "@shared/schema";

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

  function resetForm() {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormUsername("");
    setFormPassword("");
    setFormProjectId("");
  }

  function handleSubmit(e: React.FormEvent) {
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
        <Button onClick={() => setAddOpen(true)} data-testid="button-add-client">
          <UserPlus className="h-4 w-4 mr-2" />
          Добавить клиента
        </Button>
      </div>

      {!clients || clients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p data-testid="text-no-clients">Нет зарегистрированных клиентов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client) => (
            <Card key={client.id} data-testid={`card-client-${client.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {client.name}
                  </span>
                  {client.hasAccount ? (
                    <Badge className="bg-emerald-600 text-white">Есть аккаунт</Badge>
                  ) : (
                    <Badge variant="outline">Нет аккаунта</Badge>
                  )}
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
    </div>
  );
}
