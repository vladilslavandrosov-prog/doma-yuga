import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ListTree, Plus, Trash2, Pencil, Search, Loader2, X, Check, HelpCircle } from "lucide-react";
import type { WorkGroup } from "@shared/schema";
import { OnboardingTour, startOnboardingTour, type TourStep } from "@/components/OnboardingTour";

const WORKGROUPS_TOUR_STEPS: TourStep[] = [
  { target: "text-page-title", title: "Группы работ", description: "Единый справочник групп работ, который используется во всех сметах и графиках выполнения." },
  { target: "input-new-work-group", title: "Новая группа", description: "Добавьте новую группу работ — она сразу появится при создании смет." },
  { target: "input-search-work-groups", title: "Поиск", description: "Быстро найдите нужную группу в списке." },
];

export default function WorkGroups() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: groups, isLoading } = useQuery<WorkGroup[]>({
    queryKey: ["/api/work-groups"],
  });

  const filteredGroups = useMemo(() => {
    if (!groups) return groups;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/work-groups/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      setEditingId(null);
      toast({ title: "Готово", description: "Группа обновлена" });
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

  function startEdit(g: WorkGroup) {
    setEditingId(g.id);
    setEditingName(g.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed || editingId == null) return;
    updateMutation.mutate({ id: editingId, name: trimmed });
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            Группы работ
          </h1>
          <p className="text-sm text-muted-foreground">
            Справочник групп работ для смет и выполнения — единый список на все объекты
          </p>
        </div>
        <Button size="icon" variant="outline" onClick={startOnboardingTour} aria-label="Показать инструкцию" data-testid="button-show-tour">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
      <OnboardingTour steps={WORKGROUPS_TOUR_STEPS} storageKey="tour-admin-workgroups-v1" />

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
        <CardContent className="space-y-3">
          {!isLoading && groups && groups.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск группы..."
                className="pl-9"
                data-testid="input-search-work-groups"
              />
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 space-y-2" data-testid="text-no-work-groups">
              <ListTree className="h-8 w-8 mx-auto opacity-50" />
              <p>Группы пока не заведены</p>
            </div>
          ) : !filteredGroups || filteredGroups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="text-no-work-groups-found">
              <p>Ничего не найдено</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredGroups.map((g) =>
                editingId === g.id ? (
                  <form
                    key={g.id}
                    onSubmit={handleEditSubmit}
                    className="flex items-center gap-2 px-3 py-1.5"
                    data-testid={`row-edit-work-group-${g.id}`}
                  >
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      data-testid={`input-edit-work-group-${g.id}`}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={updateMutation.isPending || !editingName.trim()}
                      data-testid={`button-save-work-group-${g.id}`}
                    >
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={cancelEdit}
                      data-testid={`button-cancel-edit-work-group-${g.id}`}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </form>
                ) : (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover-elevate"
                    data-testid={`row-work-group-${g.id}`}
                  >
                    <span className="text-sm font-medium" data-testid={`text-work-group-name-${g.id}`}>{g.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(g)}
                        data-testid={`button-edit-work-group-${g.id}`}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Удалить группу работ «${g.name}»?`)) deleteMutation.mutate(g.id); }}
                        data-testid={`button-delete-work-group-${g.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
