import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ListTree, Plus, Trash2, Loader2 } from "lucide-react";
import type { WorkGroup } from "@shared/schema";

export default function WorkGroups() {
  const { toast } = useToast();
  const [name, setName] = useState("");

  const { data: groups, isLoading } = useQuery<WorkGroup[]>({
    queryKey: ["/api/work-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/admin/work-groups", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      setName("");
      toast({ title: "Готово", description: "Группа добавлена" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/work-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      toast({ title: "Готово", description: "Группа удалена" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Группы работ
        </h1>
        <p className="text-sm text-muted-foreground">
          Справочник групп работ для смет и выполнения — единый список на все объекты
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Новая группа</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Фундамент"
              data-testid="input-new-work-group"
            />
            <Button type="submit" disabled={createMutation.isPending || !name.trim()} data-testid="button-add-work-group">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Список групп</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 space-y-2" data-testid="text-no-work-groups">
              <ListTree className="h-8 w-8 mx-auto opacity-50" />
              <p>Группы пока не заведены</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover-elevate"
                  data-testid={`row-work-group-${g.id}`}
                >
                  <span className="text-sm font-medium" data-testid={`text-work-group-name-${g.id}`}>{g.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(g.id)}
                    data-testid={`button-delete-work-group-${g.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
