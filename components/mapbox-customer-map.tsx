"use client";

import { useEffect, useRef, useState } from "react";

type Point = { lat: number; lng: number };
type DriverPoint = { lat: number; lng: number; updatedAt?: string } | null;
type GeoJsonLine = { type: "Feature"; properties: Record<string, never>; geometry: { type: "LineString"; coordinates: [number, number][] } };
type MapSource = { setData(data: GeoJsonLine): void };
type MapInstance = {
  on(event: string, callback: () => void): void;
  addControl(control: unknown, position?: string): void;
  addSource(id: string, source: unknown): void;
  getSource(id: string): MapSource | undefined;
  addLayer(layer: unknown): void;
  getLayer(id: string): unknown;
  removeLayer(id: string): void;
  removeSource(id: string): void;
  fitBounds(bounds: [[number, number], [number, number]], options?: { padding?: number; maxZoom?: number }): void;
  flyTo(options: { center: [number, number]; zoom?: number }): void;
  remove(): void;
};
type MarkerInstance = {
  setLngLat(coordinates: [number, number]): MarkerInstance;
  addTo(map: MapInstance): MarkerInstance;
  remove(): void;
};
type MapboxNamespace = {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapInstance;
  Marker: new (options?: Record<string, unknown>) => MarkerInstance;
  NavigationControl: new () => unknown;
};
declare global {
  interface Window { mapboxgl?: MapboxNamespace }
}

