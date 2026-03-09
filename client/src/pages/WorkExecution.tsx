import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { HardHat, Coffee, CalendarDays, List, ChevronDown, ChevronRight } from "lucide-react";
import type { Estimate, EstimateItem } from "@shared/schema";

type EstimateWithItems = Estimate & { items: EstimateItem[] };
type ViewMode = "all" | "by-day";

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Выполнено";
    case "in_progress":
      return "В работе";
    case "planned":
    default:
      return "Запланировано";
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed"
    ? "default"
    : status === "in_progress"
    ? "secondary"
    : "outline";

  const colorClass = status === "completed"
    ? "bg-emerald-600 dark:bg-emerald-700 text-white"
    : status === "in_progress"
    ? "bg-amber-500 dark:bg-amber-600 text-white"
    : "";

  return (
    <Badge
      variant={variant}
      className={`no-default-hover-elevate no-default-active-elevate ${colorClass}`}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDayOfWeek(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { weekday: "long" });
}

function isWeekend(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  return day === 0 || day === 6;
}

function categoryLabel(cat: string) {
  switch (cat) {
    case "works": return "Работы";
    case "materials": return "Материалы";
    case "transport": return "Транспорт";
    default: return cat;
  }
}

interface DayGroup {
  date: string;
  items: EstimateItem[];
  total: number;
  weekend: boolean;
}

function WorkExecutionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-10 w-80" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function DayCard({ group, isMobile }: { group: DayGroup; isMobile: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <Card data-testid={`card-day-${group.date}`}>
      <CardHeader
        className="p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-md ${group.weekend ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" : "bg-primary/10 text-primary"}`}>
              {group.weekend ? <Coffee className="w-5 h-5" /> : <HardHat className="w-5 h-5" />}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {formatDate(group.date)}
                {group.weekend && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 dark:border-orange-700">
                    Выходной
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{formatDayOfWeek(group.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{group.items.length} поз.</span>
            <span className="font-semibold" data-testid={`text-day-total-${group.date}`}>{formatCurrency(group.total)}</span>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-0 border-t">
          {isMobile ? (
            <div className="divide-y">
              {group.items.map((item) => (
                <div key={item.id} className="p-3 space-y-1" data-testid={`card-exec-item-${item.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead>Ед.</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, idx) => (
                  <TableRow key={item.id} data-testid={`row-exec-item-${item.id}`}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function WorkExecution({ projectId }: { projectId: number }) {
  const [category, setCategory] = useState<string>("works");
  const [viewMode, setViewMode] = useState<ViewMode>("by-day");
  const isMobile = useIsMobile();

  const { data: estimates, isLoading, error } = useQuery<EstimateWithItems[]>({
    queryKey: ["/api/project", projectId, "estimates"],
  });

  const completedItems = useMemo(() => {
    if (!estimates) return [];
    return estimates
      .filter((e) => e.category === category)
      .flatMap((e) => e.items)
      .filter((item) => item.status === "completed" || item.status === "in_progress");
  }, [estimates, category]);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, EstimateItem[]>();
    for (const item of completedItems) {
      const existing = groups.get(item.date) || [];
      existing.push(item);
      groups.set(item.date, existing);
    }
    const result: DayGroup[] = [];
    for (const [date, items] of groups) {
      result.push({
        date,
        items,
        total: items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0),
        weekend: isWeekend(date),
      });
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [completedItems]);

  const grandTotal = useMemo(() => {
    return completedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  }, [completedItems]);

  const workingDays = dayGroups.filter(d => !d.weekend).length;
  const weekendDays = dayGroups.filter(d => d.weekend).length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <WorkExecutionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить данные</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Выполнение работ</h1>

      <Tabs value={category} onValueChange={setCategory} data-testid="tabs-exec-category">
        <TabsList>
          <TabsTrigger value="works" data-testid="tab-exec-works">Работы</TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-exec-materials">Материалы</TabsTrigger>
          <TabsTrigger value="transport" data-testid="tab-exec-transport">Транспорт</TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card data-testid="card-summary-total">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Итого выполнено</p>
                <p className="text-lg font-bold" data-testid="text-grand-total">{formatCurrency(grandTotal)}</p>
                <p className="text-xs text-muted-foreground">{completedItems.length} позиций</p>
              </CardContent>
            </Card>
            <Card data-testid="card-summary-working">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Рабочих дней</p>
                  <p className="text-lg font-bold" data-testid="text-working-days">{workingDays}</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-summary-weekend">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Выходных дней</p>
                  <p className="text-lg font-bold" data-testid="text-weekend-days">{weekendDays}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "by-day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("by-day")}
              data-testid="button-view-by-day"
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              По дням
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("all")}
              data-testid="button-view-all"
            >
              <List className="w-4 h-4 mr-1" />
              Общая
            </Button>
          </div>

          {completedItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p data-testid="text-no-results">
                  Нет выполненных позиций в категории «{categoryLabel(category)}»
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "by-day" ? (
            <div className="space-y-3">
              {dayGroups.map((group) => (
                <DayCard key={group.date} group={group} isMobile={isMobile} />
              ))}
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {completedItems.map((item) => (
                <Card key={item.id} data-testid={`card-exec-item-${item.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</span>
                      <span className="font-semibold">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-semibold">Итого ({completedItems.length} поз.)</span>
                  <span className="font-bold text-lg" data-testid="text-all-total">{formatCurrency(grandTotal)}</span>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table data-testid="table-execution">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Наименование</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead>Ед.</TableHead>
                      <TableHead className="text-right">Цена</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedItems.map((item, index) => (
                      <TableRow key={item.id} data-testid={`row-exec-item-${item.id}`}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isWeekend(item.date) ? (
                              <Coffee className="w-3.5 h-3.5 text-orange-500" />
                            ) : (
                              <HardHat className="w-3.5 h-3.5 text-primary" />
                            )}
                            {item.date}
                          </div>
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="font-semibold">
                        Итого ({completedItems.length} позиций)
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-all-total">
                        {formatCurrency(grandTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
