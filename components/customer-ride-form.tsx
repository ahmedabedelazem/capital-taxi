"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MapboxCustomerMap } from "@/components/mapbox-customer-map";

type AddressSuggestion = { id: string; label: string; lat: number; lng: number };
import { CarFront, CheckCircle2, CircleDollarSign, Clock3, LocateFixed, MapPin, Navigation } from "lucide-react";

const vehicleOptions = [
  { id: "economy", name: "اقتصادي", detail: "للمشاوير اليومية", seats: "حتى 4 ركاب", icon: CarFront },
  { id: "family", name: "عائلي", detail: "مساحة أوسع للعائلة", seats: "حسب المركبة", icon: CarFront },
  { id: "private", name: "خصوصي", detail: "رحلة خاصة ومريحة", seats: "حسب المركبة", icon: CarFront },
] as const;

const tripStatusLabels: Record<string, string> = {
  pending: "تم استلام الطلب",
  searching: "جارٍ البحث عن سائق",
  accepted: "تم قبول الرحلة",
  driver_arrived: "وصل السائق إلى نقطة الانطلاق",
  in_progress: "الرحلة جارية",
  completed: "اكتملت الرحلة",
  cancelled: "أُلغيت الرحلة",
  no_driver: "لم يتوفر سائق حالياً",
};

type Point = { lat: number; lng: number };

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

type TripHistoryItem = {
  tripId: string;
  status: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  distanceKm: number | null;
  createdAt: string | null;
};

type TripDetails = {
  status: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  pickupPoint: Point | null;
  destinationPoint: Point | null;
  driver: {
    fullName: string | null;
    phone: string | null;
    vehicleType: string | null;
    vehicleModel: string | null;
    plateNumber: string | null;
  } | null;
  driverLocation: { lat: number; lng: number; updatedAt: string } | null;
  timeline: { from: string | null; to: string | null; createdAt: string | null }[];
};

