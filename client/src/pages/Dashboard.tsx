import { useState, type ReactNode } from "react";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudRain, Snowflake, CloudDrizzle, CloudLightning, Thermometer,
  BarChart3, CalendarDays, Building2, AlertTriangle, Lightbulb, Zap,
} from "lucide-react";

interface WeatherDay { date: string; tmax: number; tmin: number; precip: number; code: number; }
interface AiWorkGroup { name: string; completed: number; total: number; inProgress: number; percentage: number; }

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 2) return <CloudSun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code <= 49) return <CloudFog className={className} />;
  if (code <= 67) return <CloudRain className={className} />;
  if (code <= 77) return <Snowflake className={className} />;
  if (code <= 82) return <CloudDrizzle className={className} />;
  if (code <= 99) return <CloudLightning className={className} />;
  return <Thermometer className={className} />;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Ясно";
  if (code <= 2) return "Малооблачно";
  if (code <= 3) return "Облачно";
  if (code <= 49) return "Туман";
  if (code <= 55) return "Морось";
  if (code <= 67) return "Дождь";
  if (code <= 77) return "Снег";
  if (code <= 82) return "Ливень";
  if (code <= 99) return "Гроза";
  return "";
}

const DAY_NAMES = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
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
  Image as ImageIcon,
  Banknote,
  PackageCheck,
  ArrowRight,
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
import { useAuth } from "@/lib/auth";
import { OnboardingTour, startOnboardingTour, type TourStep } from "@/components/OnboardingTour";
import { HelpCircle } from "lucide-react";

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
  workGroups: { name: string; total: number; completed: number; percentage: number }[];
  activity: { type: "photo" | "payment" | "item" | "message"; date: string; title: string; subtitle?: string; url?: string }[];
  heroPhoto: string | null;
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

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const ACTIVITY_ICON: Record<string, ReactNode> = {
  photo: <ImageIcon className="w-4 h-4" />,
  payment: <Banknote className="w-4 h-4" />,
  item: <PackageCheck className="w-4 h-4" />,
  message: <MessageCircle className="w-4 h-4" />,
};

