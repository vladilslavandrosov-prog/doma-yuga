import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  address: string;
  className?: string;
  communicationsNotes?: string | null;
}

const UTILITY_TYPES = [
  { key: "газ", label: "Газ", color: "#f97316", border: "#c2410c" },
  { key: "вода", label: "Вода", color: "#3b82f6", border: "#1d4ed8" },
  { key: "электр", label: "Электричество", color: "#eab308", border: "#a16207" },
  { key: "канализ", label: "Канализация", color: "#8b5cf6", border: "#6d28d9" },
];

function parseUtilities(notes: string | null | undefined) {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  return UTILITY_TYPES.filter(u => lower.includes(u.key));
}

export function LeafletMap({ address, className = "", communicationsNotes }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [showCadastral, setShowCadastral] = useState(true);
  const cadastralLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;

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

      const map = L.map(containerRef.current, { attributionControl: false }).setView([lat, lon], 17);
      mapRef.current = map;

      // Базовый слой OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
      }).addTo(map);

      // Кадастровый слой Росреестра (границы участков)
      const cadastral = L.tileLayer(
        "https://pkk.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 20, opacity: 0.7 }
      );
      cadastral.addTo(map);
      cadastralLayerRef.current = cadastral;

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${address}</b>`)
        .openPopup();
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [address]);

  // Переключение кадастрового слоя
  useEffect(() => {
    if (!cadastralLayerRef.current || !mapRef.current) return;
    if (showCadastral) {
      cadastralLayerRef.current.addTo(mapRef.current);
    } else {
      cadastralLayerRef.current.remove();
    }
  }, [showCadastral]);

  const utilities = parseUtilities(communicationsNotes);

  return (
    <div className="relative">
      <div ref={containerRef} className={className} style={{ zIndex: 0 }} />
      {utilities.length > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-md shadow px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Коммуникации</p>
          {utilities.map(u => (
            <div key={u.key} className="flex items-center gap-2">
              <span className="inline-block w-6 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: u.color, border: `1.5px solid ${u.border}` }} />
              <span className="text-xs text-gray-700">{u.label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setShowCadastral(v => !v)}
        className={`absolute bottom-3 right-3 z-[1000] text-xs px-3 py-1.5 rounded-md shadow font-medium transition-colors ${
          showCadastral
            ? "bg-primary text-primary-foreground"
            : "bg-background border text-foreground"
        }`}
      >
        {showCadastral ? "Скрыть участки" : "Показать участки"}
      </button>
    </div>
  );
}