export function CustomerRideForm() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupPoint, setPickupPoint] = useState<Point | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Point | null>(null);
  const [vehicle, setVehicle] = useState("economy");
  const [locating, setLocating] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AddressSuggestion[]>([]);
  const [routeSummary, setRouteSummary] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [booking, setBooking] = useState<{ tripId: string; fareEstimate: number | null; distanceKm: number | null; status: string } | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [supportCategory, setSupportCategory] = useState("trip");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportTripId, setSupportTripId] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketHistoryItem[]>([]);
  const [supportHistoryLoading, setSupportHistoryLoading] = useState(true);
  const [supportHistoryError, setSupportHistoryError] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const idempotencyFingerprint = useRef<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const query = pickup.trim();
    if (!token || pickupPoint || query.length < 3) { setPickupSuggestions([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&country=EG&language=ar&limit=5&access_token=${encodeURIComponent(token)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Mapbox geocoding failed");
        const data = await response.json() as { features?: { id?: string; properties?: { full_address?: string; name?: string }; geometry?: { coordinates?: [number, number] } }[] };
        if (!active) return;
        setPickupSuggestions((data.features ?? []).flatMap((feature, index) => {
          const coordinates = feature.geometry?.coordinates;
          const label = feature.properties?.full_address || feature.properties?.name;
          return coordinates && label ? [{ id: feature.id || `pickup-${index}`, label, lng: coordinates[0], lat: coordinates[1] }] : [];
        }));
      } catch { if (active) setPickupSuggestions([]); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [pickup, pickupPoint]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const query = destination.trim();
    if (!token || destinationPoint || query.length < 3) { setDestinationSuggestions([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&country=EG&language=ar&limit=5&access_token=${encodeURIComponent(token)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Mapbox geocoding failed");
        const data = await response.json() as { features?: { id?: string; properties?: { full_address?: string; name?: string }; geometry?: { coordinates?: [number, number] } }[] };
        if (!active) return;
        setDestinationSuggestions((data.features ?? []).flatMap((feature, index) => {
          const coordinates = feature.geometry?.coordinates;
          const label = feature.properties?.full_address || feature.properties?.name;
          return coordinates && label ? [{ id: feature.id || `destination-${index}`, label, lng: coordinates[0], lat: coordinates[1] }] : [];
        }));
      } catch { if (active) setDestinationSuggestions([]); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [destination, destinationPoint]);

  useEffect(() => {
    let active = true;
    fetch("/api/customer/trips", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل سجل الرحلات.");
        return response.json() as Promise<{ trips?: TripHistoryItem[] }>;
      })
      .then((data) => {
        if (!active) return;
        const trips = Array.isArray(data.trips) ? data.trips : [];
        setTripHistory(trips);
        const currentTrip = trips.find((trip) =>
          ["pending", "searching", "accepted", "driver_arrived", "in_progress"].includes(trip.status)
        );
        if (currentTrip) {
          setPickup(currentTrip.pickupLabel ?? "");
          setDestination(currentTrip.destinationLabel ?? "");
          setBooking({
            tripId: currentTrip.tripId,
            fareEstimate: currentTrip.fareEstimate,
            distanceKm: currentTrip.distanceKm,
            status: currentTrip.status,
          });
          setPreview(true);
        }
      })
      .catch(() => {
        if (active) setLocationMessage("تعذر تحميل سجل الرحلات حالياً.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!booking?.tripId || ["completed", "cancelled", "no_driver"].includes(booking.status)) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(booking.tripId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json() as { trip?: TripDetails & { status?: string } };
        const status = data.trip?.status;
        if (active && data.trip) {
          setTripDetails(data.trip);
          setPickup(data.trip.pickupLabel ?? "");
          setDestination(data.trip.destinationLabel ?? "");
          setPickupPoint(data.trip.pickupPoint ?? null);
          setDestinationPoint(data.trip.destinationPoint ?? null);
        }
        if (active && typeof status === "string") {
          setBooking((current) => current && current.tripId === booking.tripId
            ? { ...current, status }
            : current);
        }
      } catch {
        // A temporary status read failure must not erase the confirmed booking.
      }
    };
    const interval = window.setInterval(() => { void refreshStatus(); }, 8000);
    void refreshStatus();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [booking?.tripId, booking?.status]);

  async function cancelBooking() {
    if (!booking?.tripId || cancelling) return;
    if (!window.confirm("هل تريد إلغاء طلب الرحلة؟")) return;
    setCancelling(true);
    setCancelMessage("");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(booking.tripId)}/cancel`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        if (response.status === 404) throw new Error("الرحلة غير موجودة أو لا تخص حسابك.");
        if (response.status === 409) throw new Error("لا يمكن إلغاء الرحلة بعد بدء تنفيذها أو بعد انتهائها.");
        throw new Error("تعذر إلغاء الرحلة حالياً. حاول مرة أخرى.");
      }
      setBooking((current) => current && current.tripId === booking.tripId
        ? { ...current, status: "cancelled" }
        : current);
      setTripDetails((current) => current ? {
        ...current,
        status: "cancelled",
        driver: null,
        driverLocation: null,
        timeline: [...current.timeline, { from: booking.status, to: "cancelled", createdAt: new Date().toISOString() }],
      } : current);
      setTripHistory((current) => current.map((trip) => trip.tripId === booking.tripId
        ? { ...trip, status: "cancelled" }
        : trip));
      setCancelMessage("تم إلغاء الرحلة وإغلاق عروض السائقين المرتبطة بها.");
    } catch (error) {
      setCancelMessage(error instanceof Error ? error.message : "تعذر إلغاء الرحلة.");
    } finally {
      setCancelling(false);
    }
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("المتصفح لا يدعم تحديد الموقع. اختر نقطة الانطلاق من اقتراحات العناوين.");
      return;
    }
    setLocating(true);
    setLocationMessage("بانتظار إذن تحديد الموقع من المتصفح…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPickupPoint(point);
        setPickup("موقعي الحالي");
        setPreview(false);
        setBooking(null);
        setLocationMessage("تم تحديد موقع الانطلاق. سيتم إرسال الإحداثيات عند تأكيد طلب الرحلة فقط.");
        setLocating(false);
      },
      (error) => {
        setLocationMessage(error.code === error.PERMISSION_DENIED
          ? "لم تسمح بالوصول للموقع. يمكنك اختيار نقطة الانطلاق من اقتراحات العناوين."
          : "تعذر تحديد الموقع حالياً. تحقق من إعدادات الموقع وحاول مرة أخرى.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  function showPreview() {
    if (!pickup.trim() || !destination.trim() || !pickupPoint || !destinationPoint) {
      setPreview(false);
      setLocationMessage("حدد الانطلاق والوجهة بإحداثيات صحيحة: استخدم موقعي أو اختر العنوان من اقتراحات Google.");
      return;
    }
    if (pickupPoint.lat === destinationPoint.lat && pickupPoint.lng === destinationPoint.lng) {
      setPreview(false);
      setLocationMessage("نقطة الانطلاق والوجهة متطابقتان. اختر وجهة مختلفة.");
      return;
    }
    setPreview(true);
    setBooking(null);
    setLocationMessage("");
  }

  async function createTrip() {
    if (!pickupPoint || !destinationPoint) return;
    setSubmitting(true);
    setLocationMessage("");
    const payload = {
      pickup: { label: pickup, lat: pickupPoint.lat, lng: pickupPoint.lng },
      destination: { label: destination, lat: destinationPoint.lat, lng: destinationPoint.lng },
      vehicleCategory: vehicle,
      paymentMethod: "cash",
    };
    const requestFingerprint = JSON.stringify(payload);
    if (!idempotencyKey.current || idempotencyFingerprint.current !== requestFingerprint) {
      idempotencyKey.current = crypto.randomUUID();
      idempotencyFingerprint.current = requestFingerprint;
    }
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as {
        tripId?: string;
        fareEstimate?: number;
        distanceKm?: number;
        status?: string;
        error?: string;
      };
      if (response.status === 401) {
        window.location.assign("/login?next=/customer");
        return;
      }
      if (!response.ok) {
        const messages: Record<string, string> = {
          pricing_not_configured: "تعريفة الرحلات لم تُضبط من الإدارة بعد. لم يتم إنشاء طلب.",
          outside_service_area: "إحدى النقطتين خارج نطاق الخدمة المحدد.",
          trip_distance_not_supported: "المسافة خارج حدود الرحلات المسموح بها.",
        };
        throw new Error(messages[data.error ?? ""] ?? "تعذر تسجيل طلب الرحلة. حاول مرة أخرى.");
      }
      if (!data.tripId || typeof data.fareEstimate !== "number" || typeof data.distanceKm !== "number") throw new Error("استجابة الخادم غير مكتملة.");
      setBooking({ tripId: data.tripId, fareEstimate: data.fareEstimate, distanceKm: data.distanceKm, status: data.status ?? "pending" });
      setTripDetails(null);
      idempotencyKey.current = null;
      idempotencyFingerprint.current = null;
      void fetch("/api/customer/trips", { credentials: "same-origin", cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<{ trips?: TripHistoryItem[] }> : null)
        .then((result) => { if (result?.trips) setTripHistory(result.trips); })
        .catch(() => undefined);
      setLocationMessage("تم تسجيل طلب الرحلة على الخادم. سيبدأ البحث عن سائق بعد تفعيل مجدول التوزيع.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "تعذر تسجيل طلب الرحلة.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSupportTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSupportBusy(true); setSupportMessage("");
    try {
      const response = await fetch("/api/support/tickets", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: supportCategory, subject: supportSubject, description: supportDescription, tripId: supportTripId.trim() || booking?.tripId || null }) });
      const data = await response.json() as { ticketId?: string; error?: string };
      if (response.status === 401) { window.location.assign("/login?next=/customer"); return; }
      if (response.status === 403 && data.error === "trip_not_accessible") throw new Error("رقم الرحلة غير مرتبط بحسابك. راجع الرقم أو اترك الحقل فارغاً.");
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

  const selectedVehicle = vehicleOptions.find((item) => item.id === vehicle);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[28px] border border-[var(--app-border)] bg-[#111a26] p-5 shadow-[var(--shadow-card)] md:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div><p className="text-xs text-[var(--brand)]">خطوة 01</p><h2 className="mt-1 text-lg font-bold">حدد تفاصيل المشوار</h2></div>
          <span className="rounded-full border border-[rgba(245,196,0,.28)] bg-[var(--brand-soft)] px-3 py-1.5 text-xs text-[var(--brand)]">رحلة جديدة</span>
        </div>
        <div className="space-y-3">
          <div className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
            <label htmlFor="pickup" className="mb-2 block text-xs text-[var(--app-muted)]">نقطة الانطلاق</label>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full border-2 border-emerald-400"/>
              <input ref={pickupInput} id="pickup" value={pickup} onChange={(event) => { setPickup(event.target.value); setPickupPoint(null); setPreview(false); setBooking(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--app-muted)]" placeholder="اختر عنواناً من الاقتراحات أو استخدم موقعي"/>
              <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[rgba(245,196,0,.38)] px-3 py-2 text-xs text-[var(--brand)] transition hover:bg-[var(--brand-soft)] disabled:opacity-50"><LocateFixed size={15}/>{locating ? "جارٍ التحديد" : "موقعي"}</button>
            </div>
            {pickupSuggestions.length > 0 && <div className="mt-3 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[#111a26]">{pickupSuggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => { setPickup(suggestion.label); setPickupPoint({ lat: suggestion.lat, lng: suggestion.lng }); setPickupSuggestions([]); setPreview(false); setBooking(null); setLocationMessage(""); }} className="block w-full border-b border-[var(--app-border)] px-4 py-3 text-right text-xs leading-6 last:border-0 hover:bg-[var(--brand-soft)]">{suggestion.label}</button>)}</div>}
          </div>
          <div className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
            <label htmlFor="destination" className="mb-2 block text-xs text-[var(--app-muted)]">الوجهة</label>
            <div className="flex items-center gap-3"><MapPin className="shrink-0 text-[var(--brand)]" size={18}/><input ref={destinationInput} id="destination" value={destination} onChange={(event) => { setDestination(event.target.value); setDestinationPoint(null); setPreview(false); setBooking(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--app-muted)]" placeholder="جامعة سيناء، المساعيد، الكورنيش…"/></div>
            {destinationSuggestions.length > 0 && <div className="mt-3 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[#111a26]">{destinationSuggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => { setDestination(suggestion.label); setDestinationPoint({ lat: suggestion.lat, lng: suggestion.lng }); setDestinationSuggestions([]); setPreview(false); setBooking(null); setLocationMessage(""); }} className="block w-full border-b border-[var(--app-border)] px-4 py-3 text-right text-xs leading-6 last:border-0 hover:bg-[var(--brand-soft)]">{suggestion.label}</button>)}</div>}
          </div>
          <p className="text-[11px] text-[var(--app-muted)]">اكتب اسم المكان واختره من اقتراحات Mapbox لتحديد الإحداثيات بدقة.</p>
          {locationMessage && <p aria-live="polite" className="rounded-xl bg-[#0d1622] px-4 py-3 text-xs leading-6 text-[var(--app-muted)]">{locationMessage}</p>}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">اختر فئة السيارة</h3><span className="text-xs text-[var(--app-muted)]">نوع المركبة</span></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {vehicleOptions.map(({id,name,detail,seats,icon:Icon}) => <button key={id} type="button" onClick={() => {setVehicle(id);setPreview(false);setBooking(null);}} aria-pressed={vehicle===id} className={`rounded-2xl border p-4 text-right transition ${vehicle===id ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_1px_rgba(245,196,0,.14),0_14px_34px_rgba(0,0,0,.22)]" : "border-[var(--app-border)] bg-[#111a26] hover:border-[#8cc63f]/50"}`}><Icon className={vehicle===id ? "mb-4 text-[var(--brand)]" : "mb-4 text-[var(--app-muted)]"} size={23}/><b className="block text-sm">{name}</b><span className="mt-1 block text-[11px] text-[var(--app-muted)]">{detail}</span><span className="mt-3 block text-[10px] text-[var(--app-muted)]">{seats}</span></button>)}
          </div>
        </div>

        <div className="mt-7">
          <h3 className="mb-3 font-bold">طريقة الدفع</h3>
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(245,196,0,.38)] bg-[var(--brand-soft)] p-4 text-sm text-[var(--brand)]">
            <CircleDollarSign size={20}/>
            <span className="font-bold">الدفع نقداً للسائق بعد انتهاء الرحلة</span>
          </div>
        </div>

        <button type="button" onClick={showPreview} className="mt-7 w-full rounded-2xl bg-[var(--brand)] px-5 py-4 font-black text-[var(--app-ink)] shadow-[0_10px_24px_rgba(116,170,48,.18)] transition hover:-translate-y-0.5 hover:bg-[#ffd633]">معاينة تفاصيل الرحلة</button>
        {preview && <div className="mt-5 rounded-[22px] border border-[rgba(245,196,0,.28)] bg-[var(--brand-soft)] p-5">
          <div className="mb-3 flex items-center gap-2 text-[var(--brand)]"><CheckCircle2 size={18}/><b className="text-sm">تم التحقق من نقطتي الرحلة</b></div>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="block text-xs text-[var(--app-muted)]">من</span><b>{pickup}</b></div><div><span className="block text-xs text-[var(--app-muted)]">إلى</span><b>{destination}</b></div><div><span className="block text-xs text-[var(--app-muted)]">السيارة</span><b>{selectedVehicle?.name}</b></div><div><span className="block text-xs text-[var(--app-muted)]">طريقة الدفع</span><b>نقداً للسائق</b></div></div>
          <button type="button" disabled={submitting || Boolean(booking)} onClick={createTrip} className="mt-5 w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[var(--app-ink)] disabled:opacity-50">{submitting ? "جارٍ تسجيل الطلب…" : booking ? "تم تسجيل الطلب" : "تأكيد طلب الرحلة"}</button>
          {booking && <div role="status" className="mt-4 rounded-xl border border-[rgba(245,196,0,.28)] bg-[#111a26] p-4 text-sm">
            <b className="text-[var(--brand)]">طلب الرحلة مسجل</b>
            <p className="mt-2 text-xs text-[var(--app-muted)]">رقم الطلب: {booking.tripId}</p>
            <p className="mt-1">مسافة الطريق المعتمدة للتسعير: <b>{booking.distanceKm === null ? "غير متاحة" : `${booking.distanceKm.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} كم`}</b></p>
            <p className="mt-1">السعر التقديري: <b className="text-[var(--brand)]">{booking.fareEstimate === null ? "غير متاح" : `${booking.fareEstimate} ج.م`}</b></p>
            <p className="mt-2 text-xs text-[var(--app-muted)]">الحالة: {tripStatusLabels[booking.status] ?? booking.status}</p>
            {["pending", "searching", "accepted", "driver_arrived"].includes(booking.status) && <button type="button" onClick={() => void cancelBooking()} disabled={cancelling} className="mt-3 w-full rounded-xl border border-rose-300/30 px-4 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-400/10 disabled:opacity-50">{cancelling ? "جارٍ إلغاء الرحلة…" : "إلغاء الرحلة"}</button>}
            {cancelMessage && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#0d1622] p-3 text-xs leading-6 text-[var(--app-muted)]">{cancelMessage}</p>}
            {tripDetails?.driver && <div className="mt-4 rounded-xl border border-[rgba(245,196,0,.28)] bg-[var(--brand-soft)] p-3">
              <b className="text-sm text-[var(--brand)]">بيانات السائق المعيّن</b>
              <p className="mt-2 text-xs">الاسم: {tripDetails.driver.fullName || "غير متاح"}</p>
              <p className="mt-1 text-xs">المركبة: {[tripDetails.driver.vehicleType, tripDetails.driver.vehicleModel].filter(Boolean).join(" – ") || "غير متاحة"}</p>
              <p className="mt-1 text-xs">رقم اللوحة: {tripDetails.driver.plateNumber || "غير متاح"}</p>
              {tripDetails.driver.phone && <a href={`tel:${tripDetails.driver.phone}`} className="mt-3 inline-flex rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--app-ink)]">اتصال بالسائق</a>}
            </div>}
            {tripDetails?.driverLocation && <div className="mt-4 rounded-xl border border-[rgba(245,196,0,.28)] bg-[var(--brand-soft)] p-3">
              <b className="text-xs text-[var(--brand)]">آخر موقع مُحدّث للسائق</b>
              <p className="mt-2 text-[11px] text-[var(--app-muted)]" dir="ltr">{tripDetails.driverLocation.lat.toFixed(5)}, {tripDetails.driverLocation.lng.toFixed(5)}</p>
              <p className="mt-1 text-[10px] text-[var(--app-muted)]">آخر تحديث: {new Date(tripDetails.driverLocation.updatedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>}
            {tripDetails?.timeline?.length ? <div className="mt-4 border-t border-[var(--app-border)] pt-3">
              <b className="text-xs">تحديثات الرحلة</b>
              <div className="mt-2 space-y-2">{[...tripDetails.timeline].reverse().map((event, index) => <div key={`${event.to ?? "event"}-${index}`} className="flex items-center justify-between gap-3 text-[11px] text-[var(--app-muted)]"><span>{tripStatusLabels[event.to ?? ""] ?? event.to ?? "تحديث"}</span><span>{event.createdAt ? new Date(event.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""}</span></div>)}</div>
            </div> : null}
          </div>}
          <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-6 text-[var(--app-muted)]">السعر التقديري يحسبه الخادم من تعريفة الإدارة. لا يتم تأكيد سائق أو تحصيل دفع إلكتروني في هذه المرحلة.</p>
        </div>}
      </section>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[#111a26] p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">مواقع الرحلة</h3><Navigation className="text-[var(--brand)]" size={20}/></div>
          <div className="relative h-64 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[#101a27]">
            <MapboxCustomerMap
              pickupPoint={pickupPoint}
              destinationPoint={destinationPoint}
              driverLocation={tripDetails?.driverLocation ?? null}
              onRouteSummary={setRouteSummary}
            />
            <span aria-live="polite" className="absolute bottom-3 right-3 rounded-lg bg-[#111a26]/95 px-3 py-1.5 text-[10px] text-[var(--app-muted)]">{routeSummary ?? (pickupPoint && destinationPoint ? "جارٍ حساب مسار القيادة…" : "اختر نقطتي الانطلاق والوجهة لرسم المسار")}</span>
          </div>
        </div>
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[#111a26] p-6 shadow-[var(--shadow-card)]">
          <Clock3 className="mb-4 text-[var(--brand)]" size={22}/>
          <div className="flex items-center justify-between"><h3 className="font-bold">رحلاتك الأخيرة</h3><span className="text-[10px] text-[var(--app-muted)]">{tripHistory.length} رحلة</span></div>
          {historyLoading && <p className="mt-3 text-xs text-[var(--app-muted)]">جارٍ تحميل السجل…</p>}
          {!historyLoading && tripHistory.length===0 && <p className="mt-3 text-xs leading-6 text-[var(--app-muted)]">لا توجد رحلات مسجلة في حسابك حتى الآن.</p>}
          <div className="mt-4 space-y-3">{tripHistory.map((trip) => <article key={trip.tripId} className="rounded-xl border border-[var(--app-border)] bg-[#111a26] p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{tripStatusLabels[trip.status] ?? trip.status}</span><span className="text-[10px] text-[var(--brand)]">{trip.fareEstimate === null ? "—" : `${trip.fareEstimate} ج.م`}</span></div>
            <p className="mt-2 text-xs text-[var(--app-muted)]">من: {trip.pickupLabel || "غير محدد"}</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">إلى: {trip.destinationLabel || "غير محددة"}</p>
            <p className="mt-2 text-[10px] text-[var(--app-muted)]">{trip.createdAt ? new Date(trip.createdAt).toLocaleString("ar-EG") : "تاريخ غير متاح"}</p>
          </article>)}</div>
        </div>
        <div className="rounded-[22px] border border-[rgba(245,196,0,.28)] bg-[var(--brand-soft)] p-5"><b className="text-sm text-[var(--brand)]">خصوصيتك أولاً</b><p className="mt-2 text-xs leading-6 text-[var(--app-muted)]">لا نطلب موقعك إلا عند ضغط زر «موقعي»، ولا نرسل الإحداثيات إلا عند تأكيد طلب الرحلة.</p></div>
        <section className="rounded-[28px] border border-[var(--app-border)] bg-[#111a26] p-6 shadow-[var(--shadow-card)]">
          <h3 className="font-bold">الدعم والشكاوى</h3><p className="mt-1 text-xs leading-6 text-[var(--app-muted)]">أرسل استفسارك إلى فريق الإدارة. لا تكتب بيانات دفع أو كلمات مرور.</p>
          <form onSubmit={submitSupportTicket} className="mt-4 space-y-3">
            <label className="block text-xs text-[var(--app-muted)]">نوع الطلب<select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[#111a26] px-3 py-3 text-sm text-[var(--app-ink)]"><option value="trip">مشكلة في رحلة</option><option value="payment">الدفع</option><option value="driver">السائق</option><option value="account">الحساب</option><option value="app">التطبيق</option><option value="other">أخرى</option></select></label>
            <label className="block text-xs text-[var(--app-muted)]">عنوان الشكوى<input required minLength={5} maxLength={120} value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[#111a26] px-3 py-3 text-sm text-[var(--app-ink)]" /></label>
            <label className="block text-xs text-[var(--app-muted)]">التفاصيل<textarea required minLength={10} maxLength={2500} rows={4} value={supportDescription} onChange={(event) => setSupportDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[#111a26] px-3 py-3 text-sm text-[var(--app-ink)]" /></label>
            <label className="block text-xs text-[var(--app-muted)]">رقم الرحلة (اختياري)<input maxLength={128} value={supportTripId} onChange={(event) => setSupportTripId(event.target.value)} placeholder={booking?.tripId || "يمكن تركه فارغاً"} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[#111a26] px-3 py-3 text-sm text-[var(--app-ink)]" /></label>
            <button type="submit" disabled={supportBusy} className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-[var(--app-ink)] disabled:opacity-50">{supportBusy ? "جارٍ إرسال الشكوى…" : "إرسال إلى الدعم"}</button>
            {supportMessage && <p role="status" aria-live="polite" className="break-words rounded-xl border border-[var(--app-border)] bg-[#111a26] p-3 text-xs leading-6 text-[var(--app-muted)]">{supportMessage}</p>}
          </form>
          <div className="mt-5 border-t border-[var(--app-border)] pt-4">
            <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold">متابعة طلباتك</h4><button type="button" onClick={() => void loadSupportHistory()} disabled={supportHistoryLoading} className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs text-[var(--brand)] disabled:opacity-50">تحديث</button></div>
            {supportHistoryError && <p role="alert" className="mt-3 rounded-xl bg-red-400/5 p-3 text-xs text-red-700">{supportHistoryError}</p>}
            {supportHistoryLoading && <p className="mt-3 text-xs text-[var(--app-muted)]">جارٍ تحميل الشكاوى…</p>}
            {!supportHistoryLoading && !supportHistoryError && supportTickets.length === 0 && <p className="mt-3 text-xs text-[var(--app-muted)]">لا توجد طلبات دعم سابقة.</p>}
            <div className="mt-3 space-y-3">{supportTickets.map((ticket) => <article key={ticket.ticketId} className="rounded-xl border border-[var(--app-border)] bg-[#111a26] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs">{ticket.subject}</b><span className="rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[10px] text-[var(--brand)]">{({open:"مفتوحة",in_progress:"قيد المراجعة",resolved:"تم الحل",closed:"مغلقة"} as Record<string,string>)[ticket.status] ?? ticket.status}</span></div>
              <p className="mt-2 text-xs leading-6 text-[var(--app-muted)]">{ticket.description}</p>
              {ticket.adminNote && <p className="mt-2 rounded-lg border border-[rgba(245,196,0,.2)] bg-[var(--brand-soft)] p-2 text-xs leading-6 text-[var(--brand)]">رد الإدارة: {ticket.adminNote}</p>}
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--app-muted)]"><span>رقم المتابعة: <b dir="ltr">{ticket.ticketId}</b></span><span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("ar-EG") : "التاريخ غير متاح"}</span></div>
            </article>)}</div>
          </div>
        </section>
      </aside>
    </div>
  );
}
