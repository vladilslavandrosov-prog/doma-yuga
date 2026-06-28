import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

interface HistoryEntry {
  id: number;
  action: string;
  details: string | null;
  userName: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  created: "Создано",
  updated: "Изменено",
  resolved: "Завершено",
};

export function ReminderHistoryDialog({ reminderId, onClose }: { reminderId: number | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/admin/reminders", reminderId, "history"],
    enabled: reminderId !== null,
  });

  return (
    <Dialog open={reminderId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>История изменений</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="list-reminder-history">
          {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-no-history">Нет записей</p>
          )}
          {data?.map((h) => (
            <div key={h.id} className="rounded-md border p-2 text-sm" data-testid={`row-history-${h.id}`}>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{ACTION_LABEL[h.action] ?? h.action}</span>
                <span>{formatDate(h.createdAt.slice(0, 10))}</span>
              </div>
              {h.details && <p className="mt-1">{h.details}</p>}
              {h.userName && <p className="mt-1 text-xs text-muted-foreground">Кто: {h.userName}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
