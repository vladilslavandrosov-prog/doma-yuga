import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  MapPin,
  FileText,
  Building2,
  Zap,
  Droplets,
  Flame,
  Radio,
  Layers,
  Plus,
  Trash2,
  Download,
  Loader2,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";

// Исправляем иконку маркера Leaflet (webpack/vite баг)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ──────────────────────────────────────────────────────────
// Типы коммуникаций
// ──────────────────────────────────────────────────────────
export type UtilityType = "water" | "gas" | "electricity" | "sewage" | "heat" | "telecom";

export interface UtilityLine {
  id: string;
  type: UtilityType;
  name: string;
  points: [number, number][];
  visible: boolean;
}

const UTILITY_META: Record<UtilityType, { label: string; color: string; icon: React.ComponentType<any> }> = {
  water:       { label: "Водоснабжение",  color: "#3B82F6", icon: Droplets },
  gas:         { label: "Газопровод",     color: "#F59E0B", icon: Flame },
  electricity: { label: "Электросети",   color: "#EF4444", icon: Zap },
  sewage:      { label: "Канализация",   color: "#8B5CF6", icon: Layers },
  heat:        { label: "Теплоснабжение",color: "#F97316", icon: Flame },
  telecom:     { label: "Телеком",       color: "#6B7280", icon: Radio },
};

// ──────────────────────────────────────────────────────────
// Кадастровые данные
// ──────────────────────────────────────────────────────────
interface PkkFeature {
  attrs?: {
    cn?: string;
    address?: string;
    area_value?: string;
    area_unit?: string;
    cad_cost?: string;
    category_type?: string;
    permitted_use_established?: string;
  };
  extent?: { xmin: number; ymin: number; xmax: number; ymax: number };
}

// ──────────────────────────────────────────────────────────
// Вспомогательный компонент: "центрировать карту"
// ──────────────────────────────────────────────────────────
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 17, { duration: 1.2 }); }, [lat, lng]);
  return null;
}

