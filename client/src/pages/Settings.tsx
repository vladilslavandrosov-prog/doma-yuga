import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Lock, Loader2, Check, Send, Users2, Trash2, UserPlus } from "lucide-react";

interface StaffMember {
  id: number;
  username: string;
  telegramChatId: string | null;
}

function StaffManager() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/staff"],
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/staff", { username, password, telegramChatId: telegramChatId || null });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания сотрудника");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      setUsername("");
      setPassword("");
      setTelegramChatId("");
      toast({ title: "Сотрудник добавлен" });
    },
    onError: (err: any) => {
      setPassword("");
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/staff/${id}`);
      if (!res.ok) throw new Error("Ошибка удаления");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 8) {
      toast({ title: "Логин обязателен, пароль — не менее 8 символов", variant: "destructive" });
      return;
    }
    createMut.mutate();
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users2 className="h-5 w-5 text-muted-foreground" />
          Сотрудники
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2" data-testid="list-staff">
          {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
          {!isLoading && (staff?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-no-staff">Сотрудников нет</p>
          )}
          {staff?.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm" data-testid={`row-staff-${s.id}`}>
              <div>
                <div className="font-medium">{s.username}</div>
                {s.telegramChatId && <div className="text-xs text-muted-foreground">Telegram: {s.telegramChatId}</div>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => deleteMut.mutate(s.id)}
                aria-label="Удалить сотрудника"
                data-testid={`button-delete-staff-${s.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-2 border-t pt-4">
          <Input
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            data-testid="input-staff-username"
          />
          <Input
            type="password"
            placeholder="Пароль (мин. 8 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="input-staff-password"
          />
          <Input
            placeholder="Telegram chat ID (необязательно)"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            data-testid="input-staff-telegram-chat-id"
          />
          <Button type="submit" size="sm" className="w-full" disabled={createMut.isPending} data-testid="button-add-staff">
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" />Добавить сотрудника</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FaqTelegramNotificationsSetting() {
  const { toast } = useToast();
  const { data } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/admin/settings/faq-telegram-notifications"],
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PUT", "/api/admin/settings/faq-telegram-notifications", { enabled });
    },
    onSuccess: (_data, enabled) => {
      queryClient.setQueryData(["/api/admin/settings/faq-telegram-notifications"], { enabled });
      toast({ title: enabled ? "Уведомления включены" : "Уведомления отключены" });
    },
    onError: () => {
      toast({ title: "Не удалось изменить настройку", variant: "destructive" });
    },
  });

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-muted-foreground" />
          Уведомления в Telegram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="faq-telegram-toggle" className="text-sm text-muted-foreground">
            Уведомлять о новых вопросах в FAQ-чате на сайте
          </Label>
          <Switch
            id="faq-telegram-toggle"
            checked={data?.enabled ?? true}
            onCheckedChange={(checked) => mutation.mutate(checked)}
            disabled={mutation.isPending}
            data-testid="switch-faq-telegram-notifications"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Ошибка", description: "Пароли не совпадают", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Ошибка", description: "Пароль должен быть не менее 8 символов", variant: "destructive" });
      return;
    }
    setIsPending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка смены пароля");
      }
      toast({ title: "Готово", description: "Пароль успешно изменён" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Настройки</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Изменить пароль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Текущий пароль</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Новый пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Подтвердите новый пароль</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="input-confirm-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-change-password">
              {isPending ? <Loader2 className="animate-spin" /> : <><Check className="h-4 w-4 mr-2" />Изменить пароль</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && <StaffManager />}
      {isAdmin && <FaqTelegramNotificationsSetting />}
    </div>
  );
}
