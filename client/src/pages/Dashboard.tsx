import { useQuery } from "@tanstack/react-query";
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
  BrainCircuit,
  AlertTriangle,
  ShieldCheck,
  Map,
  Leaf,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ForecastChartPoint {
  month: string;
  planned: number;
  completed: number;
}

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
    endDate?: string | null;
    status: string;
    clientId: number;
    latitude?: string | null;
    longitude?: string | null;
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
  forecast?: {
    estimatedEndDate: string | null;
    estimatedDaysLeft: number | null;
    elapsedDays: number;
    velocityPerDay: number;
    riskLevel: "none" | "low" | "medium" | "high";
    aiSummary: string | null;
    chartData: ForecastChartPoint[];
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getRiskBadge(risk: string) {
  switch (risk) {
    case "low":
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><ShieldCheck className="w-3 h-3 mr-1" />В срок</Badge>;
    case "medium":
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertTriangle className="w-3 h-3 mr-1" />Небольшое отставание</Badge>;
    case "high":
      return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Риск срыва срока</Badge>;
    default:
      return null;
  }
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
    { title: "Карта объекта", url: `${basePath}/map`, icon: Map, description: "Расположение и кадастр" },
    { title: "Ландшафтный дизайн", url: `${basePath}/landscape`, icon: Leaf, description: "ЕГРН и концепция участка" },
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
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/project", projectId],
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

  const { client, project, progress, financial, unreadMessages, forecast } = data;
  const paymentPercentage = financial.totalEstimate > 0
    ? Math.round((financial.totalPaid / financial.totalEstimate) * 100)
    : 0;

  const hasMap = !!(project.latitude && project.longitude);

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
            {project.endDate && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-project-end-date">
                <Calendar className="w-4 h-4 shrink-0 text-primary" />
                <span className="font-medium text-primary">
                  Дедлайн: {formatDate(project.endDate)}
                </span>
              </div>
            )}
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

      {/* ── Прогноз завершения ── */}
      {forecast && progress.total > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            Прогноз завершения
            {forecast.riskLevel !== "none" && getRiskBadge(forecast.riskLevel)}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Метрики */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Прошло дней</p>
                    <p className="text-2xl font-bold">{forecast.elapsedDays}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Осталось (расчётно)</p>
                    <p className="text-2xl font-bold">
                      {forecast.estimatedDaysLeft !== null ? forecast.estimatedDaysLeft : "—"}
                      <span className="text-sm font-normal text-muted-foreground ml-1">дн.</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Темп работ</p>
                    <p className="text-lg font-semibold">
                      {forecast.velocityPerDay > 0 ? forecast.velocityPerDay.toFixed(2) : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">поз./день</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Прогноз окончания</p>
                    {forecast.estimatedEndDate ? (
                      <p className="text-sm font-semibold text-primary">
                        {new Date(forecast.estimatedEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет данных</p>
                    )}
                  </div>
                </div>
                {forecast.aiSummary && (
                  <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-sm text-foreground/80 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1.5">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      ИИ-анализ
                    </div>
                    {forecast.aiSummary}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* График помесячного выполнения */}
            {forecast.chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Динамика выполнения работ</CardTitle>
                  <CardDescription className="text-xs">По плановым месяцам</CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={forecast.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(val, name) => [val, name === "planned" ? "Запланировано" : "Выполнено"]}
                        labelFormatter={(l) => {
                          const [y, m] = String(l).split("-");
                          return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
                        }}
                      />
                      <Legend formatter={(v) => v === "planned" ? "Запланировано" : "Выполнено"} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="planned" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} opacity={0.6} />
                      <Bar dataKey="completed" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