type Props = {
  pickupPoint: Point | null;
  destinationPoint: Point | null;
  driverLocation: DriverPoint;
  onRouteSummary: (summary: string | null) => void;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function markerElement(label: string, color: string) {
  const element = document.createElement("div");
  element.textContent = label;
  element.setAttribute("aria-label", label);
  Object.assign(element.style, {
    width: "34px", height: "34px", borderRadius: "50% 50% 50% 8px",
    transform: "rotate(-45deg)", display: "grid", placeItems: "center",
    background: color, color: "#101923", border: "3px solid #fff",
    boxShadow: "0 4px 16px rgba(0,0,0,.45)", fontWeight: "900",
  });
  const text = document.createElement("span");
  text.textContent = label;
  text.style.transform = "rotate(45deg)";
  element.replaceChildren(text);
  return element;
}

export function MapboxCustomerMap({ pickupPoint, destinationPoint, driverLocation, onRouteSummary }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const pickupMarker = useRef<MarkerInstance | null>(null);
  const destinationMarker = useRef<MarkerInstance | null>(null);
  const driverMarker = useRef<MarkerInstance | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!MAPBOX_TOKEN || !container.current) {
      setError("أضف NEXT_PUBLIC_MAPBOX_TOKEN إلى إعدادات Vercel لتشغيل الخريطة.");
      return;
    }
    let cancelled = false;
    const start = () => {
      if (cancelled || !window.mapboxgl || !container.current || map.current) return;
      window.mapboxgl.accessToken = MAPBOX_TOKEN;
      const instance = new window.mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [33.803, 31.132],
        zoom: 12,
        cooperativeGestures: true,
        attributionControl: true,
      });
      map.current = instance;
      instance.addControl(new window.mapboxgl.NavigationControl(), "top-left");
      instance.on("load", () => { if (!cancelled) setLoaded(true); });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-capital-taxi-mapbox]");
    const cssId = "capital-taxi-mapbox-css";
    if (!document.getElementById(cssId)) {
      const css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(css);
    }
    if (window.mapboxgl) start();
    else if (existing) existing.addEventListener("load", start, { once: true });
    else {
      const script = document.createElement("script");
      script.dataset.capitalTaxiMapbox = "true";
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
      script.async = true;
      script.onload = start;
      script.onerror = () => { if (!cancelled) setError("تعذر تحميل مكتبة Mapbox. تحقق من الاتصال وإعدادات النطاق."); };
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      pickupMarker.current?.remove();
      destinationMarker.current?.remove();
      driverMarker.current?.remove();
      map.current?.remove();
      pickupMarker.current = null;
      destinationMarker.current = null;
      driverMarker.current = null;
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance || !window.mapboxgl) return;
    const syncMarker = (point: Point | null, marker: { current: MarkerInstance | null }, label: string, color: string) => {
      if (!point) {
        marker.current?.remove();
        marker.current = null;
        return;
      }
      if (!marker.current) marker.current = new window.mapboxgl!.Marker({ element: markerElement(label, color) }).addTo(instance);
      marker.current.setLngLat([point.lng, point.lat]);
    };
    syncMarker(pickupPoint, pickupMarker, "ب", "#e6bd68");
    syncMarker(destinationPoint, destinationMarker, "و", "#c7d0d9");
    syncMarker(driverLocation, driverMarker, "س", "#73c6a0");

    const points = [pickupPoint, destinationPoint].filter((point): point is Point => Boolean(point));
    if (points.length === 2) {
      const lngs = points.map((point) => point.lng);
      const lats = points.map((point) => point.lat);
      instance.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 64, maxZoom: 15 });
    } else if (points[0]) {
      instance.flyTo({ center: [points[0].lng, points[0].lat], zoom: 15 });
    } else if (driverLocation) {
      instance.flyTo({ center: [driverLocation.lng, driverLocation.lat], zoom: 14 });
    }
  }, [loaded, pickupPoint, destinationPoint, driverLocation]);

  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance || !pickupPoint || !destinationPoint || !MAPBOX_TOKEN) {
      onRouteSummary(null);
      if (instance?.getLayer("capital-taxi-route")) instance.removeLayer("capital-taxi-route");
      if (instance?.getSource("capital-taxi-route")) instance.removeSource("capital-taxi-route");
      return;
    }
    let cancelled = false;
    onRouteSummary("جارٍ حساب مسار القيادة عبر Mapbox…");
    const coordinates = `${pickupPoint.lng},${pickupPoint.lat};${destinationPoint.lng},${destinationPoint.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;
    void fetch(url).then(async (response) => {
      if (!response.ok) throw new Error("Mapbox Directions request failed");
      return response.json() as Promise<{ routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[] }>;
    }).then((data) => {
      if (cancelled) return;
      const route = data.routes?.[0];
      const routeCoordinates = route?.geometry?.coordinates;
      if (!routeCoordinates?.length) throw new Error("No route returned");
      const feature: GeoJsonLine = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeCoordinates } };
      if (instance.getLayer("capital-taxi-route")) instance.removeLayer("capital-taxi-route");
      if (instance.getSource("capital-taxi-route")) instance.removeSource("capital-taxi-route");
      instance.addSource("capital-taxi-route", { type: "geojson", data: feature });
      instance.addLayer({
        id: "capital-taxi-route", type: "line", source: "capital-taxi-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e6bd68", "line-width": 5, "line-opacity": 0.95 },
      });
      const km = (route.distance ?? 0) / 1000;
      const minutes = Math.max(1, Math.round((route.duration ?? 0) / 60));
      onRouteSummary(km > 0 ? `مسار Mapbox: ${km.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} كم • ${minutes} دقيقة تقريباً` : "تم رسم مسار القيادة عبر Mapbox.");
    }).catch(() => {
      if (!cancelled) onRouteSummary("تعذر جلب مسار Mapbox. تحقق من صلاحية Directions API للمفتاح.");
    });
    return () => { cancelled = true; };
  }, [loaded, pickupPoint, destinationPoint, onRouteSummary]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full min-h-[256px] w-full" role="img" aria-label="خريطة Mapbox تفاعلية لنقاط الرحلة وموقع السائق" />
      {error && <div className="absolute inset-0 grid place-items-center bg-[#101a27] p-5 text-center text-xs leading-6 text-[var(--app-muted)]">{error}</div>}
      {!loaded && !error && <div className="absolute inset-0 grid place-items-center bg-[#101a27] text-xs text-[var(--app-muted)]">جارٍ تحميل خريطة Mapbox…</div>}
    </div>
  );
}
