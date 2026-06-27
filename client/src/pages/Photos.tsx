import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Photo } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Loader2, Upload } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function PhotosSkeleton() {
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

export default function Photos({ projectId }: { projectId: number }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { isAdmin } = useAuth();

  const { data: photos, isLoading, error } = useQuery<Photo[]>({
    queryKey: ["/api/project", projectId, "photos"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("projectId", String(projectId));
      formData.append("caption", caption);
      formData.append("date", date);
      const res = await fetch("/api/admin/photos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка загрузки");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "photos"] });
      setAddOpen(false);
      setFile(null);
      setPreview(null);
      setCaption("");
      setDate(new Date().toISOString().slice(0, 10));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/photos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "photos"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  if (isLoading) {
    return <PhotosSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить фотографии</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedPhotos = [...(photos ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null && sortedPhotos.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % sortedPhotos.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null && sortedPhotos.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + sortedPhotos.length) % sortedPhotos.length);
    }
  };

  const currentPhoto = lightboxIndex !== null ? sortedPhotos[lightboxIndex] : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-photos-title">Фотоотчёт</h1>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} data-testid="button-add-photo">
            <Plus className="mr-2 h-4 w-4" />
            Добавить фото
          </Button>
        )}
      </div>

      {sortedPhotos.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-photos">
            Фотографии не найдены
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPhotos.map((photo, index) => (
          <Card
            key={photo.id}
            className="overflow-visible cursor-pointer hover-elevate"
            onClick={() => openLightbox(index)}
            data-testid={`card-photo-${photo.id}`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium" data-testid={`text-photo-caption-${photo.id}`}>{photo.caption}</p>
              <p className="text-xs text-muted-foreground" data-testid={`text-photo-date-${photo.id}`}>{formatDate(photo.date)}</p>
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  data-testid={`button-delete-photo-${photo.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Удалить это фото?")) {
                      deleteMutation.mutate(photo.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Удалить
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
        <DialogContent className="max-w-4xl p-0 gap-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>{currentPhoto?.caption ?? "Фото"}</DialogTitle>
          </VisuallyHidden>
          {currentPhoto && (
            <div className="relative">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption}
                className="w-full max-h-[80vh] object-contain"
                data-testid="img-lightbox"
              />

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-medium" data-testid="text-lightbox-caption">{currentPhoto.caption}</p>
                <p className="text-white/70 text-xs">{formatDate(currentPhoto.date)}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white"
                onClick={closeLightbox}
                data-testid="button-lightbox-close"
                aria-label="Закрыть"
              >
                <X />
              </Button>

              {sortedPhotos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white"
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    data-testid="button-lightbox-prev"
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white"
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    data-testid="button-lightbox-next"
                    aria-label="Следующее фото"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) { setFile(null); setPreview(null); setCaption(""); setDate(new Date().toISOString().slice(0, 10)); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить фото</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="photo-file">Фотография</Label>
              <div className="relative">
                <Input
                  id="photo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  data-testid="input-photo-file"
                />
              </div>
              {preview && (
                <div className="mt-2 rounded-md overflow-hidden border" data-testid="img-photo-preview">
                  <img src={preview} alt="Предпросмотр" className="w-full max-h-48 object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-caption">Описание</Label>
              <Input
                id="photo-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Описание фотографии"
                required
                data-testid="input-photo-caption"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-date">Дата</Label>
              <Input
                id="photo-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                max="2100-12-31"
                data-testid="input-photo-date"
              />
            </div>
            <Button type="submit" disabled={addMutation.isPending || !file} data-testid="button-submit-photo">
              {addMutation.isPending ? (
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
