import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Photo } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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

  const { data: photos, isLoading, error } = useQuery<Photo[]>({
    queryKey: ["/api/project", projectId, "photos"],
  });

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
      <h1 className="text-2xl font-semibold" data-testid="text-photos-title">Фотоотчёт</h1>

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
            <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <CardContent className="p-3 space-y-1">
              <p className="text-sm font-medium" data-testid={`text-photo-caption-${photo.id}`}>{photo.caption}</p>
              <p className="text-xs text-muted-foreground" data-testid={`text-photo-date-${photo.id}`}>{formatDate(photo.date)}</p>
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
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white"
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    data-testid="button-lightbox-next"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
