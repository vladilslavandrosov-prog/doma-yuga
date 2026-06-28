import { useQuery } from "@tanstack/react-query";
import type { Project, Client, Estimate, EstimateItem } from "@shared/schema";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";

type EstimateWithItems = Estimate & { items: EstimateItem[] };

export default function Act({ projectId }: { projectId: number }) {
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/project", projectId],
  });
  const { data: client } = useQuery<Client>({
    queryKey: ["/api/project", projectId, "client"],
  });
  const { data: estimates, isLoading: estimatesLoading } = useQuery<EstimateWithItems[]>({
    queryKey: ["/api/project", projectId, "estimates"],
  });

  const isLoading = projectLoading || estimatesLoading;

  const completedItems = (estimates ?? []).flatMap((e) =>
    e.items.filter((i) => i.status === "completed").map((i) => ({ ...i, category: e.category }))
  );
  const total = completedItems.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Объект не найден</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 print:p-0 print:max-w-none">
      <div className="flex items-center justify-end gap-2 print:hidden">
        <Button onClick={() => window.print()} data-testid="button-print-act">
          <Printer className="w-4 h-4 mr-2" />
          Печать / Сохранить PDF
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-8 print:border-none print:p-0 space-y-6" data-testid="act-document">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">АКТ ВЫПОЛНЕННЫХ РАБОТ</h1>
          <p className="text-sm text-muted-foreground">г. Краснодар, {today}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Исполнитель</div>
            <div className="font-medium">Дома Юга</div>
          </div>
          <div>
            <div className="text-muted-foreground">Заказчик</div>
            <div className="font-medium">{client?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Объект</div>
            <div className="font-medium">{project.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Адрес</div>
            <div className="font-medium">{project.address}</div>
          </div>
        </div>

        <p className="text-sm">
          Настоящий акт подтверждает, что Исполнителем выполнены, а Заказчиком приняты следующие работы:
        </p>

        <table className="w-full text-sm border-collapse" data-testid="table-act-items">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2">#</th>
              <th className="text-left py-2 pr-2">Наименование работ</th>
              <th className="text-right py-2 pr-2">Кол-во</th>
              <th className="text-right py-2 pr-2">Ед.</th>
              <th className="text-right py-2">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {completedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  Нет завершённых позиций сметы
                </td>
              </tr>
            ) : (
              completedItems.map((item, idx) => (
                <tr key={item.id} className="border-b" data-testid={`row-act-item-${item.id}`}>
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 pr-2">{item.name}</td>
                  <td className="py-2 pr-2 text-right">{item.quantity}</td>
                  <td className="py-2 pr-2 text-right">{item.unit}</td>
                  <td className="py-2 text-right">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="py-2 text-right font-semibold">Итого:</td>
              <td className="py-2 text-right font-semibold" data-testid="text-act-total">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-2 gap-8 pt-12 text-sm">
          <div className="space-y-8">
            <div>Исполнитель: ___________________</div>
          </div>
          <div className="space-y-8">
            <div>Заказчик: ___________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
