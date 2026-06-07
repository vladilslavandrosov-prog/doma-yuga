import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { LandscapeSurvey } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, FileText, CheckCircle2, BrainCircuit, Leaf, Layers,
  Loader2, ChevronRight, ChevronLeft, Sparkles, TreePine,
  Home, Waves, FlameKindling, Bike, Shovel, Sun, Cloud,
  Download, RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────
// Справочники опроса
// ─────────────────────────────────────────
const DESIGN_STYLES = [
  { id: "modern",    label: "Современный",     emoji: "🏛️", desc: "Чистые линии, минимализм, природный камень" },
  { id: "classic",   label: "Классический",    emoji: "🌿", desc: "Симметрия, стриженые бордюры, регулярный сад" },
  { id: "rustic",    label: "Рустикальный",    emoji: "🌾", desc: "Деревенский стиль, дикие цветы, дерево" },
  { id: "japanese",  label: "Японский",        emoji: "⛩️", desc: "Камни, мох, сакура, принцип ваби-саби" },
  { id: "english",   label: "Английский",      emoji: "🌹", desc: "Пышные цветники, извилистые дорожки, газон" },
  { id: "eco",       label: "Экостиль",        emoji: "🌱", desc: "Дикая природа, пермакультура, местные виды" },
  { id: "provence",  label: "Прованс",         emoji: "💜", desc: "Лаванда, изгороди из трав, тёплые тона" },
  { id: "mediterranean", label: "Средиземноморский", emoji: "🫒", desc: "Терракота, кипарисы, оливы, яркие краски" },
];

const ZONES = [
  { id: "terrace",   label: "Терраса / Беседка",    icon: Home },
  { id: "bbq",       label: "Мангальная зона",        icon: FlameKindling },
  { id: "kids",      label: "Детская площадка",       icon: Bike },
  { id: "garden",    label: "Огород / грядки",        icon: Shovel },
  { id: "orchard",   label: "Фруктовый сад",          icon: TreePine },
  { id: "pool",      label: "Бассейн / водоём",       icon: Waves },
  { id: "lawn",      label: "Газонная зона",           icon: Leaf },
  { id: "parking",   label: "Парковка",               icon: Home },
  { id: "hedge",     label: "Живая изгородь",         icon: Layers },
  { id: "greenhouse", label: "Теплица",               icon: Sun },
  { id: "bathhouse", label: "Зона бани / сауны",      icon: Waves },
  { id: "recreation", label: "Зона отдыха",           icon: Sun },
];

const PLANTS = [
  { id: "fruit_trees",  label: "Фруктовые деревья" },
  { id: "conifers",     label: "Хвойные (ель, сосна, туя)" },
  { id: "shrubs",       label: "Цветущие кустарники" },
  { id: "perennials",   label: "Многолетники" },
  { id: "lawn_grass",   label: "Газонная трава" },
  { id: "ornamental",   label: "Декоративные злаки" },
  { id: "climbers",     label: "Вьющиеся / лианы" },
  { id: "roses",        label: "Розы" },
  { id: "lavender",     label: "Лаванда и ароматные травы" },
  { id: "water_plants", label: "Водные растения" },
];

const STEPS = [
  { id: 1, title: "Выписка ЕГРН", icon: FileText },
  { id: 2, title: "Участок",      icon: Layers },
  { id: 3, title: "Стиль",        icon: Sparkles },
  { id: 4, title: "Зоны и растения", icon: TreePine },
  { id: 5, title: "Бюджет",       icon: Cloud },
];

