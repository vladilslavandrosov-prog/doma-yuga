import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
  ImageIcon,
  Filter,
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { Estimate, EstimateItem, EstimateItemPhoto } from "@shared/schema";

type EstimateItemWithPhotos = EstimateItem & { photos?: EstimateItemPhoto[] };
type EstimateWithItems = Estimate & { items: EstimateItemWithPhotos[] };

interface GalleryGroup {
  groupName: string;
  photos: { photo: EstimateItemPhoto; itemName: string; date: string }[];
}

function GallerySkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-[4/3]" />
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Gallery({ projectId }: { projectId: number }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxGroup, setLightboxGroup] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadGroupName, setUploadGroupName] = useState("");
  const [uploadItemId, setUploadItemId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: estimates, isLoading } = useQuery<EstimateWithItems[]>({
    queryKey: ["/api/project", projectId, "estimates"],
  });

  const galleryGroups = useMemo((): GalleryGroup[] => {
    if (!estimates) return [];
    const groups = new Map<string, { photo: EstimateItemPhoto; itemName: string; date: string }[]>();
    for (const est of estimates) {
      for (const item of est.items) {
        if (!item.photos || item.photos.length === 0) continue;
        const groupName = item.workGroup || "Без категории";
        const existing = groups.get(groupName) || [];
        for (const photo of item.photos) {
          existing.push({ photo, itemName: item.name, date: item.date });
        }
        groups.set(groupName, existing);
      }
    }
    const result: GalleryGroup[] = [];
    for (const [groupName, photos] of groups) {
      photos.sort((a, b) => b.date.localeCompare(a.date));
      result.push({ groupName, photos });
    }
    result.sort((a, b) => {
      if (a.groupName === "Без категории") return 1;
      if (b.groupName === "Без категории") return -1;
      return a.groupName.localeCompare(b.groupName);
    });
    return result;
  }, [estimates]);

  const allGroupNames = useMemo(() => galleryGroups.map(g => g.groupName), [galleryGroups]);

  const filteredGroups = useMemo(() => {
    if (filterGroup === "all") return galleryGroups;
    return galleryGroups.filter(g => g.groupName === filterGroup);
  }, [galleryGroups, filterGroup]);

  const allItemsWithPhotos = useMemo(() => {
    if (!estimates) return [];
    const items: { id: number; name: string; workGroup: string | null }[] = [];
    for (const est of estimates) {
      for (const item of est.items) {
        items.push({ id: item.id, name: item.name, workGroup: item.workGroup });
      }
    }
    return items;
  }, [estimates]);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!uploadItemId) throw new Error("Выберите работу");
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("estimateItemId", uploadItemId);
      const res = await fetch("/api/admin/estimate-item-photos/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Фото загружено" });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadItemId("");
      setUploadGroupName("");
    },
    onError: () => {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/admin/estimate-item-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "estimates"] });
      toast({ title: "Фото удалено" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setUploadFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setUploadPreview(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!uploadGroupName) return allItemsWithPhotos;
    return allItemsWithPhotos.filter(i => (i.workGroup || "Без категории") === uploadGroupName);
  }, [allItemsWithPhotos, uploadGroupName]);

  const currentLightboxPhotos = useMemo(() => {
    if (!lightboxGroup) return [];
    const group = galleryGroups.find(g => g.groupName === lightboxGroup);
    return group?.photos ?? [];
  }, [lightboxGroup, galleryGroups]);

  const currentLightboxPhoto = lightboxIndex !== null ? currentLightboxPhotos[lightboxIndex] : null;

  if (isLoading) return <GallerySkeleton />;

  const totalPhotos = galleryGroups.reduce((sum, g) => sum + g.photos.length, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-gallery-title">Фото наших работ</h1>
          <p className="text-sm text-muted-foreground">{totalPhotos} фото в {galleryGroups.length} группах</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-gallery-upload">
            <Plus className="mr-2 h-4 w-4" />
            Загрузить фото
          </Button>
        )}
      </div>

      {allGroupNames.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-[250px]" data-testid="select-gallery-filter">
              <SelectValue placeholder="Все группы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все группы</SelectItem>
              {allGroupNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredGroups.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground" data-testid="text-no-gallery-photos">
              Фотографии ещё не загружены
            </p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Добавьте фото к работам в разделе «Выполнение работ» или загрузите через кнопку выше
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {filteredGroups.map((group) => (
        <GalleryGroupCard
          key={group.groupName}
          group={group}
          isAdmin={isAdmin}
          onPhotoClick={(idx) => {
            setLightboxGroup(group.groupName);
            setLightboxIndex(idx);
          }}
          onDelete={(id) => {
            if (confirm("Удалить это фото?")) {
              deleteMut.mutate(id);
            }
          }}
        />
      ))}

      {lightboxIndex !== null && currentLightboxPhoto && (
        <Dialog open onOpenChange={(open) => { if (!open) { setLightboxIndex(null); setLightboxGroup(null); } }}>
          <DialogContent className="max-w-4xl p-0 gap-0 bg-black/95 border-none">
            <VisuallyHidden>
              <DialogTitle>{currentLightboxPhoto.itemName}</DialogTitle>
            </VisuallyHidden>
            <div className="relative">
              <img
                src={currentLightboxPhoto.photo.url}
                alt={currentLightboxPhoto.itemName}
                className="w-full max-h-[80vh] object-contain"
                data-testid="img-gallery-lightbox"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-medium">{currentLightboxPhoto.itemName}</p>
                <p className="text-white/70 text-xs">{formatDate(currentLightboxPhoto.date)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20"
                onClick={() => { setLightboxIndex(null); setLightboxGroup(null); }}
                data-testid="button-gallery-lightbox-close"
                aria-label="Закрыть"
              >
                <X />
              </Button>
              {currentLightboxPhotos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((lightboxIndex! - 1 + currentLightboxPhotos.length) % currentLightboxPhotos.length);
                    }}
                    data-testid="button-gallery-lightbox-prev"
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((lightboxIndex! + 1) % currentLightboxPhotos.length);
                    }}
                    data-testid="button-gallery-lightbox-next"
                    aria-label="Следующее фото"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
              <div className="absolute bottom-2 right-4 text-white/70 text-xs">
                {lightboxIndex! + 1} / {currentLightboxPhotos.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) { setUploadFile(null); setUploadPreview(null); setUploadItemId(""); setUploadGroupName(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузить фото</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (uploadFile) uploadMut.mutate(uploadFile);
            }}
          >
            <div className="space-y-2">
              <Label>Группа работ (фильтр)</Label>
              <Select value={uploadGroupName} onValueChange={(v) => { setUploadGroupName(v); setUploadItemId(""); }}>
                <SelectTrigger data-testid="select-upload-group">
                  <SelectValue placeholder="Все группы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_groups">Все группы</SelectItem>
                  {Array.from(new Set(allItemsWithPhotos.map(i => i.workGroup || "Без категории"))).sort().map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Работа</Label>
              <Select value={uploadItemId} onValueChange={setUploadItemId}>
                <SelectTrigger data-testid="select-upload-item">
                  <SelectValue placeholder="Выберите работу" />
                </SelectTrigger>
                <SelectContent>
                  {(uploadGroupName && uploadGroupName !== "all_groups" ? filteredItems : allItemsWithPhotos).map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Фотография</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
                data-testid="input-gallery-photo-file"
              />
              {uploadPreview && (
                <div className="mt-2 rounded-md overflow-hidden border">
                  <img src={uploadPreview} alt="Предпросмотр" className="w-full max-h-48 object-cover" />
                </div>
              )}
            </div>
            <Button type="submit" disabled={uploadMut.isPending || !uploadFile || !uploadItemId} className="w-full" data-testid="button-gallery-submit-upload">
              {uploadMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Загрузить
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GalleryGroupCard({
  group,
  isAdmin,
  onPhotoClick,
  onDelete,
}: {
  group: GalleryGroup;
  isAdmin: boolean;
  onPhotoClick: (index: number) => void;
  onDelete: (photoId: number) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card data-testid={`card-gallery-group-${group.groupName}`}>
      <CardHeader className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{group.groupName}</CardTitle>
              <p className="text-xs text-muted-foreground">{group.photos.length} фото</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="no-default-hover-elevate">{group.photos.length}</Badge>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {group.photos.map((entry, idx) => (
              <div key={entry.photo.id} className="relative group" data-testid={`gallery-photo-${entry.photo.id}`}>
                <div
                  className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onPhotoClick(idx)}
                >
                  <img
                    src={entry.photo.url}
                    alt={entry.itemName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{entry.itemName}</p>
                {isAdmin && (
                  <button
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.photo.id); }}
                    data-testid={`button-gallery-delete-${entry.photo.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