// ──────────────────────────────────────────────────────────
// Компонент захвата кликов на карте (рисование коммуникаций)
// ──────────────────────────────────────────────────────────
function MapClickHandler({ drawing, onPoint }: { drawing: boolean; onPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => { if (drawing) onPoint(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// ──────────────────────────────────────────────────────────
// Основная страница
// ──────────────────────────────────────────────────────────
export default function ProjectMap({ projectId }: { projectId: number }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/project", projectId],
  });

  // Кадастровые данные
  const [pkkData, setPkkData] = useState<PkkFeature | null>(null);
  const [pkkLoading, setPkkLoading] = useState(false);

  // Координаты
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [tempLat, setTempLat] = useState("");
  const [tempLng, setTempLng] = useState("");
  const [cadastralInput, setCadastralInput] = useState("");
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Коммуникации
  const [utilities, setUtilities] = useState<UtilityLine[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawingType, setDrawingType] = useState<UtilityType>("water");
  const [drawingName, setDrawingName] = useState("");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);

  // Слои
  const [showCadastre, setShowCadastre] = useState(true);

  // PDF
  const [pdfLoading, setPdfLoading] = useState(false);

  // Инициализация из project
  useEffect(() => {
    if (!project) return;
    if (project.latitude && project.longitude) {
      setLat(parseFloat(String(project.latitude)));
      setLng(parseFloat(String(project.longitude)));
      setTempLat(String(project.latitude));
      setTempLng(String(project.longitude));
    }
    if (project.cadastralNumber) setCadastralInput(project.cadastralNumber);
    if (project.utilitiesJson) {
      try { setUtilities(JSON.parse(project.utilitiesJson)); } catch {}
    }
  }, [project]);

  // Загрузка кадастровых данных
  useEffect(() => {
    if (!project?.cadastralNumber) return;
    setPkkLoading(true);
    fetch(`/api/pkk/${encodeURIComponent(project.cadastralNumber)}`)
      .then((r) => r.json())
      .then((d) => { if (d.features?.[0]) setPkkData(d.features[0]); })
      .catch(() => {})
      .finally(() => setPkkLoading(false));
  }, [project?.cadastralNumber]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/admin/projects/${projectId}`, data);
      if (!res.ok) throw new Error("Ошибка сохранения");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId] });
      toast({ title: "Сохранено" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  // Геокодирование адреса
  async function handleGeocode() {
    const q = geocodeQuery || project?.address;
    if (!q) return;
    setGeocoding(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (data[0]) {
        const nlat = parseFloat(data[0].lat);
        const nlng = parseFloat(data[0].lon);
        setLat(nlat); setLng(nlng);
        setTempLat(String(nlat)); setTempLng(String(nlng));
      } else {
        toast({ title: "Адрес не найден", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка геокодирования", variant: "destructive" });
    }
    setGeocoding(false);
  }

  // Поиск кадастрового номера
  async function handlePkkSearch() {
    if (!cadastralInput.trim()) return;
    setPkkLoading(true);
    try {
      const r = await fetch(`/api/pkk/${encodeURIComponent(cadastralInput.trim())}`);
      const d = await r.json();
      if (d.features?.[0]) {
        const f: PkkFeature = d.features[0];
        setPkkData(f);
        // Центрировать по bounding box
        if (f.extent && mapRef.current) {
          const clng = (f.extent.xmin + f.extent.xmax) / 2;
          const clat = (f.extent.ymin + f.extent.ymax) / 2;
          mapRef.current.flyTo([clat, clng], 17, { duration: 1 });
        }
      } else {
        toast({ title: "Участок не найден в ПКК" });
      }
    } catch {
      toast({ title: "Ошибка запроса к Росреестру", variant: "destructive" });
    }
    setPkkLoading(false);
  }

  // Сохранить геоданные
  function handleSaveGeo() {
    const nlat = parseFloat(tempLat);
    const nlng = parseFloat(tempLng);
    if (isNaN(nlat) || isNaN(nlng)) {
      toast({ title: "Некорректные координаты", variant: "destructive" });
      return;
    }
    setLat(nlat); setLng(nlng);
    saveMutation.mutate({ latitude: nlat, longitude: nlng, cadastralNumber: cadastralInput || null });
  }

  // Добавление точки при рисовании
  const handleMapPoint = useCallback((nlat: number, nlng: number) => {
    setDrawPoints((prev) => [...prev, [nlat, nlng]]);
  }, []);

  // Завершить рисование коммуникации
  function finishDrawing() {
    if (drawPoints.length < 2) {
      toast({ title: "Нужно минимум 2 точки", variant: "destructive" });
      return;
    }
    const line: UtilityLine = {
      id: `${Date.now()}`,
      type: drawingType,
      name: drawingName || UTILITY_META[drawingType].label,
      points: drawPoints,
      visible: true,
    };
    const updated = [...utilities, line];
    setUtilities(updated);
    saveMutation.mutate({ utilitiesJson: JSON.stringify(updated) });
    setDrawing(false);
    setDrawPoints([]);
    setAddUtilityOpen(false);
  }

  function removeUtility(id: string) {
    const updated = utilities.filter((u) => u.id !== id);
    setUtilities(updated);
    saveMutation.mutate({ utilitiesJson: JSON.stringify(updated) });
  }

  function toggleUtilityVisibility(id: string) {
    const updated = utilities.map((u) => u.id === id ? { ...u, visible: !u.visible } : u);
    setUtilities(updated);
  }

  // Генерация PDF
  async function handleExportPdf() {
    if (!project) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Шрифт и заголовок (латинские символы — jsPDF поддерживает по умолчанию)
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("OTCHET OB OBEKТЕ", pageW / 2, 18, { align: "center" });

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text(`Proekt: ${project.name}`, 14, 30);
      doc.text(`Adres: ${project.address}`, 14, 38);
      if (project.cadastralNumber) doc.text(`Kadastrovyy nomer: ${project.cadastralNumber}`, 14, 46);

      const dateStr = new Date().toLocaleDateString("ru-RU");
      doc.setFontSize(9);
      doc.text(`Sgenetrirovan: ${dateStr}`, 14, 53);

      // Снимок карты
      const mapEl = document.getElementById("project-map-container");
      if (mapEl) {
        const canvas = await html2canvas(mapEl, { useCORS: true, scale: 1.5, logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const imgH = Math.round((canvas.height / canvas.width) * (pageW - 28));
        doc.addImage(imgData, "JPEG", 14, 58, pageW - 28, imgH);

        let y = 58 + imgH + 8;

        // Кадастровые данные
        if (pkkData?.attrs) {
          const a = pkkData.attrs;
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text("Kadastrovaya vypiska", 14, y); y += 7;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const rows: [string, string][] = [
            ["Kadastrovyy nomer", a.cn ?? "—"],
            ["Adres (PKK)", a.address ?? "—"],
            ["Ploshchad", `${a.area_value ?? "—"} ${a.area_unit ?? ""}`],
            ["Kadastr. stoimost", a.cad_cost ? `${parseFloat(a.cad_cost).toLocaleString("ru-RU")} RUB` : "—"],
            ["Kategoriya", a.category_type ?? "—"],
            ["Razreshennoe ispolzovanie", a.permitted_use_established ?? "—"],
          ];
          for (const [k, v] of rows) {
            doc.setFont("helvetica", "bold"); doc.text(`${k}:`, 14, y);
            doc.setFont("helvetica", "normal"); doc.text(v, 80, y);
            y += 6;
          }
          y += 4;
        }

        // Коммуникации
        const visUtils = utilities.filter((u) => u.visible);
        if (visUtils.length > 0) {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text("Kommunikatsii", 14, y); y += 7;
          doc.setFontSize(10);
          for (const u of visUtils) {
            const meta = UTILITY_META[u.type];
            doc.setFont("helvetica", "bold");
            doc.text(`[${meta.label}]`, 14, y);
            doc.setFont("helvetica", "normal");
            doc.text(u.name, 60, y);
            doc.text(`${u.points.length} tochek`, 130, y);
            y += 6;
          }
        }
      }

      doc.save(`proekt-${project.id}-karta.pdf`);
    } catch (e) {
      console.error(e);
      toast({ title: "Ошибка генерации PDF", variant: "destructive" });
    }
    setPdfLoading(false);
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const center: [number, number] = lat && lng ? [lat, lng] : [45.0, 38.97];
  const zoom = lat && lng ? 16 : 9;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Карта объекта</h1>
          <p className="text-sm text-muted-foreground">{project?.address}</p>
        </div>
        <Button onClick={handleExportPdf} disabled={pdfLoading} variant="outline">
          {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Скачать PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Карта ── */}
        <div className="lg:col-span-2 space-y-2">
          <div
            id="project-map-container"
            className="rounded-xl overflow-hidden border shadow-sm"
            style={{ height: 480 }}
          >
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef as any}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {showCadastre && (
                <TileLayer
                  url="https://pkk.rosreestr.ru/arcgis/rest/services/PKK6/CadastreObjects/MapServer/tile/{z}/{y}/{x}"
                  opacity={0.5}
                  attribution="Росреестр ПКК"
                />
              )}

              {lat && lng && (
                <>
                  <FlyTo lat={lat} lng={lng} />
                  <Marker position={[lat, lng]}>
                    <Popup>
                      <strong>{project?.name}</strong>
                      <br />{project?.address}
                      {project?.cadastralNumber && <><br />КН: {project.cadastralNumber}</>}
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Рисуемая линия коммуникации */}
              {drawing && drawPoints.length >= 2 && (
                <Polyline
                  positions={drawPoints}
                  color={UTILITY_META[drawingType].color}
                  weight={3}
                  dashArray="8 4"
                />
              )}

              {/* Сохранённые коммуникации */}
              {utilities.filter((u) => u.visible).map((u) => (
                <Polyline
                  key={u.id}
                  positions={u.points}
                  color={UTILITY_META[u.type].color}
                  weight={4}
                >
                  <Popup>
                    <strong style={{ color: UTILITY_META[u.type].color }}>
                      {UTILITY_META[u.type].label}
                    </strong>
                    <br />{u.name}
                  </Popup>
                </Polyline>
              ))}

              <MapClickHandler drawing={drawing} onPoint={handleMapPoint} />
            </MapContainer>
          </div>

          {/* Легенда слоёв */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setShowCadastre(!showCadastre)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${showCadastre ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Кадастр
            </button>
            {utilities.map((u) => {
              const meta = UTILITY_META[u.type];
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUtilityVisibility(u.id)}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors"
                  style={{
                    borderColor: u.visible ? meta.color : undefined,
                    backgroundColor: u.visible ? `${meta.color}18` : undefined,
                    color: u.visible ? meta.color : undefined,
                  }}
                >
                  {u.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {u.name}
                </button>
              );
            })}
          </div>

          {/* Рисование коммуникации */}
          {drawing && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: UTILITY_META[drawingType].color }} />
              <span className="flex-1 text-amber-800 dark:text-amber-300">
                Кликайте на карту чтобы нанести точки — {drawPoints.length} точек.
              </span>
              <Button size="sm" onClick={finishDrawing} disabled={drawPoints.length < 2}>Завершить</Button>
              <Button size="sm" variant="ghost" onClick={() => { setDrawing(false); setDrawPoints([]); }}>Отмена</Button>
            </div>
          )}
        </div>

        {/* ── Панель информации ── */}
        <div className="space-y-3">
          {/* Геолокация */}
          {isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Координаты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={geocodeQuery || project?.address || ""}
                    onChange={(e) => setGeocodeQuery(e.target.value)}
                    placeholder="Адрес для геокодирования"
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleGeocode} disabled={geocoding}>
                    {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Широта</Label>
                    <Input value={tempLat} onChange={(e) => setTempLat(e.target.value)} className="text-xs" placeholder="45.0355" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Долгота</Label>
                    <Input value={tempLng} onChange={(e) => setTempLng(e.target.value)} className="text-xs" placeholder="38.9753" />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={handleSaveGeo} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Сохранить положение
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Кадастровая выписка */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Кадастровая выписка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && (
                <div className="flex gap-2">
                  <Input
                    value={cadastralInput}
                    onChange={(e) => setCadastralInput(e.target.value)}
                    placeholder="23:43:0203003:1234"
                    className="text-xs font-mono"
                  />
                  <Button size="sm" variant="outline" onClick={handlePkkSearch} disabled={pkkLoading}>
                    {pkkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}

              {pkkLoading && <Skeleton className="h-20 w-full" />}

              {!pkkLoading && pkkData?.attrs && (
                <div className="space-y-2 text-xs">
                  {[
                    ["Кадастровый №", pkkData.attrs.cn],
                    ["Адрес (ПКК)", pkkData.attrs.address],
                    ["Площадь", pkkData.attrs.area_value ? `${pkkData.attrs.area_value} ${pkkData.attrs.area_unit ?? ""}` : null],
                    ["Кад. стоимость", pkkData.attrs.cad_cost ? `${parseFloat(pkkData.attrs.cad_cost).toLocaleString("ru-RU")} ₽` : null],
                    ["Категория", pkkData.attrs.category_type],
                    ["Разрешённое использование", pkkData.attrs.permitted_use_established],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={String(k)} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0 w-28">{k}:</span>
                      <span className="font-medium break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {!pkkLoading && !pkkData && project?.cadastralNumber && (
                <p className="text-xs text-muted-foreground">Данные из Росреестра не получены</p>
              )}
              {!pkkLoading && !pkkData && !project?.cadastralNumber && (
                <p className="text-xs text-muted-foreground">Введите кадастровый номер для запроса выписки</p>
              )}
            </CardContent>
          </Card>

          {/* Коммуникации */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Коммуникации
                </span>
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAddUtilityOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {utilities.length === 0 && (
                <p className="text-xs text-muted-foreground">Коммуникации не нанесены</p>
              )}
              {utilities.map((u) => {
                const meta = UTILITY_META[u.type];
                const Icon = meta.icon;
                return (
                  <div key={u.id} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                    <span className="flex-1 truncate">{u.name}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1" style={{ borderColor: meta.color, color: meta.color }}>
                      {meta.label}
                    </Badge>
                    {isAdmin && (
                      <button onClick={() => removeUtility(u.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Диалог добавления коммуникации */}
      <Dialog open={addUtilityOpen} onOpenChange={(o) => { setAddUtilityOpen(o); if (!o) { setDrawing(false); setDrawPoints([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нанести коммуникацию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип коммуникации</Label>
              <Select value={drawingType} onValueChange={(v) => setDrawingType(v as UtilityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(UTILITY_META) as [UtilityType, typeof UTILITY_META[UtilityType]][]).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Название / описание</Label>
              <Input value={drawingName} onChange={(e) => setDrawingName(e.target.value)} placeholder={UTILITY_META[drawingType].label} />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">Как нанести:</p>
              <p className="text-muted-foreground text-xs">1. Нажмите «Начать рисование»</p>
              <p className="text-muted-foreground text-xs">2. Кликайте по карте — добавляете точки трассы</p>
              <p className="text-muted-foreground text-xs">3. Нажмите «Завершить» на баннере над картой</p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => { setDrawing(true); setDrawPoints([]); setAddUtilityOpen(false); }}
              >
                Начать рисование
              </Button>
              <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
