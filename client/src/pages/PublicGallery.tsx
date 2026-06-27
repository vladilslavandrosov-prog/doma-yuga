import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
  X,
  ImageIcon,
  Filter,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";

interface GalleryPhoto {
  id: number;
  url: string;
  caption: string | null;
  category: string;
}

interface GalleryGroup {
  name: string;
  photos: GalleryPhoto[];
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
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");

  const { data: allPhotos = [], isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
  });

  const { groups, categoryNames } = useMemo(() => {
    const groupMap = new Map<string, GalleryPhoto[]>();
    for (const photo of allPhotos) {
      const cat = photo.category || "Общее";
      const arr = groupMap.get(cat) || [];
      arr.push(photo);
      groupMap.set(cat, arr);
    }
    const groups: GalleryGroup[] = Array.from(groupMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, photos]) => ({ name, photos }));
    return { groups, categoryNames: groups.map((g) => g.name) };
  }, [allPhotos]);

  const filteredGroups =
    selectedCategory === "all"
      ? groups
      : groups.filter((g) => g.name === selectedCategory);

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

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      if (uploadCaption) fd.append("caption", uploadCaption);
      fd.append("category", uploadCategory || "Общее");
      const res = await fetch("/api/admin/gallery/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Фото добавлено в галерею" });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadCaption("");
      setUploadCategory("");
    },
    onError: () => {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Фото удалено" });
      setLightboxOpen(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  if (isLoading) return <GallerySkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1
            className="text-2xl font-semibold tracking-tight"
            data-testid="text-public-gallery-title"
          >
            Фото наших работ
          </h1>
          <p className="text-muted-foreground" data-testid="text-public-gallery-subtitle">
            Фотографии наших строительных объектов
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setUploadOpen(true)} data-testid="button-gallery-add">
            <Plus className="w-4 h-4 mr-2" />
            Добавить фото
          </Button>
        )}
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
          {categoryNames.length > 1 && (
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64" data-testid="select-gallery-filter">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории ({allPhotos.length})</SelectItem>
                  {categoryNames.map((name) => {
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
                  <h2 className="text-lg font-semibold" data-testid={`text-gallery-group-${group.name}`}>
                    {group.name}
                  </h2>
                  <Badge variant="secondary">{group.photos.length} фото</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-border hover:border-primary/50 transition-colors"
                      onClick={() => openLightbox(offset + idx)}
                      data-testid={`gallery-photo-${photo.id}`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{photo.caption}</p>
                        </div>
                      )}
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
                data-testid="button-lightbox-close"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-14 text-red-400 hover:bg-red-500/20 z-50"
                  onClick={() => deleteMut.mutate(flatPhotos[lightboxIndex].id)}
                  data-testid="button-lightbox-delete"
                  aria-label="Удалить фото"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={prevPhoto}
                data-testid="button-lightbox-prev"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={nextPhoto}
                data-testid="button-lightbox-next"
                aria-label="Следующее фото"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              <img
                src={flatPhotos[lightboxIndex].url}
                alt={flatPhotos[lightboxIndex].caption || ""}
                className="max-w-full max-h-full object-contain"
                data-testid="img-lightbox"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                {flatPhotos[lightboxIndex].caption && (
                  <span>{flatPhotos[lightboxIndex].caption} — </span>
                )}
                {flatPhotos[lightboxIndex].category}
                <span className="ml-3 text-white/60">
                  {lightboxIndex + 1} / {flatPhotos.length}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить фото в галерею</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Input
                placeholder="Например: Фасадные работы"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                data-testid="input-gallery-category"
                list="gallery-categories"
              />
              {categoryNames.length > 0 && (
                <datalist id="gallery-categories">
                  {categoryNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-2">
              <Label>Подпись (необязательно)</Label>
              <Input
                placeholder="Описание фото"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                data-testid="input-gallery-caption"
              />
            </div>
            <div className="space-y-2">
              <Label>Фото</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
                data-testid="button-gallery-choose-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadFile ? uploadFile.name : "Выбрать файл"}
              </Button>
              {uploadPreview && (
                <img src={uploadPreview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border" />
              )}
            </div>
            <Button
              className="w-full"
              disabled={!uploadFile || uploadMut.isPending}
              onClick={() => uploadFile && uploadMut.mutate(uploadFile)}
              data-testid="button-gallery-upload"
            >
              {uploadMut.isPending ? "Загрузка..." : "Загрузить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
