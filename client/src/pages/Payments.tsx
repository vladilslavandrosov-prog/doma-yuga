import { useQuery } from "@tanstack/react-query";
import type { Payment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, TrendingUp } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function PaymentsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function Payments({ projectId }: { projectId: number }) {
  const { data: payments, isLoading, error } = useQuery<Payment[]>({
    queryKey: ["/api/project", projectId, "payments"],
  });

  const { data: dashboardData } = useQuery<{
    financial: { totalEstimate: number; totalPaid: number; remaining: number };
  }>({
    queryKey: ["/api/dashboard/demo-uid-123"],
  });

  if (isLoading) {
    return <PaymentsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить данные об оплате</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) ?? 0;
  const totalEstimate = dashboardData?.financial?.totalEstimate ?? 0;
  const remaining = totalEstimate - totalPaid;
  const percentage = totalEstimate > 0 ? Math.round((totalPaid / totalEstimate) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold" data-testid="text-payments-title">Оплата</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-estimate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общая сумма сметы</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-estimate">{formatCurrency(totalEstimate)}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-paid">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Оплачено</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-paid">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-remaining">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Остаток</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-remaining">{formatCurrency(remaining)}</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-payment-progress">
        <CardHeader>
          <CardTitle className="text-base">Прогресс оплаты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={percentage} className="h-3" />
          <p className="text-sm text-muted-foreground" data-testid="text-payment-percentage">
            {percentage}% оплачено
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-payment-history">
        <CardHeader>
          <CardTitle className="text-base">История платежей</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment, index) => (
                <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(parseFloat(payment.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">Итого</TableCell>
                <TableCell className="text-right font-bold" data-testid="text-payments-total">{formatCurrency(totalPaid)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
