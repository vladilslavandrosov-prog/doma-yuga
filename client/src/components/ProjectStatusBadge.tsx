import { Badge } from "@/components/ui/badge";
import { CircleDot, CheckCircle2, Clock } from "lucide-react";

export function ProjectStatusBadge({ status, testId }: { status: string; testId?: string }) {
  switch (status) {
    case "active":
      return <Badge variant="default" data-testid={testId}><CircleDot className="w-3 h-3 mr-1" />Активен</Badge>;
    case "completed":
      return <Badge variant="secondary" data-testid={testId}><CheckCircle2 className="w-3 h-3 mr-1" />Завершён</Badge>;
    case "paused":
      return <Badge variant="outline" data-testid={testId}><Clock className="w-3 h-3 mr-1" />Приостановлен</Badge>;
    default:
      return <Badge variant="secondary" data-testid={testId}>{status}</Badge>;
  }
}
