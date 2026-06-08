import { useEffect, useRef, useState } from "react";
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
  { key: "электр",  label: "Электричество", color: "#eab308", dash: "" },
  { key: "газ",     label: "Газ",            color: "#f97316", dash: "8,4" },
  { key: "вода",    label: "Вода",           color: "#3b82f6", dash: "4,4" },
  { key: "канализ", label: "Канализация",    color: "#8b5cf6", dash: "12,4,4,4" },
];

function uColor(key: string) { return UTILITY_TYPES.find(u => u.key === key)?.color ?? "#6b7280"; }
function uDash(key: string)  { return UTILITY_TYPES.find(u => u.key === key)?.dash  ?? ""; }

function parseGeoJSON(raw: string | null | undefined): UtilityGeoJSON {
  if (!raw) return { type: "FeatureCollection", features: [] };
  try { return JSON.parse(raw); } catch { return { type: "FeatureCollection", features: [] }; }
}

interface Props {
  address: string;
  className?: string;
  communicationsNotes?: string | null;
  communicationsGeojson?: string | null;
  isAdmin?: boolean;
  projectId?: number;
}

export function LeafletMap({ address, className = "", communicationsGeojson, isAdmin, projectId }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const LRef          = useRef<any>(null);
  const cadastralRef  = useRef<any>(null);
  const utilLayerRef  = useRef<any>(null);
  const drawLayerRef  = useRef<any>(null);
  const currentLineRef   = useRef<any>(null);
  const currentCoordsRef = useRef<[number, number][]>([]);
  const geojsonRef    = useRef<UtilityGeoJSON>(parseGeoJSON(communicationsGeojson));

  const [showCadastral, setShowCadastral] = useState(true);
  const [mapReady, setMapReady]   = useState(false);
  const [drawMode, setDrawMode]   = useState(false);
  const [activeUtil, setActiveUtil] = useState(UTILITY_TYPES[0].key);
  const [ownerInput, setOwnerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [featCount, setFeatCount] = useState(geojsonRef.current.features.length);

  // Синхронизируем prop → ref и перерисовываем
  useEffect(() => {
    geojsonRef.current = parseGeoJSON(communicationsGeojson);
    setFeatCount(geojsonRef.current.features.length);
    renderLines();
  }, [communicationsGeojson]);

  function renderLines() {
    const L = LRef.current;
    const layer = utilLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const f of geojsonRef.current.features) {
      const lls = f.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const color = uColor(f.properties.utilityType);
      const dash  = uDash(f.properties.utilityType);
      const line  = L.polyline(lls, { color, weight: 5, dashArray: dash || undefined, opacity: 0.88 });
      const tip   = f.properties.label + (f.properties.owner ? `\n${f.properties.owner}` : "");
      line.bindTooltip(tip, { sticky: true, className: "util-tip" });
      layer.addLayer(line);
    }
  }

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      LRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { "Accept-Language": "ru" } }
      ).then(r => r.json()).catch(() => []);

      if (cancelled || !containerRef.current) return;

      const lat = geo[0] ? parseFloat(geo[0].lat) : 55.7558;
      const lon = geo[0] ? parseFloat(geo[0].lon) : 37.6173;

      const map = L.map(containerRef.current, { attributionControl: false }).setView([lat, lon], 19);
      mapRef.current = map;

      // OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 21 }).addTo(map);

      // Кадастровый слой Росреестра
      const cad = L.tileLayer(
        "https://pkk.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 21, opacity: 0.7, errorTileUrl: "" }
      );
      cad.addTo(map);
      cadastralRef.current = cad;

      // Слои коммуникаций и рисования
      utilLayerRef.current = L.layerGroup().addTo(map);
      drawLayerRef.current = L.layerGroup().addTo(map);

      L.marker([lat, lon]).addTo(map).bindPopup(`<b>${address}</b>`).openPopup();

      setMapReady(true);
      renderLines();
    })().catch(console.error);

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
    };
  }, [address]);

  // Кадастр toggle
  useEffect(() => {
    const map = mapRef.current; const cad = cadastralRef.current;
    if (!map || !cad) return;
    showCadastral ? cad.addTo(map) : cad.remove();
  }, [showCadastral, mapReady]);

  // Draw режим
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function onClick(e: any) {
      const L = LRef.current; if (!L) return;
      const { lat, lng } = e.latlng;
      currentCoordsRef.current.push([lng, lat]);
      if (!currentLineRef.current) {
        currentLineRef.current = L.polyline([[lat, lng]], {
          color: uColor(activeUtil), weight: 5,
          dashArray: uDash(activeUtil) || undefined, opacity: 0.85,
        }).addTo(drawLayerRef.current);
      } else {
        currentLineRef.current.setLatLngs(
          currentCoordsRef.current.map(([lng, lat]) => [lat, lng])
        );
      }
    }

    function onDblClick(e: any) {
      e.originalEvent?.preventDefault();
      if (currentCoordsRef.current.length < 2) { cancelDraw(); return; }
      const uInfo = UTILITY_TYPES.find(u => u.key === activeUtil)!;
      geojsonRef.current = {
        type: "FeatureCollection",
        features: [...geojsonRef.current.features, {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [...currentCoordsRef.current] },
          properties: { utilityType: activeUtil, label: uInfo.label, owner: ownerInput.trim() || undefined },
        }],
      };
      currentLineRef.current = null; currentCoordsRef.current = [];
      drawLayerRef.current?.clearLayers();
      renderLines();
      setFeatCount(geojsonRef.current.features.length);
    }

    if (drawMode) {
      map.getContainer().style.cursor = "crosshair";
      map.on("click", onClick); map.on("dblclick", onDblClick);
    } else {
      map.getContainer().style.cursor = "";
      map.off("click", onClick); map.off("dblclick", onDblClick);
      cancelDraw();
    }
    return () => { map.off("click", onClick); map.off("dblclick", onDblClick); };
  }, [drawMode, activeUtil, ownerInput, mapReady]);

  function cancelDraw() {
    currentLineRef.current = null; currentCoordsRef.current = [];
    drawLayerRef.current?.clearLayers();
  }

  function deleteLast() {
    const f = geojsonRef.current.features;
    if (!f.length) return;
    geojsonRef.current = { type: "FeatureCollection", features: f.slice(0, -1) };
    renderLines(); setFeatCount(geojsonRef.current.features.length);
  }

  async function saveGeo() {
    if (!projectId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/house-plan/geojson", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, communicationsGeojson: JSON.stringify(geojsonRef.current) }),
      });
    } finally { setSaving(false); }
  }

  const uniqueTypes = [...new Set(geojsonRef.current.features.map(f => f.properties.utilityType))];

  return (
    <div className="relative">
      {/* Легенда */}
      {featCount > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/92 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 space-y-1.5 max-w-[200px]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Коммуникации</p>
          {uniqueTypes.map(type => {
            const u = UTILITY_TYPES.find(x => x.key === type);
            const owners = [...new Set(
              geojsonRef.current.features
                .filter(f => f.properties.utilityType === type)
                .map(f => f.properties.owner).filter(Boolean)
            )];
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

      {/* Инструменты рисования */}
      {isAdmin && (
        <div className="absolute top-3 right-12 z-[1000] flex flex-col gap-2 items-end">
          <button
            onClick={() => setDrawMode(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-md shadow font-medium transition-colors ${
              drawMode ? "bg-orange-500 text-white" : "bg-white border text-gray-700 hover:bg-gray-50"
            }`}
          >
            {drawMode ? "✏️ Рисование ВКЛ" : "✏️ Коммуникации"}
          </button>

          {drawMode && (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2 w-56">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Тип линии</p>
              <div className="grid grid-cols-2 gap-1">
                {UTILITY_TYPES.map(u => (
                  <button key={u.key} onClick={() => setActiveUtil(u.key)}
                    className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                      activeUtil === u.key ? "text-white border-transparent" : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={activeUtil === u.key ? { backgroundColor: u.color, borderColor: u.color } : {}}
                  >{u.label}</button>
                ))}
              </div>
              <input
                className="w-full text-xs border rounded px-2 py-1 outline-none focus:ring-1"
                placeholder="Владелец (напр. Электросети)"
                value={ownerInput} onChange={e => setOwnerInput(e.target.value)}
              />
              <p className="text-[10px] text-gray-400">Клики — точки линии, двойной клик — завершить</p>
              <div className="flex gap-1">
                <button onClick={deleteLast}
                  className="flex-1 text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                >↩ Удалить</button>
                <button onClick={saveGeo} disabled={saving}
                  className="flex-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                >{saving ? "..." : "💾 Сохранить"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className={className} style={{ zIndex: 0 }} />

      <button
        onClick={() => setShowCadastral(v => !v)}
        className={`absolute bottom-3 right-3 z-[1000] text-xs px-3 py-1.5 rounded-md shadow font-medium transition-colors ${
          showCadastral ? "bg-primary text-primary-foreground" : "bg-background border text-foreground"
        }`}
      >
        {showCadastral ? "Скрыть участки" : "Кадастр"}
      </button>

      <style>{`.util-tip{background:white;border:none;box-shadow:0 1px 4px rgba(0,0,0,.2);font-size:12px;white-space:pre-line;padding:4px 8px;border-radius:4px}`}</style>
    </div>
  );
}
