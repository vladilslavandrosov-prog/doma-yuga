import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ImageIcon,
  Filter,
} from "lucide-react";

interface EstimateItemPhoto {
  id: number;
  estimateItemId: number;
  url: string;
}

interface EstimateItem {
  id: number;
  name: string;
  workGroup: string | null;
  photos: EstimateItemPhoto[];
}

interface Estimate {
  id: number;
  projectId: number;
  category: string;
  title: string;
  items: EstimateItem[];
}

interface PhotoEntry {
  photo: EstimateItemPhoto;
  itemName: string;
  workGroup: string;
}

interface GalleryGroup {
  name: string;
  photos: PhotoEntry[];
}

function GallerySkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-72" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function PublicGallery() {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const projectQueries = useMemo(() => {
    return (projects || []).map((p) => p.id);
  }, [projects]);

  const { data: allEstimates, isLoading } = useQuery<Estimate[][]>({
    queryKey: ["/api/all-project-estimates", projectQueries],
    queryFn: async () => {
      if (projectQueries.length === 0) return [];
      const results = await Promise.all(
        projectQueries.map((id) =>
          fetch(`/api/project/${id}/estimates`).then((r) => r.json())
        )
      );
      return results;
    },
    enabled: projectQueries.length > 0,
  });

  const { groups, allPhotos, groupNames } = useMemo(() => {
    const allPhotos: PhotoEntry[] = [];
    if (allEstimates) {
      for (const estimates of allEstimates) {
        for (const est of estimates) {
          for (const item of est.items) {
            for (const photo of item.photos) {
              allPhotos.push({
                photo,
                itemName: item.name,
                workGroup: item.workGroup || "Без группы",
              });
            }
          }
        }
      }
    }

    const groupMap = new Map<string, PhotoEntry[]>();
    for (const entry of allPhotos) {
      const arr = groupMap.get(entry.workGroup) || [];
      arr.push(entry);
      groupMap.set(entry.workGroup, arr);
    }

    const groups: GalleryGroup[] = Array.from(groupMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, photos]) => ({ name, photos }));

    const groupNames = groups.map((g) => g.name);

    return { groups, allPhotos, groupNames };
  }, [allEstimates]);

  const filteredGroups =
    selectedGroup === "all"
      ? groups
      : groups.filter((g) => g.name === selectedGroup);

  const flatPhotos = filteredGroups.flatMap((g) => g.photos);

  const openLightbox = (globalIndex: number) => {
    setLightboxIndex(globalIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const prevPhoto = () =>
    setLightboxIndex((i) => (i > 0 ? i - 1 : flatPhotos.length - 1));
  const nextPhoto = () =>
    setLightboxIndex((i) => (i < flatPhotos.length - 1 ? i + 1 : 0));

  if (isLoading) return <GallerySkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="space-y-2">
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-public-gallery-title"
        >
          Галерея работ
        </h1>
        <p className="text-muted-foreground" data-testid="text-public-gallery-subtitle">
          Фотографии наших строительных объектов
        </p>
      </div>

      {allPhotos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Фотографии пока не добавлены</p>
            <p className="text-sm">Загляните позже — мы обновляем галерею по мере продвижения работ</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {groupNames.length > 1 && (
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-64" data-testid="select-public-gallery-filter">
                  <SelectValue placeholder="Все группы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все группы ({allPhotos.length})</SelectItem>
                  {groupNames.map((name) => {
                    const count = groups.find((g) => g.name === name)?.photos.length || 0;
                    return (
                      <SelectItem key={name} value={name}>
                        {name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredGroups.map((group) => {
            let offset = 0;
            for (const g of filteredGroups) {
              if (g.name === group.name) break;
              offset += g.photos.length;
            }

            return (
              <div key={group.name} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold" data-testid={`text-public-gallery-group-${group.name}`}>
                    {group.name}
                  </h2>
                  <Badge variant="secondary">{group.photos.length} фото</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.photos.map((entry, idx) => (
                    <div
                      key={entry.photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-border hover:border-primary/50 transition-colors"
                      onClick={() => openLightbox(offset + idx)}
                      data-testid={`public-gallery-photo-${entry.photo.id}`}
                    >
                      <img
                        src={entry.photo.url}
                        alt={entry.itemName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{entry.itemName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 bg-black/95 border-none flex items-center justify-center">
          {flatPhotos[lightboxIndex] && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 text-white hover:bg-white/20 z-50"
                onClick={closeLightbox}
                data-testid="button-public-lightbox-close"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={prevPhoto}
                data-testid="button-public-lightbox-prev"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={nextPhoto}
                data-testid="button-public-lightbox-next"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              <img
                src={flatPhotos[lightboxIndex].photo.url}
                alt={flatPhotos[lightboxIndex].itemName}
                className="max-w-full max-h-full object-contain"
                data-testid="img-public-lightbox"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                {flatPhotos[lightboxIndex].itemName} — {flatPhotos[lightboxIndex].workGroup}
                <span className="ml-3 text-white/60">
                  {lightboxIndex + 1} / {flatPhotos.length}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
