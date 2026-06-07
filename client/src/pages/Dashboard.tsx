import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Camera,
  MessageCircle,
  CheckCircle2,
  Clock,
  CircleDot,
  HardHat,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  client: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    uid: string;
  };
  project: {
    id: number;
    name: string;
    address: string;
    startDate: string;
    status: string;
    clientId: number;
  };
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  financial: {
    totalEstimate: number;
    totalPaid: number;
    remaining: number;
  };
  unreadMessages: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" data-testid="badge-project-status"><CircleDot className="w-3 h-3 mr-1" />Активен</Badge>;
    case "completed":
      return <Badge variant="secondary" data-testid="badge-project-status"><CheckCircle2 className="w-3 h-3 mr-1" />Завершён</Badge>;
    case "paused":
      return <Badge variant="outline" data-testid="badge-project-status"><Clock className="w-3 h-3 mr-1" />Приостановлен</Badge>;
    default:
      return <Badge variant="secondary" data-testid="badge-project-status">{status}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getQuickLinks(basePath: string) {
  return [
    { title: "Сметы", url: `${basePath}/estimates`, icon: FileSpreadsheet, description: "Работы и материалы" },
    { title: "Выполнение работ", url: `${basePath}/execution`, icon: HardHat, description: "Ход строительства" },
    { title: "Оплата", url: `${basePath}/payments`, icon: CreditCard, description: "История платежей" },
    { title: "Документы", url: `${basePath}/documents`, icon: FileText, description: "Файлы проекта" },
    { title: "Фотоотчёт", url: `${basePath}/photos`, icon: Camera, description: "Фото с объекта" },
    { title: "Чат", url: `${basePath}/chat`, icon: MessageCircle, description: "Связь с компанией" },
  ];
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-md mb-3" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ projectId, basePath }: { projectId: number; basePath?: string }) {
  const linkBase = basePath ?? "/cabinet";
  const { toast } = useToast();
  const [aiOpen, setAiOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/project", projectId],
  });

  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/project/${projectId}/ai-timeline`),
    onSuccess: async (res) => {
      const json = await res.json();
      setAnalysis(json.analysis);
    },
    onError: () => toast({ title: "Не удалось получить анализ. Попробуйте позже.", variant: "destructive" }),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-error-message">
              Не удалось загрузить данные проекта
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              data-testid="button-retry"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, project, progress, financial, unreadMessages } = data;
  const paymentPercentage = financial.totalEstimate > 0
    ? Math.round((financial.totalPaid / financial.totalEstimate) * 100)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-welcome">
          {client.name}
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="text-project-subtitle">
          Клиентский портал проекта
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card data-testid="card-project-info">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Проект</CardTitle>
            {getStatusBadge(project.status)}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold" data-testid="text-project-name">{project.name}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span data-testid="text-project-address">{project.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span data-testid="text-project-start-date">Начало: {formatDate(project.startDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-progress">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Прогресс работ</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-2">
              <span className="text-3xl font-bold" data-testid="text-progress-percentage">
                {progress.percentage}%
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-progress-count">
                {progress.completed} из {progress.total} позиций
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" data-testid="progress-bar-works" />
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-chart-2" />
                <span>Выполнено: {progress.completed}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-chart-4" />
                <span>Осталось: {progress.total - progress.completed}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setAnalysis(null); setAiOpen(true); aiMutation.mutate(); }}
              disabled={aiMutation.isPending}
            >
              {aiMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Анализирую...</>
                : <><Sparkles className="w-4 h-4 mr-2" />Расчёт сроков с AI</>}
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-financial">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Финансы</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Сумма сметы</span>
                <span className="text-sm font-medium" data-testid="text-total-estimate">
                  {formatCurrency(financial.totalEstimate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Оплачено</span>
                <span className="text-sm font-medium text-chart-2" data-testid="text-total-paid">
                  {formatCurrency(financial.totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Остаток</span>
                <span className="text-sm font-medium" data-testid="text-remaining">
                  {formatCurrency(financial.remaining)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Оплата</span>
                <span className="text-xs text-muted-foreground" data-testid="text-payment-percentage">
                  {paymentPercentage}%
                </span>
              </div>
              <Progress value={paymentPercentage} className="h-2" data-testid="progress-bar-payments" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Быстрый доступ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {getQuickLinks(linkBase).map((link) => (
            <Link key={link.url} href={link.url}>
              <Card
                className="hover-elevate cursor-pointer h-full"
                data-testid={`card-quick-${link.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                      <link.icon className="w-5 h-5" />
                    </div>
                    {link.url.endsWith("/chat") && unreadMessages > 0 && (
                      <Badge variant="default" className="text-xs" data-testid="badge-quick-unread">
                        {unreadMessages}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Расчёт сроков выполнения — AI анализ
            </DialogTitle>
          </DialogHeader>
          {aiMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">AI анализирует данные проекта...</p>
              <p className="text-xs">Обычно занимает 10–20 секунд</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {analysis}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setAnalysis(null); aiMutation.mutate(); }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Запросить повторно
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