// ─────────────────────────────────────────
// Компонент выбора мультивариантов
// ─────────────────────────────────────────
function MultiSelect<T extends string>({
  options, value, onChange,
}: {
  options: { id: T; label: string; icon?: React.ComponentType<any>; emoji?: string; desc?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (id: T) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all text-sm ${
              active
                ? "border-primary bg-primary/8 text-primary"
                : "border-border hover:border-primary/40 hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {opt.emoji && <span className="text-base">{opt.emoji}</span>}
              {Icon && <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />}
              <span className="font-medium leading-tight">{opt.label}</span>
            </div>
            {opt.desc && <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────
function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// ─────────────────────────────────────────
// Основная страница
// ─────────────────────────────────────────
export default function LandscapeDesign({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: survey, isLoading } = useQuery<LandscapeSurvey | null>({
    queryKey: ["/api/project", projectId, "landscape"],
    queryFn: async () => {
      const r = await fetch(`/api/project/${projectId}/landscape`);
      return r.json();
    },
  });

  // ─── Состояние формы ──────────────────
  const [step, setStep] = useState(1);
  const [egrnData, setEgrnData] = useState({ area: "", cadastral: "", address: "", owner: "", regDate: "" });
  const [plotArea, setPlotArea]         = useState("");
  const [plotShape, setPlotShape]       = useState("");
  const [terrain, setTerrain]           = useState("");
  const [soilType, setSoilType]         = useState("");
  const [groundwater, setGroundwater]   = useState("");
  const [designStyle, setDesignStyle]   = useState("");
  const [zones, setZones]               = useState<string[]>([]);
  const [plants, setPlants]             = useState<string[]>([]);
  const [budget, setBudget]             = useState("");
  const [lTimeline, setLTimeline]       = useState("");
  const [maintenance, setMaintenance]   = useState("");
  const [wishes, setWishes]             = useState("");
  const [uploading, setUploading]       = useState(false);
  const [egrnUrl, setEgrnUrl]           = useState<string | null>(null);

  // Заполняем из сохранённых данных
  useEffect(() => {
    if (!survey) return;
    const d = parseJson<typeof egrnData>(survey.egrnData, egrnData);
    setEgrnData(d);
    setPlotArea(survey.plotArea ?? "");
    setPlotShape(survey.plotShape ?? "");
    setTerrain(survey.terrain ?? "");
    setSoilType(survey.soilType ?? "");
    setGroundwater(survey.groundwater ?? "");
    setDesignStyle(survey.designStyle ?? "");
    setZones(parseJson<string[]>(survey.zones, []));
    setPlants(parseJson<string[]>(survey.plants, []));
    setBudget(survey.budget ?? "");
    setLTimeline(survey.landscapeTimeline ?? "");
    setMaintenance(survey.maintenanceLevel ?? "");
    setWishes(survey.wishes ?? "");
    setEgrnUrl(survey.egrnUrl ?? null);
    if (survey.status === "done") setStep(6);
  }, [survey]);

  // ─── Мутации ─────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await apiRequest("PATCH", `/api/project/${projectId}/landscape`, data);
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape"] }),
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/project/${projectId}/landscape/ai-concept`, {});
      if (!r.ok) throw new Error("AI unavailable");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape"] });
      if (data.aiConcept) setStep(6);
    },
    onError: () => toast({ title: "Не удалось получить AI-концепцию", description: "Проверьте GROQ_API_KEY или попробуйте позже", variant: "destructive" }),
  });

  // ─── ЕГРН загрузка ────────────────────
  async function handleEgrnUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/project/${projectId}/landscape/egrn-upload`, { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEgrnUrl(d.url);
      toast({ title: "Выписка загружена" });
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "landscape"] });
    } catch {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ─── Сохранение шага и переход ────────
  async function saveAndNext() {
    const payload: Record<string, unknown> = {};
    if (step === 1) {
      payload.egrnData = JSON.stringify(egrnData);
      if (egrnData.area) payload.plotArea = egrnData.area;
    } else if (step === 2) {
      payload.plotArea = plotArea;
      payload.plotShape = plotShape;
      payload.terrain = terrain;
      payload.soilType = soilType;
      payload.groundwater = groundwater;
    } else if (step === 3) {
      payload.designStyle = designStyle;
    } else if (step === 4) {
      payload.zones = JSON.stringify(zones);
      payload.plants = JSON.stringify(plants);
    } else if (step === 5) {
      payload.budget = budget;
      payload.landscapeTimeline = lTimeline;
      payload.maintenanceLevel = maintenance;
      payload.wishes = wishes;
      payload.status = "submitted";
    }
    await saveMutation.mutateAsync(payload);
    if (step < 5) {
      setStep(step + 1);
    } else {
      aiMutation.mutate();
    }
  }

  // ─── Прогресс ─────────────────────────
  const stepProgress = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Заголовок */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
          Ландшафтный дизайн
        </h1>
        <p className="text-sm text-muted-foreground">
          Загрузите выписку ЕГРН и заполните опрос — получите персональную концепцию дизайна участка
        </p>
      </div>

      {/* Степпер */}
      {step <= 5 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all text-center ${
                    active ? "text-primary" : done ? "text-green-600 dark:text-green-400 cursor-pointer" : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    active ? "border-primary bg-primary/10" : done ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-border bg-background"
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-medium leading-tight hidden sm:block">{s.title}</span>
                </button>
              );
            })}
          </div>
          <Progress value={stepProgress} className="h-1.5" />
          <p className="text-xs text-center text-muted-foreground">Шаг {step} из {STEPS.length}</p>
        </div>
      )}

      {/* ── ШАГ 1: ЕГРН ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Выписка из ЕГРН
            </CardTitle>
            <CardDescription>
              Загрузите файл выписки (PDF или фото) и заполните ключевые данные
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Загрузка файла */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-all space-y-2"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              ) : egrnUrl ? (
                <>
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Выписка загружена</p>
                  <p className="text-xs text-muted-foreground">{egrnUrl.split("/").pop()}</p>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); }}>
                    Заменить файл
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Нажмите чтобы выбрать файл</p>
                  <p className="text-xs text-muted-foreground">PDF, JPEG, PNG — до 20 МБ</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleEgrnUpload} />

            <Separator />

            {/* Ручной ввод данных из выписки */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Данные из выписки (заполните вручную)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Кадастровый номер</Label>
                  <Input
                    value={egrnData.cadastral}
                    onChange={(e) => setEgrnData((p) => ({ ...p, cadastral: e.target.value }))}
                    placeholder="23:43:0203003:1234"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Площадь участка (м²)</Label>
                  <Input
                    value={egrnData.area}
                    onChange={(e) => setEgrnData((p) => ({ ...p, area: e.target.value }))}
                    placeholder="1200"
                    type="number"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Адрес по ЕГРН</Label>
                  <Input
                    value={egrnData.address}
                    onChange={(e) => setEgrnData((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Краснодарский край, г. Краснодар..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Правообладатель</Label>
                  <Input
                    value={egrnData.owner}
                    onChange={(e) => setEgrnData((p) => ({ ...p, owner: e.target.value }))}
                    placeholder="Иванов И.И."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Дата регистрации</Label>
                  <Input
                    type="date"
                    value={egrnData.regDate}
                    onChange={(e) => setEgrnData((p) => ({ ...p, regDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {egrnUrl && (
              <div className="flex justify-end">
                <a href={egrnUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Открыть выписку
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ШАГ 2: Участок ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Характеристики участка
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Площадь участка (м²)</Label>
                <Input value={plotArea} onChange={(e) => setPlotArea(e.target.value)} placeholder="1200" type="number" />
              </div>
              <div className="space-y-1.5">
                <Label>Форма участка</Label>
                <Select value={plotShape} onValueChange={setPlotShape}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rectangular">Прямоугольная</SelectItem>
                    <SelectItem value="square">Квадратная</SelectItem>
                    <SelectItem value="elongated">Вытянутая (узкая)</SelectItem>
                    <SelectItem value="irregular">Неправильная форма</SelectItem>
                    <SelectItem value="corner">Угловая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Рельеф</Label>
                <Select value={terrain} onValueChange={setTerrain}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Ровный</SelectItem>
                    <SelectItem value="slight_slope">Небольшой уклон</SelectItem>
                    <SelectItem value="steep_slope">Крутой уклон</SelectItem>
                    <SelectItem value="terraced">Террасированный</SelectItem>
                    <SelectItem value="complex">Сложный рельеф</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Тип грунта</Label>
                <Select value={soilType} onValueChange={setSoilType}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clay">Глинистый</SelectItem>
                    <SelectItem value="sandy">Песчаный</SelectItem>
                    <SelectItem value="loamy">Суглинок</SelectItem>
                    <SelectItem value="chernozem">Чернозём</SelectItem>
                    <SelectItem value="rocky">Каменистый</SelectItem>
                    <SelectItem value="unknown">Не знаю</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Глубина грунтовых вод</Label>
                <Select value={groundwater} onValueChange={setGroundwater}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deep">Глубокие (&gt;3 м) — нет проблем</SelectItem>
                    <SelectItem value="medium">Средние (1–3 м) — умеренное влияние</SelectItem>
                    <SelectItem value="high">Высокие (&lt;1 м) — нужен дренаж</SelectItem>
                    <SelectItem value="unknown">Не знаю</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ШАГ 3: Стиль ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Стиль ландшафтного дизайна
            </CardTitle>
            <CardDescription>Выберите один стиль, который наиболее близок вашим предпочтениям</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DESIGN_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDesignStyle(s.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    designStyle === s.id
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <span className="text-2xl shrink-0">{s.emoji}</span>
                  <div>
                    <p className={`font-medium text-sm ${designStyle === s.id ? "text-primary" : ""}`}>{s.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                  {designStyle === s.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-auto mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ШАГ 4: Зоны и растения ── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                Функциональные зоны
              </CardTitle>
              <CardDescription>Отметьте зоны, которые нужны на вашем участке</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect options={ZONES} value={zones} onChange={setZones} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TreePine className="w-4 h-4 text-primary" />
                Растения и покрытия
              </CardTitle>
              <CardDescription>Что хотите видеть на участке?</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect options={PLANTS} value={plants} onChange={setPlants} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ШАГ 5: Бюджет ── */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="w-4 h-4 text-primary" />
              Бюджет и предпочтения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Бюджет на ландшафтные работы</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger><SelectValue placeholder="Укажите бюджет" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="up_300">До 300 000 ₽</SelectItem>
                  <SelectItem value="300_700">300 000 — 700 000 ₽</SelectItem>
                  <SelectItem value="700_1500">700 000 — 1 500 000 ₽</SelectItem>
                  <SelectItem value="1500_3000">1 500 000 — 3 000 000 ₽</SelectItem>
                  <SelectItem value="over_3000">Свыше 3 000 000 ₽</SelectItem>
                  <SelectItem value="flexible">Гибкий / обсудим</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Планируемые сроки выполнения</Label>
              <Select value={lTimeline} onValueChange={setLTimeline}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asap">Как можно скорее</SelectItem>
                  <SelectItem value="spring">Весна этого года</SelectItem>
                  <SelectItem value="summer">Лето этого года</SelectItem>
                  <SelectItem value="autumn">Осень этого года</SelectItem>
                  <SelectItem value="next_year">Следующий год</SelectItem>
                  <SelectItem value="flexible">Гибко</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Желаемый уровень ухода за участком</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "low", label: "Минимальный", desc: "Засухоустойчивые растения, мульча, редкий полив" },
                  { v: "medium", label: "Средний",     desc: "Сезонный уход, автополив, регулярная стрижка" },
                  { v: "high",   label: "Интенсивный", desc: "Розарии, газон-жемчуг, профессиональный уход" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setMaintenance(opt.v)}
                    className={`flex flex-col gap-1 p-3 rounded-lg border-2 text-left text-xs transition-all ${
                      maintenance === opt.v ? "border-primary bg-primary/8" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`font-semibold text-sm ${maintenance === opt.v ? "text-primary" : ""}`}>{opt.label}</span>
                    <span className="text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Дополнительные пожелания</Label>
              <Textarea
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                rows={4}
                placeholder="Особые пожелания к дизайну, растениям, материалам, аллергии на пыльцу, любимые растения, что категорически не нравится..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ШАГ 6: AI Результат ── */}
      {step === 6 && survey?.aiConcept && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Концепция готова
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setStep(1); aiMutation.reset(); }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Пройти опрос заново
            </Button>
          </div>

          {/* Данные из ЕГРН */}
          {(egrnData.cadastral || egrnData.area || egrnData.address) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Данные из выписки ЕГРН
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                  {egrnData.cadastral && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Кад. номер:</span>
                      <span className="font-mono">{egrnData.cadastral}</span>
                    </div>
                  )}
                  {egrnData.area && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Площадь:</span>
                      <span>{egrnData.area} м²</span>
                    </div>
                  )}
                  {egrnData.address && (
                    <div className="flex gap-2 sm:col-span-2">
                      <span className="text-muted-foreground shrink-0">Адрес:</span>
                      <span>{egrnData.address}</span>
                    </div>
                  )}
                  {egrnData.owner && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Владелец:</span>
                      <span>{egrnData.owner}</span>
                    </div>
                  )}
                </div>
                {egrnUrl && (
                  <a href={egrnUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex">
                    <Button variant="outline" size="sm">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Открыть выписку
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Концепция */}
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                Концепция ландшафтного дизайна
                <Badge variant="outline" className="ml-auto text-xs">
                  ИИ-анализ
                </Badge>
              </CardTitle>
              {designStyle && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-lg">{DESIGN_STYLES.find((s) => s.id === designStyle)?.emoji}</span>
                  <span className="text-sm text-muted-foreground">
                    {DESIGN_STYLES.find((s) => s.id === designStyle)?.label}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {survey.aiConcept.split("\n").filter(Boolean).map((para, i) => {
                  const isHeader = /^\d+\./.test(para.trim());
                  return isHeader ? (
                    <p key={i} className="font-semibold text-foreground mt-4 mb-1 first:mt-0">{para}</p>
                  ) : (
                    <p key={i} className="text-sm text-foreground/85 leading-relaxed mb-2">{para}</p>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Краткий итог опроса */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Параметры участка из опроса</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {plotArea && <Badge variant="outline">{plotArea} м²</Badge>}
                {terrain && <Badge variant="outline">{terrain}</Badge>}
                {soilType && <Badge variant="outline">{soilType}</Badge>}
                {zones.map((z) => (
                  <Badge key={z} variant="secondary">{ZONES.find((o) => o.id === z)?.label ?? z}</Badge>
                ))}
                {plants.map((p) => (
                  <Badge key={p} variant="outline" className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                    {PLANTS.find((o) => o.id === p)?.label ?? p}
                  </Badge>
                ))}
                {budget && <Badge variant="secondary">Бюджет: {budget}</Badge>}
                {maintenance && <Badge variant="outline">Уход: {maintenance}</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Кнопки навигации / генерация */}
      {step <= 5 && (
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={saveAndNext}
            disabled={saveMutation.isPending || aiMutation.isPending}
          >
            {(saveMutation.isPending || aiMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {step < 5 ? (
              <><span>Далее</span><ChevronRight className="w-4 h-4 ml-1" /></>
            ) : aiMutation.isPending ? (
              "Генерируем концепцию..."
            ) : (
              <><BrainCircuit className="w-4 h-4 mr-1.5" />Получить концепцию ИИ</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
