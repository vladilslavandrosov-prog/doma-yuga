import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";

export interface UtilityFeature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: { utilityType: string; label: string; owner?: string };
}

export interface UtilityGeoJSON {
  type: "FeatureCollection";
  features: UtilityFeature[];
}

export const UTILITY_TYPES = [
  { key: "электр", label: "Электричество", color: "#eab308", dash: "" },
  { key: "газ",    label: "Газ",            color: "#f97316", dash: "8,4" },
  { key: "вода",   label: "Вода",           color: "#3b82f6", dash: "4,4" },
  { key: "канализ",label: "Канализация",    color: "#8b5cf6", dash: "12,4,4,4" },
];

function utilityColor(key: string) {
  return UTILITY_TYPES.find(u => u.key === key)?.color ?? "#6b7280";
}
function utilityDash(key: string) {
  return UTILITY_TYPES.find(u => u.key === key)?.dash ?? "";
}

interface LeafletMapProps {
  address: string;
  className?: string;
  communicationsNotes?: string | null;
  communicationsGeojson?: string | null;
  isAdmin?: boolean;
  projectId?: number;
  onGeojsonChange?: (geojson: string) => void;
}

export function LeafletMap({
  address,
  className = "",
  communicationsNotes,
  communicationsGeojson,
  isAdmin,
  projectId,
  onGeojsonChange,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const cadastralLayerRef = useRef<any>(null);
  const utilLayerRef = useRef<any>(null);
  const drawLayerRef = useRef<any>(null);
  const drawingRef = useRef<boolean>(false);
  const currentLineRef = useRef<any>(null);
  const currentCoordsRef = useRef<[number, number][]>([]);
  const geojsonRef = useRef<UtilityGeoJSON>({ type: "FeatureCollection", features: [] });

  const [showCadastral, setShowCadastral] = useState(true);
  const [drawMode, setDrawMode] = useState(false);
  const [activeUtility, setActiveUtility] = useState(UTILITY_TYPES[0].key);
  const [ownerInput, setOwnerInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Parse and keep geojson in sync
  useEffect(() => {
    if (communicationsGeojson) {
      try {
        geojsonRef.current = JSON.parse(communicationsGeojson);
      } catch {
        geojsonRef.current = { type: "FeatureCollection", features: [] };
      }
    } else {
      geojsonRef.current = { type: "FeatureCollection", features: [] };
    }
    renderUtilityLines();
  }, [communicationsGeojson]);

  function renderUtilityLines() {
    const L = (window as any)._L;
    if (!L || !mapRef.current) return;
    if (utilLayerRef.current) utilLayerRef.current.clearLayers();
    const features = geojsonRef.current.features;
    features.forEach(f => {
      const latlngs = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const color = utilityColor(f.properties.utilityType);
      const dash = utilityDash(f.properties.utilityType);
      const line = L.polyline(latlngs, { color, weight: 5, dashArray: dash || undefined, opacity: 0.85 });
      const label = f.properties.label + (f.properties.owner ? `\n${f.properties.owner}` : "");
      line.bindTooltip(label, { sticky: true, className: "util-tooltip" });
      if (utilLayerRef.current) utilLayerRef.current.addLayer(line);
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      (window as any)._L = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { "Accept-Language": "ru" } }
      );
      const geoData = await geoRes.json();
      if (cancelled || !containerRef.current) return;

      const lat = geoData[0] ? parseFloat(geoData[0].lat) : 55.7558;
      const lon = geoData[0] ? parseFloat(geoData[0].lon) : 37.6173;

      const map = L.map(containerRef.current, { attributionControl: false }).setView([lat, lon], 19);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 21 }).addTo(map);

      // Кадастровый слой Росреестра
      const cadastral = L.tileLayer(
        "https://pkk.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 21, opacity: 0.65 }
      );
      cadastral.addTo(map);
      cadastralLayerRef.current = cadastral;

      // Слой коммуникаций
      const utilLayer = L.layerGroup().addTo(map);
      utilLayerRef.current = utilLayer;

      // Слой рисования
      const drawLayer = L.layerGroup().addTo(map);
      drawLayerRef.current = drawLayer;

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${address}</b>`)
        .openPopup();

      // Рендерим уже загруженные линии
      renderUtilityLines();
    }

    init().catch(console.error);
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      (window as any)._L = undefined;
    };
  }, [address]);

  // Кадастровый слой toggle
  useEffect(() => {
    const map = mapRef.current;
    const layer = cadastralLayerRef.current;
    if (!map || !layer) return;
    if (showCadastral) layer.addTo(map); else layer.remove();
  }, [showCadastral]);

  // Draw mode — вешаем/снимаем обработчики кликов
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawMode) {
      map.getContainer().style.cursor = "crosshair";
      map.on("click", handleMapClick);
      map.on("dblclick", handleMapDblClick);
    } else {
      map.getContainer().style.cursor = "";
      map.off("click", handleMapClick);
      map.off("dblclick", handleMapDblClick);
      cancelCurrentLine();
    }
    return () => {
      map.off("click", handleMapClick);
      map.off("dblclick", handleMapDblClick);
    };
  }, [drawMode, activeUtility, ownerInput]);

  function handleMapClick(e: any) {
    const L = (window as any)._L;
    if (!L || !mapRef.current) return;
    const { lat, lng } = e.latlng;
    currentCoordsRef.current.push([lng, lat]);

    if (!currentLineRef.current) {
      const color = utilityColor(activeUtility);
      const dash = utilityDash(activeUtility);
      currentLineRef.current = L.polyline([[lat, lng]], {
        color, weight: 5, dashArray: dash || undefined, opacity: 0.85
      }).addTo(drawLayerRef.current);
    } else {
      const latlngs = currentCoordsRef.current.map(([lng, lat]) => [lat, lng]);
      currentLineRef.current.setLatLngs(latlngs);
    }
  }

  function handleMapDblClick(e: any) {
    e.originalEvent?.preventDefault();
    finishCurrentLine();
  }

  function finishCurrentLine() {
    if (currentCoordsRef.current.length < 2) {
      cancelCurrentLine();
      return;
    }
    const utilInfo = UTILITY_TYPES.find(u => u.key === activeUtility)!;
    const feature: UtilityFeature = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [...currentCoordsRef.current] },
      properties: { utilityType: activeUtility, label: utilInfo.label, owner: ownerInput.trim() || undefined },
    };
    geojsonRef.current = {
      type: "FeatureCollection",
      features: [...geojsonRef.current.features, feature],
    };
    currentLineRef.current = null;
    currentCoordsRef.current = [];
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    renderUtilityLines();
    onGeojsonChange?.(JSON.stringify(geojsonRef.current));
  }

  function cancelCurrentLine() {
    currentLineRef.current = null;
    currentCoordsRef.current = [];
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
  }

  function deleteLastFeature() {
    const features = geojsonRef.current.features;
    if (!features.length) return;
    geojsonRef.current = { type: "FeatureCollection", features: features.slice(0, -1) };
    renderUtilityLines();
    onGeojsonChange?.(JSON.stringify(geojsonRef.current));
  }

  async function saveGeojson() {
    if (!projectId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/house-plan/geojson", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, communicationsGeojson: JSON.stringify(geojsonRef.current) }),
      });
    } finally {
      setSaving(false);
    }
  }

  const utilInfo = UTILITY_TYPES.find(u => u.key === activeUtility)!;

  return (
    <div className="relative">
      {/* Легенда коммуникаций */}
      {geojsonRef.current.features.length > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/92 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 space-y-1.5 max-w-[200px]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Коммуникации</p>
          {Array.from(new Set(geojsonRef.current.features.map(f => f.properties.utilityType))).map(type => {
            const u = UTILITY_TYPES.find(x => x.key === type);
            const owners = [...new Set(geojsonRef.current.features.filter(f => f.properties.utilityType === type).map(f => f.properties.owner).filter(Boolean))];
            return (
              <div key={type} className="flex items-start gap-2">
                <svg width="24" height="12" className="mt-0.5 flex-shrink-0">
                  <line x1="0" y1="6" x2="24" y2="6" stroke={u?.color ?? "#888"} strokeWidth="3"
                    strokeDasharray={u?.dash || undefined} />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-700 leading-none">{u?.label ?? type}</p>
                  {owners.map(o => <p key={o} className="text-[10px] text-gray-500">{o}</p>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Инструменты рисования (только для админа) */}
      {isAdmin && (
        <div className="absolute top-3 right-12 z-[1000] flex flex-col gap-2 items-end">
          <button
            onClick={() => setDrawMode(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-md shadow font-medium transition-colors ${
              drawMode ? "bg-orange-500 text-white" : "bg-white border text-gray-700 hover:bg-gray-50"
            }`}
          >
            {drawMode ? "✏️ Рисование ON" : "✏️ Коммуникации"}
          </button>

          {drawMode && (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2 w-56">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Тип линии</p>
              <div className="grid grid-cols-2 gap-1">
                {UTILITY_TYPES.map(u => (
                  <button
                    key={u.key}
                    onClick={() => setActiveUtility(u.key)}
                    className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                      activeUtility === u.key ? "text-white border-transparent" : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={activeUtility === u.key ? { backgroundColor: u.color, borderColor: u.color } : {}}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <input
                className="w-full text-xs border rounded px-2 py-1 outline-none focus:ring-1"
                placeholder="Владелец (напр. Электросети)"
                value={ownerInput}
                onChange={e => setOwnerInput(e.target.value)}
              />
              <p className="text-[10px] text-gray-400">Кликайте на карте — двойной клик завершает линию</p>
              <div className="flex gap-1">
                <button
                  onClick={deleteLastFeature}
                  className="flex-1 text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                >
                  ↩ Удалить последнюю
                </button>
                <button
                  onClick={saveGeojson}
                  disabled={saving}
                  className="flex-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                >
                  {saving ? "..." : "💾 Сохранить"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className={className} style={{ zIndex: 0 }} />

      {/* Кадастровый слой toggle */}
      <button
        onClick={() => setShowCadastral(v => !v)}
        className={`absolute bottom-3 right-3 z-[1000] text-xs px-3 py-1.5 rounded-md shadow font-medium transition-colors ${
          showCadastral ? "bg-primary text-primary-foreground" : "bg-background border text-foreground"
        }`}
      >
        {showCadastral ? "Скрыть участки" : "Показать участки"}
      </button>

      <style>{`.util-tooltip { background: white; border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.2); font-size: 12px; white-space: pre-line; }`}</style>
    </div>
  );
}
