import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Estimate, EstimateItem } from "@shared/schema";

type EstimateWithItems = Estimate & { items: EstimateItem[] };

type SortField = "date" | "name" | "quantity" | "unitPrice" | "totalPrice";
type SortDirection = "asc" | "desc";

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
      data-testid={`badge-status-${status}`}
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

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (field !== sortField) {
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  }
  return sortDirection === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />;
}

function EstimatesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-10 w-60" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function MobileCard({ item, index }: { item: EstimateItem; index: number }) {
  return (
    <Card data-testid={`card-estimate-item-${item.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground" data-testid={`text-item-number-${item.id}`}>
            #{index + 1}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <p className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span data-testid={`text-item-date-${item.id}`}>{item.date}</span>
          <span data-testid={`text-item-qty-${item.id}`}>{item.quantity} {item.unit}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(item.unitPrice)} / {item.unit}
          </span>
          <span className="font-semibold" data-testid={`text-item-total-${item.id}`}>
            {formatCurrency(item.totalPrice)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Estimates({ projectId }: { projectId: number }) {
  const [category, setCategory] = useState<string>("works");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isMobile = useIsMobile();

  const { data: estimates, isLoading, error } = useQuery<EstimateWithItems[]>({
    queryKey: ["/api/project", projectId, "estimates"],
  });

  const categoryLabel = category === "works" ? "Работы" : "Материалы";
  const categoryKey = category === "works" ? "works" : "materials";

  const allItems = useMemo(() => {
    if (!estimates) return [];
    return estimates
      .filter((e) => e.category === categoryKey)
      .flatMap((e) => e.items);
  }, [estimates, categoryKey]);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      items = items.filter((item) => item.status === statusFilter);
    }

    items = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "quantity":
          cmp = parseFloat(a.quantity) - parseFloat(b.quantity);
          break;
        case "unitPrice":
          cmp = parseFloat(a.unitPrice) - parseFloat(b.unitPrice);
          break;
        case "totalPrice":
          cmp = parseFloat(a.totalPrice) - parseFloat(b.totalPrice);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allItems, searchQuery, statusFilter, sortField, sortDirection]);

  const totalSum = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  }, [filteredItems]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <EstimatesSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить сметы</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Сметы</h1>

      <Tabs value={category} onValueChange={setCategory} data-testid="tabs-category">
        <TabsList>
          <TabsTrigger value="works" data-testid="tab-works">Работы</TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">Материалы</TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по наименованию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="planned">Запланировано</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Выполнено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p data-testid="text-no-results">
                  {allItems.length === 0
                    ? `Нет позиций в категории "${categoryLabel}"`
                    : "Ничего не найдено по заданным фильтрам"}
                </p>
              </CardContent>
            </Card>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <MobileCard key={item.id} item={item} index={index} />
              ))}
              <Card>
                <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold">Итого ({filteredItems.length} позиций)</span>
                  <span className="font-bold text-lg" data-testid="text-total-sum">
                    {formatCurrency(totalSum)}
                  </span>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table data-testid="table-estimates">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("date")}
                          className="flex items-center gap-1 -ml-3"
                          data-testid="button-sort-date"
                        >
                          Дата
                          <SortIcon field="date" sortField={sortField} sortDirection={sortDirection} />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-1 -ml-3"
                          data-testid="button-sort-name"
                        >
                          Наименование
                          <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("quantity")}
                          className="flex items-center gap-1 ml-auto"
                          data-testid="button-sort-quantity"
                        >
                          Кол-во
                          <SortIcon field="quantity" sortField={sortField} sortDirection={sortDirection} />
                        </Button>
                      </TableHead>
                      <TableHead>Ед. изм.</TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("unitPrice")}
                          className="flex items-center gap-1 ml-auto"
                          data-testid="button-sort-unitPrice"
                        >
                          Стоимость
                          <SortIcon field="unitPrice" sortField={sortField} sortDirection={sortDirection} />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("totalPrice")}
                          className="flex items-center gap-1 ml-auto"
                          data-testid="button-sort-totalPrice"
                        >
                          Сумма
                          <SortIcon field="totalPrice" sortField={sortField} sortDirection={sortDirection} />
                        </Button>
                      </TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, index) => (
                      <TableRow key={item.id} data-testid={`row-estimate-item-${item.id}`}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell data-testid={`text-item-date-${item.id}`}>{item.date}</TableCell>
                        <TableCell data-testid={`text-item-name-${item.id}`}>{item.name}</TableCell>
                        <TableCell className="text-right" data-testid={`text-item-qty-${item.id}`}>
                          {item.quantity}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-item-total-${item.id}`}>
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="font-semibold">
                        Итого ({filteredItems.length} позиций)
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-sum">
                        {formatCurrency(totalSum)}
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
