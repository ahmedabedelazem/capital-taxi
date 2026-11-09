"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, CarFront, ClipboardList, MapPin, Power, ShieldCheck, WalletCards } from "lucide-react";

type TripOffer = {
  offerId: string;
  tripId: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  expiresAt: string;
};

type Point = { lat: number; lng: number };

type ActiveTrip = {
  tripId: string;
  status: string;
  pickupPoint: Point | null;
  destinationPoint: Point | null;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  distanceKm: number | null;
};

type SupportTicketHistoryItem = {
  ticketId: string;
  category: string;
  subject: string;
  description: string;
  tripId: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
};

type DriverTripHistoryItem = {
  tripId: string;
  status: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  distanceKm: number | null;
  createdAt: string | null;
  completedAt: string | null;
};

export function DriverWorkspace() {
  const [available, setAvailable] = useState(false);
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [history, setHistory] = useState<DriverTripHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [section, setSection] = useState("offers");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("سجّل الدخول بحساب سائق معتمد لتفعيل الخدمات.");
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapMessage, setMapMessage] = useState("جارٍ تجهيز خريطة الرحلة.");
  const [routeSummary, setRouteSummary] = useState("");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const pickupMarker = useRef<google.maps.Marker | null>(null);
  const destinationMarker = useRef<google.maps.Marker | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [application, setApplication] = useState({ fullName: "", phone: "", vehicleType: "ملاكي", vehicleModel: "", plateNumber: "" });
  const [applicationBusy, setApplicationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState("لم يبدأ إرسال الموقع.");
  const [supportCategory, setSupportCategory] = useState("trip");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportTripId, setSupportTripId] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketHistoryItem[]>([]);
  const [supportHistoryLoading, setSupportHistoryLoading] = useState(true);
  const [supportHistoryError, setSupportHistoryError] = useState("");
  const lastLocationSentAt = useRef(0);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setMapMessage("خريطة الرحلة تحتاج إعداد مفتاح Google Maps في بيئة التشغيل.");
      return;
    }
    let active = true;
    const ready = () => {
      if (!active || !window.google?.maps) return;
      setMapReady(true);
      setMapMessage("خريطة الرحلة جاهزة.");
    };
    if (window.google?.maps) {
      ready();
      return () => { active = false; };
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-capital-taxi-maps]");
    if (existing) {
      existing.addEventListener("load", ready);
      return () => {
        active = false;
        existing.removeEventListener("load", ready);
      };
    }
    const script = document.createElement("script");
    script.dataset.capitalTaxiMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=ar&region=EG`;
    script.async = true;
    script.defer = true;
    script.onload = ready;
    script.onerror = () => {
      if (active) setMapMessage("تعذر تحميل Google Maps. راجع المفتاح وتفعيل Maps JavaScript API.");
    };
    document.head.appendChild(script);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainer.current || !window.google?.maps || mapInstance.current) return;
    const map = new google.maps.Map(mapContainer.current, {
      center: { lat: 31.132, lng: 33.803 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: "cooperative",
      backgroundColor: "#edf2e7",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#edf2e7" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#53604a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#edf2e7" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#d6dfce" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#dce8e8" }] },
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstance.current = map;
    return () => {
      pickupMarker.current?.setMap(null);
      destinationMarker.current?.setMap(null);
      pickupMarker.current = null;
      destinationMarker.current = null;
      mapInstance.current = null;
    };
  }, [mapReady, section, activeTripId]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !window.google?.maps) return;
    const pickup = activeTrip?.pickupPoint ?? null;
    const destination = activeTrip?.destinationPoint ?? null;
    if (pickup) {
      if (!pickupMarker.current) pickupMarker.current = new google.maps.Marker({
        map, title: "نقطة الانطلاق", label: { text: "ب", color: "#101923", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#8cc63f", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      pickupMarker.current.setPosition(pickup);
    } else if (pickupMarker.current) {
      pickupMarker.current.setMap(null);
      pickupMarker.current = null;
    }
    if (destination) {
      if (!destinationMarker.current) destinationMarker.current = new google.maps.Marker({
        map, title: "الوجهة", label: { text: "و", color: "#101923", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#8cc63f", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      destinationMarker.current.setPosition(destination);
    } else if (destinationMarker.current) {
      destinationMarker.current.setMap(null);
      destinationMarker.current = null;
    }
    if (pickup && destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(destination);
      map.fitBounds(bounds, 56);
    } else if (pickup) {
      map.panTo(pickup);
      map.setZoom(15);
    } else if (destination) {
      map.panTo(destination);
      map.setZoom(15);
    }
  }, [activeTrip?.pickupPoint?.lat, activeTrip?.pickupPoint?.lng, activeTrip?.destinationPoint?.lat, activeTrip?.destinationPoint?.lng, mapReady, section, activeTripId]);

  useEffect(() => {
    const map = mapInstance.current;
    const pickup = activeTrip?.pickupPoint;
    const destination = activeTrip?.destinationPoint;
    if (!map || !window.google?.maps || !pickup || !destination) {
      setRouteSummary("");
      return;
    }
    let active = true;
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeColor: "#8cc63f", strokeOpacity: 0.95, strokeWeight: 6 },
    });
    void new google.maps.DirectionsService().route({
      origin: pickup,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
      region: "EG",
    }).then((result) => {
      if (!active) return;
      renderer.setDirections(result);
      const leg = result.routes[0]?.legs[0];
      setRouteSummary(leg?.distance?.text && leg.duration?.text
        ? `مسار القيادة: ${leg.distance.text} • ${leg.duration.text}`
        : "تم رسم مسار القيادة بين النقطتين.");
    }).catch(() => {
      if (active) setRouteSummary("تعذر حساب مسار القيادة. تأكد من تفعيل Directions API.");
    });
    return () => {
      active = false;
      renderer.setMap(null);
    };
  }, [activeTrip?.pickupPoint?.lat, activeTrip?.pickupPoint?.lng, activeTrip?.destinationPoint?.lat, activeTrip?.destinationPoint?.lng, mapReady, section, activeTripId]);

  const loadOffers = useCallback(async () => {
    const response = await fetch("/api/driver/offers", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) throw new Error("سجّل الدخول أولاً لعرض عروض الرحلات.");
    if (response.status === 403) throw new Error("حساب السائق غير معتمد أو غير مفعّل.");
    if (!response.ok) throw new Error("تعذر تحميل عروض الرحلات حالياً.");
    const data = await response.json() as { offers?: TripOffer[] };
    setOffers(Array.isArray(data.offers) ? data.offers : []);
  }, []);

  const loadDriverHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/driver/trips", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("سجّل الدخول بحساب السائق لعرض سجل الرحلات.");
      if (response.status === 403) throw new Error("سجل الرحلات متاح للسائقين المعتمدين فقط.");
      if (!response.ok) throw new Error("تعذر تحميل سجل الرحلات حالياً.");
      const data = await response.json() as { trips?: DriverTripHistoryItem[] };
      setHistory(Array.isArray(data.trips) ? data.trips : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل السجل.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === "history") void loadDriverHistory();
  }, [section, loadDriverHistory]);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/driver/availability", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) throw new Error("سجّل الدخول بحساب سائق معتمد.");
        if (response.status === 403) {
          setShowApplication(true);
          throw new Error("يمكنك تقديم طلب انضمام للسائقين أو متابعة حالة طلبك.");
        }
        if (!response.ok) throw new Error("تعذر قراءة حالة حساب السائق.");
        return response.json() as Promise<{ isAvailable?: boolean; activeTripId?: string | null }>;
      })
      .then((data) => {
        if (!mounted) return;
        setAvailable(data.isAvailable === true);
        setActiveTripId(data.activeTripId ?? null);
      })
      .catch((error: unknown) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحميل حالة السائق.");
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!available && !activeTripId) return;
    let mounted = true;
    const refresh = async () => {
      try {
        await loadOffers();
        if (mounted) setMessage("أنت متصل. يتم تحديث العروض الموجهة إليك.");
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحديث العروض.");
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 10000);

    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(async (position) => {
        const now = Date.now();
        if (now - lastLocationSentAt.current < 5000) return;
        lastLocationSentAt.current = now;
        try {
          const response = await fetch("/api/driver/location", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
            }),
          });
          const data = await response.json().catch(() => ({})) as { error?: string };
          if (response.ok) {
            if (mounted) setLocationStatus("تم تحديث موقعك بنجاح.");
          } else if (mounted) {
            if (data.error === "approved_driver_required") {
              setLocationStatus("الحساب يحتاج إلى اعتماد الإدارة.");
            } else if (data.error === "invalid_location") {
              setLocationStatus("دقة الموقع أضعف من الحد المسموح. حاول في مكان مفتوح.");
            } else if (data.error === "location_update_too_frequent") {
              setLocationStatus("جارٍ تنظيم تحديثات الموقع.");
            } else if (data.error === "driver_must_be_online_or_on_trip") {
              setLocationStatus("أوقف الخادم استقبال الموقع لأن حالة السائق غير متاحة.");
            } else {
              setLocationStatus("تعذر حفظ الموقع على الخادم. ستتم المحاولة مع التحديث التالي.");
            }
          }
        } catch {
          if (mounted) setMessage("تعذر تحديث الموقع. تحقق من اتصال الإنترنت.");
        }
      }, (error) => {
        if (!mounted) return;
        const reason = error.code === error.PERMISSION_DENIED
          ? "تم رفض إذن الموقع. فعّله من إعدادات المتصفح."
          : error.code === error.POSITION_UNAVAILABLE
            ? "موقع الجهاز غير متاح حالياً."
            : "انتهت مهلة تحديد الموقع. ستتم إعادة المحاولة تلقائياً.";
        setLocationStatus(reason);
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
      return () => {
        mounted = false;
        window.clearInterval(interval);
        navigator.geolocation.clearWatch(watchId);
      };
    }
    setMessage("المتصفح لا يدعم تحديد الموقع؛ لن تظهر عروض التوزيع القريب.");
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [available, activeTripId, loadOffers]);

  useEffect(() => {
    if (!activeTripId) {
      setActiveTrip(null);
      return;
    }
    let mounted = true;
    const refreshActiveTrip = async () => {
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(activeTripId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("تعذر قراءة حالة الرحلة النشطة.");
        const data = await response.json() as { trip?: ActiveTrip };
        if (mounted && data.trip) {
          if (["completed", "cancelled", "no_driver"].includes(data.trip.status)) {
            setActiveTrip(null);
            setActiveTripId(null);
            setAvailable(false);
            setOffers([]);
            void loadDriverHistory();
            setMessage(data.trip.status === "cancelled"
              ? "تم إلغاء الرحلة من الطرف الآخر. تم تحرير حسابك من الرحلة."
              : data.trip.status === "completed"
                ? "اكتملت الرحلة وتم تحديث حالة حسابك."
                : "انتهى البحث عن سائق لهذه الرحلة.");
            return;
          }
          setActiveTrip(data.trip);
        }
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحديث الرحلة.");
      }
    };
    void refreshActiveTrip();
    const interval = window.setInterval(() => { void refreshActiveTrip(); }, 8000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [activeTripId, loadDriverHistory]);

  async function updateActiveTripStatus(status: "driver_arrived" | "in_progress" | "completed") {
    if (!activeTripId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(activeTripId)}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string; status?: string };
      if (!response.ok) {
        if (response.status === 409) throw new Error("تغيرت حالة الرحلة أو أن الانتقال غير مسموح. حدّث الحالة.");
        if (response.status === 403) throw new Error("هذه الرحلة غير مسندة إلى حسابك.");
        throw new Error("تعذر تحديث حالة الرحلة.");
      }
      setActiveTrip((current) => current ? { ...current, status: data.status ?? status } : current);
      if (status === "completed") {
        setActiveTripId(null);
        setActiveTrip(null);
        void loadDriverHistory();
        setMessage("اكتملت الرحلة بنجاح. يمكنك تفعيل استقبال رحلات جديدة عند الاستعداد.");
      } else {
        setMessage(status === "driver_arrived" ? "تم تسجيل وصولك إلى نقطة الانطلاق." : "تم بدء الرحلة.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث حالة الرحلة.");
    } finally {
      setBusy(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplicationBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/driver/application", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      });
      const data = await response.json() as { error?: string; status?: string };
      if (response.status === 401) throw new Error("سجّل الدخول بحساب عميل أولاً.");
      if (response.status === 403) throw new Error("هذا الحساب غير مؤهل لتقديم طلب جديد.");
      if (data.error === "already_approved") {
        setShowApplication(false);
        throw new Error("حسابك معتمد بالفعل. سجّل الدخول مجدداً لتحديث الصلاحيات.");
      }
      if (data.error === "application_already_pending") {
        setShowApplication(false);
        throw new Error("لديك طلب انضمام قيد المراجعة بالفعل. لا حاجة لإرساله مرة أخرى.");
      }
      if (data.error === "application_rate_limited") {
        throw new Error("وصلت إلى الحد المسموح لإعادة التقديم: 3 مرات خلال 24 ساعة. حاول لاحقاً.");
      }
      if (data.error === "application_not_resubmittable") {
        throw new Error("يوجد طلب سابق بحالة غير متوقعة. تواصل مع الإدارة لمراجعته.");
      }
      if (!response.ok) throw new Error("تعذر إرسال الطلب. راجع البيانات وحاول مرة أخرى.");
      setShowApplication(false);
      setMessage("تم إرسال طلب الانضمام بنجاح. سيظهر في لوحة الإدارة للمراجعة، ولن تتمكن من استقبال رحلات قبل الاعتماد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال طلب الانضمام.");
    } finally {
      setApplicationBusy(false);
    }
  }

  async function toggleAvailability() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/driver/availability", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !available }),
      });
      const data = await response.json() as { error?: string; isAvailable?: boolean };
      if (!response.ok) {
        if (response.status === 401) throw new Error("سجّل الدخول أولاً.");
        if (data.error === "approved_driver_required") throw new Error("حساب السائق لم يحصل على اعتماد الإدارة بعد.");
        if (data.error === "active_trip_cannot_go_offline") throw new Error("لا يمكن إيقاف التوفر أثناء رحلة نشطة.");
        if (data.error === "active_trip_cannot_go_online") throw new Error("لا يمكن تفعيل استقبال الرحلات أثناء وجود رحلة نشطة.");
        throw new Error("تعذر تغيير حالة التوفر.");
      }
      setAvailable(Boolean(data.isAvailable));
      setMessage(data.isAvailable ? "تم تفعيل التوفر. اسمح للموقع لتلقي العروض القريبة." : "تم إيقاف استقبال العروض.");
      if (!data.isAvailable) setOffers([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  async function submitSupportTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSupportBusy(true); setSupportMessage("");
    try {
      const response = await fetch("/api/support/tickets", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: supportCategory, subject: supportSubject, description: supportDescription, tripId: supportTripId.trim() || activeTripId || null }) });
      const data = await response.json() as { ticketId?: string; error?: string };
      if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      if (response.status === 403 && data.error === "trip_not_accessible") throw new Error("رقم الرحلة غير مرتبط بحساب السائق الحالي. راجعه أو اترك الحقل فارغاً.");
      if (response.status === 429) throw new Error("وصلت للحد المؤقت لإرسال الشكاوى. حاول بعد قليل.");
      if (!response.ok || !data.ticketId) throw new Error("تعذر إرسال الشكوى. حاول مرة أخرى.");
      setSupportMessage("تم إرسال طلب الدعم بنجاح. رقم المتابعة: " + data.ticketId); void loadSupportHistory(); setSupportSubject(""); setSupportDescription(""); setSupportTripId("");
    } catch (error) { setSupportMessage(error instanceof Error ? error.message : "تعذر إرسال طلب الدعم."); }
    finally { setSupportBusy(false); }
  }

  const loadSupportHistory = async () => {
    setSupportHistoryLoading(true);
    setSupportHistoryError("");
    try {
      const response = await fetch("/api/support/tickets", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("سجّل الدخول لعرض سجل الشكاوى.");
      if (response.status === 403) throw new Error("سجل الدعم غير متاح لهذا الحساب.");
      if (!response.ok) throw new Error("تعذر تحميل سجل الشكاوى.");
      const data = await response.json() as { tickets?: SupportTicketHistoryItem[] };
      setSupportTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (error) {
      setSupportHistoryError(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل سجل الشكاوى.");
    } finally {
      setSupportHistoryLoading(false);
    }
  };

  useEffect(() => { void loadSupportHistory(); }, []);

  async function acceptOffer(offer: TripOffer) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(offer.tripId)}/accept`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        if (response.status === 409) throw new Error("سبق قبول الرحلة أو لم تعد متاحة. حدّث العروض.");
        if (response.status === 404) throw new Error("انتهت صلاحية العرض أو لم يعد متاحاً. تم تحديث قائمة العروض.");
        if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        throw new Error("تعذر قبول الرحلة.");
      }
      setActiveTripId(offer.tripId);
      setAvailable(false);
      setOffers([]);
      setSection("active");
      setMessage("تم إسناد الرحلة إليك بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر قبول العرض.");
      try { await loadOffers(); } catch { /* Keep the acceptance error visible. */ }
    } finally {
      setBusy(false);
    }
  }

  return <div>
    {showApplication && <section className="mb-5 rounded-3xl border border-gold/20 bg-panel p-6">
      <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-[#5e8f25]"/><div><h2 className="font-bold">طلب الانضمام كسائق</h2><p className="mt-1 text-xs text-neutral-500">املأ بياناتك ومركبتك لإرسال الطلب إلى الإدارة.</p></div></div>
      <form onSubmit={submitApplication} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-neutral-500">الاسم بالكامل<input required maxLength={100} value={application.fullName} onChange={e=>setApplication(v=>({...v,fullName:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-4 py-3 text-sm text-[#182015] outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-neutral-500">رقم الهاتف<input required type="tel" maxLength={25} value={application.phone} onChange={e=>setApplication(v=>({...v,phone:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-4 py-3 text-sm text-[#182015] outline-none focus:border-gold/50" dir="ltr"/></label>
        <label className="text-xs text-neutral-500">نوع المركبة<input required maxLength={40} value={application.vehicleType} onChange={e=>setApplication(v=>({...v,vehicleType:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-4 py-3 text-sm text-[#182015] outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-neutral-500">موديل المركبة<input required maxLength={60} value={application.vehicleModel} onChange={e=>setApplication(v=>({...v,vehicleModel:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-4 py-3 text-sm text-[#182015] outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-neutral-500 sm:col-span-2">رقم اللوحة<input required maxLength={30} value={application.plateNumber} onChange={e=>setApplication(v=>({...v,plateNumber:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-4 py-3 text-sm text-[#182015] outline-none focus:border-gold/50"/></label>
        <button type="submit" disabled={applicationBusy} className="rounded-xl bg-[#8cc63f] px-5 py-3 text-sm font-bold text-[#182015] disabled:opacity-50 sm:col-span-2">{applicationBusy ? "جارٍ إرسال الطلب…" : "إرسال طلب الانضمام"}</button>
      </form>
      <p className="mt-3 text-[11px] leading-6 text-neutral-500">لا ترفع مستندات حساسة هنا حالياً. ستتم إضافة قناة آمنة لمراجعة المستندات قبل التشغيل.</p>
    </section>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"حالة الاتصال",value:available ? "متاح – متصل بالخادم" : "غير متصل",icon:Power},{label:"العروض الحالية",value:String(offers.length),icon:ClipboardList},{label:"الرحلة النشطة",value:activeTripId ? "قيد المتابعة" : "لا توجد",icon:CarFront},{label:"اعتماد الحساب",value:"يتحقق منه الخادم",icon:BadgeCheck}].map(({label,value,icon:Icon})=><div key={label} className="rounded-[22px] border border-[var(--app-border)] bg-white p-5 shadow-[var(--shadow-card)]"><Icon className="mb-5 text-[#5e8f25]" size={21}/><p className="text-xs text-neutral-500">{label}</p><b className="mt-2 block text-lg">{value}</b></div>)}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between"><CarFront className="text-[#5e8f25]" size={28}/><span className="rounded-full bg-amber-300/10 px-3 py-1 text-[11px] text-amber-800">حساب معتمد فقط</span></div>
        <h2 className="text-xl font-bold">حالة استقبال الرحلات</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-500">عند تفعيل التوفر، يطلب المتصفح إذن الموقع ويرسل آخر إحداثياتك أثناء اتصالك فقط. يمكنك إيقاف التوفر في أي وقت ما لم تكن لديك رحلة نشطة.</p>
        <button type="button" disabled={busy} aria-pressed={available} onClick={toggleAvailability} className={`mt-6 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-4 text-sm font-bold transition disabled:opacity-50 ${available ? "border border-emerald-300/30 bg-emerald-400/15 text-[#5e8f25]" : "bg-[var(--brand)] text-[var(--app-ink)] hover:bg-[#a2d75c]"}`}><Power size={18}/>{busy ? "جارٍ التنفيذ…" : available ? "إيقاف استقبال الرحلات" : "بدء استقبال الرحلات"}</button>
        <p role="status" className="mt-3 rounded-xl border border-[#24351c]/10 bg-[#f5f7f2] p-3 text-xs leading-6 text-neutral-500">حالة GPS: {available || activeTripId ? locationStatus : "يبدأ تحديث الموقع عند تفعيل التوفر أو وجود رحلة نشطة."}</p>
        {message && <p role="status" className="mt-4 rounded-xl bg-[#f5f7f2] p-3 text-xs leading-6 text-neutral-500">{message}</p>}
      </section>
      <section className="rounded-[28px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">مساحة العمل</h2><div className="flex gap-2">{[{id:"offers",label:"العروض"},{id:"active",label:"الرحلة الحالية"},{id:"history",label:"السجل"}].map(item=><button key={item.id} type="button" onClick={()=>setSection(item.id)} className={`rounded-lg px-3 py-2 text-xs ${section===item.id ? "bg-[#8cc63f] text-[#182015] font-bold" : "bg-[#f5f7f2] text-neutral-500"}`}>{item.label}</button>)}</div></div>
        {section==="offers" && <div className="mt-5 space-y-3">
          {!available && <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-[#24351c]/10 px-5 text-center"><div><ClipboardList className="mx-auto mb-3 text-[#5e8f25]" size={26}/><b className="block text-sm">فعّل التوفر لاستقبال العروض</b><p className="mt-2 text-xs leading-6 text-neutral-500">العروض الحقيقية تظهر بعد اعتماد الحساب وتحديث الموقع.</p></div></div>}
          {available && offers.length===0 && <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-[#24351c]/10 px-5 text-center"><div><MapPin className="mx-auto mb-3 text-[#5e8f25]" size={26}/><b className="block text-sm">لا توجد عروض متاحة الآن</b><p className="mt-2 text-xs leading-6 text-neutral-500">سيتم تحديث القائمة تلقائياً كل 10 ثوانٍ.</p></div></div>}
          {offers.map(offer=><article key={offer.offerId} className="rounded-[20px] border border-[var(--app-border)] bg-white p-4 shadow-[0_5px_18px_rgba(28,48,20,.035)]"><div className="grid gap-3 sm:grid-cols-2"><div><span className="text-[11px] text-neutral-500">نقطة الانطلاق</span><p className="mt-1 text-sm font-semibold">{offer.pickupLabel ?? "غير محدد"}</p></div><div><span className="text-[11px] text-neutral-500">الوجهة</span><p className="mt-1 text-sm font-semibold">{offer.destinationLabel ?? "غير محددة"}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#24351c]/10 pt-3"><span className="text-sm text-[#5e8f25]">{offer.fareEstimate === null ? "السعر غير متاح" : `تقدير السعر: ${offer.fareEstimate} ج.م`}</span><button type="button" disabled={busy} onClick={()=>acceptOffer(offer)} className="rounded-lg bg-[#8cc63f] px-4 py-2 text-xs font-bold text-[#182015] disabled:opacity-50">قبول الرحلة</button></div></article>)}
        </div>}
        {section==="active" && <div className="mt-5 space-y-4">
          {!activeTripId && <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#24351c]/10 px-5 text-center"><div><CarFront className="mx-auto mb-3 text-[#5e8f25]" size={28}/><b className="block text-sm">لا توجد رحلة نشطة</b><p className="mt-2 text-xs leading-6 text-neutral-500">عند قبول عرض ستظهر تفاصيل الرحلة وخطوات تنفيذها هنا.</p></div></div>}
          {activeTripId && <article className="rounded-2xl border border-gold/20 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">الرحلة الحالية</h3><span className="rounded-full bg-[#edf6df] px-3 py-1.5 text-xs text-[#5e8f25]">{({accepted:"تم قبول الرحلة",driver_arrived:"وصلت إلى العميل",in_progress:"الرحلة جارية"} as Record<string,string>)[activeTrip?.status ?? ""] || "جارٍ تحميل الحالة"}</span></div>
            <p className="mt-4 text-sm"><span className="text-neutral-500">من:</span> {activeTrip?.pickupLabel || "جارٍ التحميل…"}</p>
            <p className="mt-2 text-sm"><span className="text-neutral-500">إلى:</span> {activeTrip?.destinationLabel || "جارٍ التحميل…"}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500"><span>الأجرة التقديرية: {activeTrip?.fareEstimate ?? "—"} ج.م</span><span>المسافة: {activeTrip?.distanceKm ?? "—"} كم</span></div>
            <p className="mt-3 break-all text-[10px] text-neutral-500" dir="ltr">{activeTripId}</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#24351c]/10 bg-[#edf2e7]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24351c]/10 px-4 py-3"><b className="text-xs">خريطة الرحلة</b><span className="text-[10px] text-neutral-500">{routeSummary || mapMessage}</span></div>
              <div ref={mapContainer} className="h-[280px] w-full sm:h-[340px]" role="img" aria-label="خريطة توضح نقطة الانطلاق والوجهة ومسار القيادة" />
              {activeTrip && (!activeTrip.pickupPoint || !activeTrip.destinationPoint) && <p className="border-t border-[#24351c]/10 px-4 py-3 text-xs leading-6 text-amber-800">إحداثيات إحدى نقطتي الرحلة غير متاحة؛ لا يمكن رسم المسار كاملاً.</p>}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {activeTrip?.status === "accepted" && <button type="button" disabled={busy} onClick={() => void updateActiveTripStatus("driver_arrived")} className="rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-[var(--app-ink)] shadow-[0_8px_18px_rgba(116,170,48,.14)] disabled:opacity-50">تأكيد الوصول لنقطة الانطلاق</button>}
              {activeTrip?.status === "driver_arrived" && <button type="button" disabled={busy} onClick={() => void updateActiveTripStatus("in_progress")} className="rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-[var(--app-ink)] shadow-[0_8px_18px_rgba(116,170,48,.14)] disabled:opacity-50">بدء الرحلة</button>}
              {activeTrip?.status === "in_progress" && <button type="button" disabled={busy} onClick={() => void updateActiveTripStatus("completed")} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#182015] disabled:opacity-50">إنهاء الرحلة</button>}
            </div>
            {activeTrip && !["accepted","driver_arrived","in_progress"].includes(activeTrip.status) && <p className="mt-4 text-xs text-neutral-500">الحالة الحالية: {activeTrip.status}</p>}
          </article>}
        </div>}
        {section==="history" && <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3"><p className="text-xs text-neutral-500">آخر الرحلات المسندة إلى حسابك (حتى 100 رحلة)</p><button type="button" disabled={historyLoading} onClick={() => void loadDriverHistory()} className="rounded-lg border border-[#24351c]/10 px-3 py-2 text-xs text-[#5e8f25] disabled:opacity-50">{historyLoading ? "جارٍ التحديث…" : "تحديث السجل"}</button></div>
          {historyError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs leading-6 text-red-700">{historyError}</p>}
          {historyLoading && history.length === 0 && <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#24351c]/10 text-xs text-neutral-500">جارٍ تحميل سجل الرحلات…</div>}
          {!historyLoading && !historyError && history.length === 0 && <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#24351c]/10 px-5 text-center"><div><WalletCards className="mx-auto mb-3 text-[#5e8f25]" size={28}/><b className="block text-sm">لا توجد رحلات في السجل</b><p className="mt-2 text-xs leading-6 text-neutral-500">ستظهر هنا الرحلات التي تم إسنادها إلى حسابك.</p></div></div>}
          {history.map((trip) => <article key={trip.tripId} className="rounded-[20px] border border-[var(--app-border)] bg-white p-4 shadow-[0_5px_18px_rgba(28,48,20,.035)]">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#edf6df] px-3 py-1 text-[11px] text-[#5e8f25]">{({accepted:"تم قبولها",driver_arrived:"تم الوصول",in_progress:"قيد التنفيذ",completed:"مكتملة",cancelled:"ملغاة",no_driver:"لم يُعيّن سائق",pending:"معلقة",searching:"جارٍ البحث"} as Record<string,string>)[trip.status] ?? trip.status}</span><b className="text-sm text-[#5e8f25]">{trip.fareEstimate === null ? "الأجرة غير محددة" : `${trip.fareEstimate} ج.م`}</b></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><span className="text-[10px] text-neutral-500">نقطة الانطلاق</span><p className="mt-1 text-xs leading-6">{trip.pickupLabel ?? "غير محددة"}</p></div><div><span className="text-[10px] text-neutral-500">الوجهة</span><p className="mt-1 text-xs leading-6">{trip.destinationLabel ?? "غير محددة"}</p></div></div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#24351c]/10 pt-3 text-[10px] text-neutral-500"><span>المسافة: {trip.distanceKm === null ? "—" : `${trip.distanceKm} كم`}</span><span>تاريخ الطلب: {trip.createdAt ? new Date(trip.createdAt).toLocaleString("ar-EG") : "غير متاح"}</span>{trip.completedAt && <span>الإنهاء: {new Date(trip.completedAt).toLocaleString("ar-EG")}</span>}</div>
            <p className="mt-2 break-all text-[9px] text-neutral-500" dir="ltr">{trip.tripId}</p>
          </article>)}
        </div>}
      </section>
    </div>
    <section className="mt-5 rounded-[28px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <h2 className="font-bold">الدعم والشكاوى</h2><p className="mt-1 text-xs leading-6 text-neutral-500">أرسل مشكلة تخص حسابك أو رحلة مسندة إليك إلى الإدارة.</p>
      <form onSubmit={submitSupportTicket} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-neutral-500">نوع الطلب<select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-3 py-3 text-sm text-[#182015]"><option value="trip">مشكلة في رحلة</option><option value="payment">الدفع</option><option value="driver">حساب السائق</option><option value="account">الحساب</option><option value="app">التطبيق</option><option value="other">أخرى</option></select></label>
        <label className="text-xs text-neutral-500">رقم الرحلة (اختياري)<input maxLength={128} value={supportTripId} onChange={(event) => setSupportTripId(event.target.value)} placeholder={activeTripId || "يمكن تركه فارغاً"} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-3 py-3 text-sm text-[#182015]" /></label>
        <label className="text-xs text-neutral-500 sm:col-span-2">عنوان الشكوى<input required minLength={5} maxLength={120} value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-3 py-3 text-sm text-[#182015]" /></label>
        <label className="text-xs text-neutral-500 sm:col-span-2">التفاصيل<textarea required minLength={10} maxLength={2500} rows={4} value={supportDescription} onChange={(event) => setSupportDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-[#24351c]/10 bg-white px-3 py-3 text-sm text-[#182015]" /></label>
        <button type="submit" disabled={supportBusy} className="rounded-xl bg-[#8cc63f] px-5 py-3 text-sm font-bold text-[#182015] disabled:opacity-50 sm:col-span-2">{supportBusy ? "جارٍ إرسال الشكوى…" : "إرسال إلى الدعم"}</button>
        {supportMessage && <p role="status" aria-live="polite" className="break-words rounded-xl border border-[#24351c]/10 bg-white p-3 text-xs leading-6 text-neutral-500 sm:col-span-2">{supportMessage}</p>}
      </form>
      <div className="mt-5 border-t border-[#24351c]/10 pt-4">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">متابعة طلباتك</h3><button type="button" onClick={() => void loadSupportHistory()} disabled={supportHistoryLoading} className="rounded-lg border border-[#24351c]/10 px-3 py-2 text-xs text-[#5e8f25] disabled:opacity-50">تحديث</button></div>
        {supportHistoryError && <p role="alert" className="mt-3 rounded-xl bg-red-400/5 p-3 text-xs text-red-700">{supportHistoryError}</p>}
        {supportHistoryLoading && <p className="mt-3 text-xs text-neutral-500">جارٍ تحميل الشكاوى…</p>}
        {!supportHistoryLoading && !supportHistoryError && supportTickets.length === 0 && <p className="mt-3 text-xs text-neutral-500">لا توجد طلبات دعم سابقة.</p>}
        <div className="mt-3 space-y-3">{supportTickets.map((ticket) => <article key={ticket.ticketId} className="rounded-xl border border-[#24351c]/10 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs">{ticket.subject}</b><span className="rounded-full bg-[#edf6df] px-2 py-1 text-[10px] text-[#5e8f25]">{({open:"مفتوحة",in_progress:"قيد المراجعة",resolved:"تم الحل",closed:"مغلقة"} as Record<string,string>)[ticket.status] ?? ticket.status}</span></div>
          <p className="mt-2 text-xs leading-6 text-neutral-500">{ticket.description}</p>
          {ticket.adminNote && <p className="mt-2 rounded-lg border border-emerald-300/10 bg-emerald-300/5 p-2 text-xs leading-6 text-[#466d20]">رد الإدارة: {ticket.adminNote}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-neutral-500"><span>رقم المتابعة: <b dir="ltr">{ticket.ticketId}</b></span><span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("ar-EG") : "التاريخ غير متاح"}</span></div>
        </article>)}</div>
      </div>
    </section>
    <section className="mt-5 rounded-[28px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)]"><div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-[#5e8f25]"/><h2 className="font-bold">متطلبات تفعيل حساب السائق</h2></div><div className="grid gap-3 sm:grid-cols-3">{["بيانات السائق والتحقق من الهوية","بيانات المركبة والترخيص","موافقة الإدارة وتفعيل الحساب"].map((item,i)=><div key={item} className="flex items-start gap-3 rounded-xl bg-white p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#edf6df] text-xs text-[#5e8f25]">{i+1}</span><p className="text-xs leading-6 text-neutral-500">{item}</p></div>)}</div></section>
  </div>;
}
