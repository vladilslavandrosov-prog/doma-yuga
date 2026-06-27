import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Upload, Play } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function VideosSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="aspect-video" />
        ))}
      </div>
    </div>
  );
}

export default function Videos({ projectId }: { projectId: number }) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAdmin } = useAuth();

  const { data: videos, isLoading, error } = useQuery<Video[]>({
    queryKey: ["/api/project", projectId, "videos"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл");
      const formData = new FormData();
      formData.append("video", file);
      formData.append("projectId", String(projectId));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("date", date);
      const res = await fetch("/api/admin/videos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "videos"] });
      setAddOpen(false);
      setFile(null);
      setTitle("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "videos"] });
    },
  });

  if (isLoading) return <VideosSkeleton />;

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить видео</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedVideos = [...(videos ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const currentVideo = sortedVideos.find(v => v.id === playingId) ?? null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-videos-title">Видео объекта</h1>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} data-testid="button-add-video">
            <Plus className="mr-2 h-4 w-4" />
            Добавить видео
          </Button>
        )}
      </div>

      {sortedVideos.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-videos">
            Видео не найдены
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden" data-testid={`card-video-${video.id}`}>
            <div className="relative aspect-video bg-black cursor-pointer group" onClick={() => setPlayingId(video.id)}>
              <video
                src={video.url}
                className="w-full h-full object-contain"
                preload="metadata"
                muted
                data-testid={`video-player-${video.id}`}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-black ml-1" />
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 text-white bg-black/50"
                  data-testid={`button-delete-video-${video.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(video.id);
                  }}
                  aria-label="Удалить видео"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardContent className="p-3 space-y-1">
              <p className="text-sm font-medium" data-testid={`text-video-title-${video.id}`}>{video.title}</p>
              {video.description && (
                <p className="text-xs text-muted-foreground" data-testid={`text-video-desc-${video.id}`}>{video.description}</p>
              )}
              <p className="text-xs text-muted-foreground" data-testid={`text-video-date-${video.id}`}>{formatDate(video.date)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={playingId !== null} onOpenChange={(open) => { if (!open) setPlayingId(null); }}>
        <DialogContent className="max-w-4xl p-0 gap-0 bg-black border-none">
          <VisuallyHidden>
            <DialogTitle>{currentVideo?.title ?? "Видео"}</DialogTitle>
          </VisuallyHidden>
          {currentVideo && (
            <div className="relative">
              <video
                src={currentVideo.url}
                className="w-full max-h-[80vh]"
                controls
                autoPlay
                data-testid="video-lightbox"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <p className="text-white text-sm font-medium">{currentVideo.title}</p>
                {currentVideo.description && (
                  <p className="text-white/70 text-xs">{currentVideo.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) { setFile(null); setTitle(""); setDescription(""); setDate(new Date().toISOString().slice(0, 10)); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить видео</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="video-file">Видеофайл</Label>
              <Input
                id="video-file"
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
                data-testid="input-video-file"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-title">Название</Label>
              <Input
                id="video-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название видео"
                required
                data-testid="input-video-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-description">Описание</Label>
              <Textarea
                id="video-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание видео (необязательно)"
                rows={2}
                data-testid="input-video-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-date">Дата</Label>
              <Input
                id="video-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                data-testid="input-video-date"
              />
            </div>
            <Button type="submit" disabled={addMutation.isPending || !file} data-testid="button-submit-video">
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