const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: "card-hero",
    title: "Ваш объект",
    description: "Здесь отображается название, адрес и дата начала вашего проекта, а также текущий статус строительства.",
  },
  {
    target: "card-progress",
    title: "Прогресс работ",
    description: "Показывает, какая доля позиций сметы уже выполнена строительной бригадой.",
  },
  {
    target: "card-financial",
    title: "Оплата",
    description: "Процент и сумма уже внесённых платежей по проекту.",
  },
  {
    target: "card-remaining",
    title: "Остаток к оплате",
    description: "Сколько осталось доплатить до полной суммы по смете.",
  },
  {
    target: "card-work-groups",
    title: "Группы работ",
    description: "Детальный прогресс по каждому этапу: фундамент, стены, крыша и другие группы работ.",
  },
  {
    target: "card-activity",
    title: "Последние события",
    description: "Лента свежих обновлений по проекту: новые фото, платежи, выполненные позиции и сообщения.",
  },
  {
    target: "card-ai-insight",
    title: "AI-анализ сроков",
    description: "Нажмите, чтобы получить оценку темпов строительства с учётом прогноза погоды.",
  },
  {
    target: "card-quick-links",
    title: "Быстрый доступ",
    description: "Переходы в смету, ход работ, документы, фотоотчёт и чат с компанией — всё в один клик.",
  },
];

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
  const { isAdmin } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [aiGroups, setAiGroups] = useState<AiWorkGroup[]>([]);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/project", projectId],
  });

  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/project/${projectId}/ai-timeline`),
    onSuccess: async (res) => {
      const json = await res.json();
      setAnalysis(json.analysis);
      setWeatherDays(json.weather ?? []);
      setAiGroups(json.groups ?? []);
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

  const projectAge = daysSince(project.startDate);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-xl border"
        style={data.heroPhoto ? {
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.25)), url(${data.heroPhoto})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
        data-testid="card-hero"
      >
        <div className={data.heroPhoto ? "text-white" : ""}>
          <div className={data.heroPhoto ? "p-5 md:p-7" : "p-5 md:p-7 bg-muted/30"}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1.5">
                <p className={`text-xs uppercase tracking-wide ${data.heroPhoto ? "text-white/70" : "text-muted-foreground"}`} data-testid="text-project-subtitle">
                  {client.name}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-project-name">
                  {project.name}
                </h1>
                <div className={`flex items-center gap-2 text-sm flex-wrap ${data.heroPhoto ? "text-white/85" : "text-muted-foreground"}`}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span data-testid="text-project-address">{project.address}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm flex-wrap ${data.heroPhoto ? "text-white/85" : "text-muted-foreground"}`}>
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span data-testid="text-project-start-date">
                    С {formatDate(project.startDate)} · {projectAge}-й день проекта
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isAdmin && (
                  <Button
                    size="icon"
                    variant={data.heroPhoto ? "secondary" : "outline"}
                    onClick={startOnboardingTour}
                    aria-label="Показать инструкцию"
                    data-testid="button-show-tour"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                )}
                {getStatusBadge(project.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isAdmin && <OnboardingTour steps={DASHBOARD_TOUR_STEPS} storageKey="tour-dashboard-v1" />}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card data-testid="card-progress">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" /> Прогресс работ
            </div>
            <p className="text-2xl font-bold" data-testid="text-progress-percentage">{progress.percentage}%</p>
            <p className="text-xs text-muted-foreground" data-testid="text-progress-count">{progress.completed} из {progress.total} позиций</p>
            <Progress value={progress.percentage} className="h-1.5 mt-1" data-testid="progress-bar-works" />
          </CardContent>
        </Card>

        <Card data-testid="card-financial">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> Оплачено
            </div>
            <p className="text-2xl font-bold" data-testid="text-payment-percentage">{paymentPercentage}%</p>
            <p className="text-xs text-muted-foreground" data-testid="text-total-paid">{formatCurrency(financial.totalPaid)}</p>
            <Progress value={paymentPercentage} className="h-1.5 mt-1" data-testid="progress-bar-payments" />
          </CardContent>
        </Card>

        <Card data-testid="card-remaining">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Banknote className="w-3.5 h-3.5" /> Остаток к оплате
            </div>
            <p className="text-2xl font-bold" data-testid="text-remaining">{formatCurrency(financial.remaining)}</p>
            <p className="text-xs text-muted-foreground" data-testid="text-total-estimate">из {formatCurrency(financial.totalEstimate)}</p>
          </CardContent>
        </Card>

        <Link href={`${linkBase}/chat`}>
          <Card className="hover-elevate cursor-pointer h-full" data-testid="card-unread">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="w-3.5 h-3.5" /> Сообщения
              </div>
              <p className="text-2xl font-bold">{unreadMessages > 0 ? unreadMessages : "—"}</p>
              <p className="text-xs text-muted-foreground">{unreadMessages > 0 ? "непрочитанных" : "всё прочитано"}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: work groups + activity */}
        <div className="lg:col-span-2 space-y-4">
          {data.workGroups.length > 0 && (
            <Card data-testid="card-work-groups">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">По группам работ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.workGroups.slice(0, 6).map((g) => (
                  <div key={g.name} data-testid={`row-workgroup-${g.name}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{g.completed}/{g.total} · {g.percentage}%</span>
                    </div>
                    <Progress value={g.percentage} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-activity">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Последние события</CardTitle>
            </CardHeader>
            <CardContent>
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-activity">Пока нет событий по проекту</p>
              ) : (
                <div className="space-y-3">
                  {data.activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3" data-testid={`row-activity-${i}`}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                        {ACTIVITY_ICON[a.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        {a.subtitle && <p className="text-xs text-muted-foreground truncate">{a.subtitle}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatShortDate(a.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: AI insight + quick links */}
        <div className="space-y-4">
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent" data-testid="card-ai-insight">
            <CardContent className="p-4">
              <button
                onClick={() => { setAnalysis(null); setAiOpen(true); aiMutation.mutate(); }}
                disabled={aiMutation.isPending}
                data-testid="button-ai-timeline"
                className="w-full flex items-center gap-3 text-left disabled:opacity-70 disabled:cursor-default"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shrink-0">
                  {aiMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Sparkles className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">
                    {aiMutation.isPending ? "Анализирую проект..." : "Расчёт сроков с AI"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Прогресс по графику и прогноз погоды
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </CardContent>
          </Card>

          <Card data-testid="card-quick-links">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Быстрый доступ</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {getQuickLinks(linkBase).map((link) => (
                <Link key={link.url} href={link.url}>
                  <div
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 hover-elevate cursor-pointer"
                    data-testid={`card-quick-${link.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
                      <link.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{link.title}</span>
                    {link.url.endsWith("/chat") && unreadMessages > 0 && (
                      <Badge variant="default" className="text-xs" data-testid="badge-quick-unread">
                        {unreadMessages}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Шапка */}
          <div className="relative flex items-center gap-3 px-6 py-4 border-b border-primary/20 bg-gradient-to-r from-violet-600/10 via-primary/10 to-cyan-500/10 shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,theme(colors.primary/25),transparent_55%)] pointer-events-none" />
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-[0_0_16px_-2px_theme(colors.primary)] animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="relative">
              <p className="font-semibold text-base flex items-center gap-1.5">
                Анализ проекта
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80 bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">AI</span>
              </p>
              <p className="text-xs text-muted-foreground">Прогресс, сроки и прогноз погоды</p>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {aiMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 blur-xl animate-pulse" />
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-primary/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium">Анализирую проект...</p>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">Загружаю данные и прогноз погоды</p>
                </div>
              </div>
            ) : analysis ? (
              <div>
                {/* Погода */}
                {weatherDays.length > 0 && (
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CloudSun className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-sm">Погода на объекте — 14 дней</p>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {weatherDays.slice(0, 14).map((d) => {
                        const dt = new Date(d.date);
                        const isRainy = d.precip > 5;
                        const isFrost = d.tmin < 0;
                        const isToday = dt.toDateString() === new Date().toDateString();
                        return (
                          <div key={d.date} className={`flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors ${
                            isToday ? "bg-primary/10 ring-1 ring-primary/30" :
                            isRainy ? "bg-blue-50 dark:bg-blue-950/40" :
                            isFrost ? "bg-violet-50 dark:bg-violet-950/40" :
                            "bg-muted/40 hover:bg-muted/70"
                          }`}>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[dt.getDay()]}</span>
                            <span className="text-[10px] text-muted-foreground mb-1">{dt.getDate()}.{String(dt.getMonth()+1).padStart(2,"0")}</span>
                            <span className="my-1" title={weatherLabel(d.code)}>
                              <WeatherIcon code={d.code} className={`w-6 h-6 ${
                                isFrost ? "text-violet-500" : isRainy ? "text-blue-500" : "text-amber-500"
                              }`} />
                            </span>
                            <span className="text-sm font-bold text-foreground">{d.tmax > 0 ? "+" : ""}{d.tmax}°</span>
                            <span className={`text-xs font-medium ${d.tmin < 0 ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}>{d.tmin > 0 ? "+" : ""}{d.tmin}°</span>
                            {d.precip > 0 ? (
                              <span className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 font-medium">{d.precip}мм</span>
                            ) : <span className="text-[10px] mt-1 opacity-0">-</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 inline-block"/>осадки &gt;5мм</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-100 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 inline-block"/>мороз</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/15 border border-primary/30 inline-block"/>сегодня</div>
                    </div>
                  </div>
                )}

                <div className="border-t mx-6"/>

                {/* По группам работ */}
                {aiGroups.length > 0 && (
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-sm">По группам работ</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/5 overflow-hidden">
                      {aiGroups.map((g, i) => (
                        <div
                          key={g.name}
                          className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-primary/10" : ""}`}
                          data-testid={`row-ai-group-${i}`}
                        >
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{g.name}</span>
                          {g.inProgress > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 shrink-0">
                              <Zap className="w-3 h-3" />
                              {g.inProgress}
                            </span>
                          )}
                          <div className="w-28 h-1.5 rounded-full bg-muted-foreground/15 overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full transition-all ${
                                g.percentage >= 100
                                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                                  : g.percentage > 0
                                  ? "bg-gradient-to-r from-violet-500 to-primary"
                                  : "bg-muted-foreground/20"
                              }`}
                              style={{ width: `${Math.min(100, g.percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10 text-right shrink-0">{g.percentage}%</span>
                          <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{g.completed}/{g.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Анализ по секциям */}
                <div className="px-6 py-4 space-y-4">
                  {analysis.split(/\n\n+/).map((block, i) => {
                    const titleMatch = block.match(/^\*\*(.+?)\*\*/);
                    const title = titleMatch?.[1];
                    const body = titleMatch ? block.replace(/^\*\*(.+?)\*\*\n?/, "") : block;
                    if (!body.trim()) return null;

                    const icons: Record<string, ReactNode> = {
                      "Текущий прогресс": <BarChart3 className="w-4 h-4 text-primary" />,
                      "Прогноз завершения": <CalendarDays className="w-4 h-4 text-primary" />,
                      "Отстают от графика": <AlertTriangle className="w-4 h-4 text-amber-500" />,
                      "Итог": <CheckCircle2 className="w-4 h-4 text-green-500" />,
                      "Рекомендация": <Lightbulb className="w-4 h-4 text-amber-500" />,
                      "Погода на объекте": <CloudSun className="w-4 h-4 text-primary" />,
                    };

                    return (
                      <div key={i} className="rounded-xl border bg-card">
                        {title && (
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
                            {icons[title] ?? <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />}
                            <p className="text-sm font-semibold">{title}</p>
                          </div>
                        )}
                        <div className="px-4 py-3">
                          <p className="text-sm leading-relaxed text-foreground/90">{body.trim()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 pb-5">
                  <Button variant="outline" className="w-full"
                    onClick={() => { setAnalysis(null); setWeatherDays([]); setAiGroups([]); aiMutation.mutate(); }}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Обновить анализ
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
