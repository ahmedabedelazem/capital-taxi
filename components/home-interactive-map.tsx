"use client";

import { useEffect, useRef, useState } from "react";

type MapboxApi = {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => {
    on(event: string, callback: () => void): void;
    addControl(control: unknown, position?: string): void;
    remove(): void;
  };
  NavigationControl: new () => unknown;
  GeolocateControl: new (options?: Record<string, unknown>) => unknown;
  Marker: new (options?: Record<string, unknown>) => {
    setLngLat(point: [number, number]): { addTo(map: unknown): unknown };
  };
};
function getMapboxApi(): MapboxApi | undefined {
  return (window as unknown as { mapboxgl?: MapboxApi }).mapboxgl;
}

export function HomeInteractiveMap() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("جارٍ تجهيز خريطة العريش…");

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !container.current) {
      setStatus("خريطة Mapbox تحتاج إعداد مفتاح NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }
    let disposed = false;
    let map: InstanceType<MapboxApi["Map"]> | null = null;
    const initialize = () => {
      if (disposed || !container.current || !getMapboxApi() || map) return;
      const api = getMapboxApi();
      if (!api) return;
      api.accessToken = token;
      map = new api.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [33.8019, 31.1317],
        zoom: 12.6,
        pitch: 28,
        attributionControl: true,
      });
      map.addControl(new api.NavigationControl(), "top-left");
      map.addControl(new api.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }), "top-left");
      new api.Marker({ color: "#e5bd70" })
        .setLngLat([33.8019, 31.1317])
        .addTo(map);
      map.on("load", () => { if (!disposed) setStatus("خريطة تفاعلية · العريش، شمال سيناء"); });
    };

    const cssId = "capital-home-mapbox-css";
    if (!document.getElementById(cssId)) {
      const css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(css);
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-capital-home-mapbox]");
    if (getMapboxApi()) initialize();
    else if (existing) existing.addEventListener("load", initialize, { once: true });
    else {
      const script = document.createElement("script");
      script.dataset.capitalHomeMapbox = "true";
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
      script.async = true;
      script.onload = initialize;
      script.onerror = () => { if (!disposed) setStatus("تعذر تحميل الخريطة. تحقق من الاتصال وإعدادات Mapbox."); };
      document.head.appendChild(script);
    }
    return () => {
      disposed = true;
      map?.remove();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[390px] w-full bg-[#101a27]">
      <div ref={container} className="absolute inset-0" role="application" aria-label="خريطة تفاعلية لمدينة العريش" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-[#07101c]/90 to-transparent p-4">
        <div className="rounded-full border border-white/15 bg-[#08111d]/80 px-3 py-2 text-[10px] font-extrabold text-[#f1d18e] backdrop-blur">CAPITAL TAXI · LIVE MAP VIEW</div>
        <div className="rounded-full border border-[#7ac49b]/30 bg-[#08111d]/85 px-3 py-2 text-[10px] font-bold text-[#b8e4ca] backdrop-blur">العريش</div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#07101c]/95 to-transparent px-5 pb-5 pt-12">
        <p className="text-xs font-black text-white">استكشف شوارع العريش</p>
        <p className="mt-1 text-[10px] text-[#bdc8d5]">{status}</p>
      </div>
    </div>
  );
}
