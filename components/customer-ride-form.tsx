"use client";

import { useEffect, useRef, useState } from "react";
import { CarFront, CheckCircle2, CircleDollarSign, Clock3, LocateFixed, MapPin, Navigation, WalletCards } from "lucide-react";

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

export function CustomerRideForm() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupPoint, setPickupPoint] = useState<Point | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Point | null>(null);
  const [vehicle, setVehicle] = useState("economy");
  const [payment, setPayment] = useState("cash");
  const [locating, setLocating] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<{ tripId: string; fareEstimate: number; status: string } | null>(null);
  const pickupInput = useRef<HTMLInputElement>(null);
  const destinationInput = useRef<HTMLInputElement>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setLocationMessage("يلزم إعداد مفتاح Google Maps المقيد لتحديد عناوين الانطلاق والوجهة.");
      return;
    }
    let active = true;
    const attachPlaces = () => {
      if (!active || !window.google?.maps?.places || !pickupInput.current || !destinationInput.current) return;
      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: "eg" },
        fields: ["formatted_address", "geometry", "name"],
      };
      const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput.current, options);
      const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput.current, options);
      pickupAutocomplete.addListener("place_changed", () => {
        const place = pickupAutocomplete.getPlace();
        const point = place.geometry?.location;
        if (!point) {
          setPickupPoint(null);
          setLocationMessage("اختر عنواناً من قائمة اقتراحات Google حتى نتمكن من تحديد إحداثياته.");
          return;
        }
        setPickupPoint({ lat: point.lat(), lng: point.lng() });
        setPickup(place.formatted_address || place.name || pickupInput.current?.value || "");
        setPreview(false);
        setBooking(null);
        setLocationMessage("");
      });
      destinationAutocomplete.addListener("place_changed", () => {
        const place = destinationAutocomplete.getPlace();
        const point = place.geometry?.location;
        if (!point) {
          setDestinationPoint(null);
          setLocationMessage("اختر الوجهة من قائمة اقتراحات Google حتى نتمكن من تحديد إحداثياتها.");
          return;
        }
        setDestinationPoint({ lat: point.lat(), lng: point.lng() });
        setDestination(place.formatted_address || place.name || destinationInput.current?.value || "");
        setPreview(false);
        setBooking(null);
        setLocationMessage("");
      });
      setMapsReady(true);
      setLocationMessage("خرائط العناوين جاهزة. اختر الانطلاق والوجهة من الاقتراحات.");
    };

    if (window.google?.maps?.places) {
      attachPlaces();
      return () => { active = false; };
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-capital-taxi-maps]");
    if (existing) {
      existing.addEventListener("load", attachPlaces);
      return () => {
        active = false;
        existing.removeEventListener("load", attachPlaces);
      };
    }
    const script = document.createElement("script");
    script.dataset.capitalTaxiMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=ar&region=EG`;
    script.async = true;
    script.defer = true;
    script.onload = attachPlaces;
    script.onerror = () => {
      if (active) setLocationMessage("تعذر تحميل Google Maps. تحقق من المفتاح وتفعيل Maps JavaScript API وPlaces API.");
    };
    document.head.appendChild(script);
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
        const data = await response.json() as { trip?: { status?: string } };
        const status = data.trip?.status;
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
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          pickup: { label: pickup, lat: pickupPoint.lat, lng: pickupPoint.lng },
          destination: { label: destination, lat: destinationPoint.lat, lng: destinationPoint.lng },
          vehicleCategory: vehicle,
          paymentMethod: payment,
        }),
      });
      const data = await response.json() as {
        tripId?: string;
        fareEstimate?: number;
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
      if (!data.tripId || typeof data.fareEstimate !== "number") throw new Error("استجابة الخادم غير مكتملة.");
      setBooking({ tripId: data.tripId, fareEstimate: data.fareEstimate, status: data.status ?? "pending" });
      idempotencyKey.current = null;
      setLocationMessage("تم تسجيل طلب الرحلة على الخادم. سيبدأ البحث عن سائق بعد تفعيل مجدول التوزيع.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "تعذر تسجيل طلب الرحلة.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVehicle = vehicleOptions.find((item) => item.id === vehicle);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-3xl border border-white/10 bg-panel p-5 md:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div><p className="text-xs text-gold">خطوة 01</p><h2 className="mt-1 text-lg font-bold">حدد تفاصيل المشوار</h2></div>
          <span className="rounded-full border border-gold/20 bg-gold/5 px-3 py-1.5 text-xs text-gold">رحلة جديدة</span>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-night p-4">
            <label htmlFor="pickup" className="mb-2 block text-xs text-muted">نقطة الانطلاق</label>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full border-2 border-emerald-400"/>
              <input ref={pickupInput} id="pickup" value={pickup} onChange={(event) => { setPickup(event.target.value); setPickupPoint(null); setPreview(false); setBooking(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="اختر عنواناً من الاقتراحات أو استخدم موقعي"/>
              <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gold/25 px-3 py-2 text-xs text-gold transition hover:bg-gold/10 disabled:opacity-50"><LocateFixed size={15}/>{locating ? "جارٍ التحديد" : "موقعي"}</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-night p-4">
            <label htmlFor="destination" className="mb-2 block text-xs text-muted">الوجهة</label>
            <div className="flex items-center gap-3"><MapPin className="shrink-0 text-gold" size={18}/><input ref={destinationInput} id="destination" value={destination} onChange={(event) => { setDestination(event.target.value); setDestinationPoint(null); setPreview(false); setBooking(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="جامعة سيناء، المساعيد، الكورنيش…"/></div>
          </div>
          <p className="text-[11px] text-muted">{mapsReady ? "اختيار العناوين مدعوم بخرائط Google." : "يلزم مفتاح Google Maps مفعّل عليه Places API لاختيار الوجهة بدقة."}</p>
          {locationMessage && <p aria-live="polite" className="rounded-xl bg-white/5 px-4 py-3 text-xs leading-6 text-muted">{locationMessage}</p>}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">اختر فئة السيارة</h3><span className="text-xs text-muted">نوع المركبة</span></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {vehicleOptions.map(({id,name,detail,seats,icon:Icon}) => <button key={id} type="button" onClick={() => {setVehicle(id);setPreview(false);setBooking(null);}} aria-pressed={vehicle===id} className={`rounded-2xl border p-4 text-right transition ${vehicle===id ? "border-gold/60 bg-gold/10 shadow-glow" : "border-white/10 bg-night hover:border-white/25"}`}><Icon className={vehicle===id ? "mb-4 text-gold" : "mb-4 text-muted"} size={23}/><b className="block text-sm">{name}</b><span className="mt-1 block text-[11px] text-muted">{detail}</span><span className="mt-3 block text-[10px] text-muted">{seats}</span></button>)}
          </div>
        </div>

        <div className="mt-7">
          <h3 className="mb-3 font-bold">وسيلة الدفع المفضلة</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => {setPayment("cash");setPreview(false);}} aria-pressed={payment==="cash"} className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${payment==="cash" ? "border-gold/60 bg-gold/10 text-gold" : "border-white/10 bg-night text-muted"}`}><CircleDollarSign size={20}/> نقداً</button>
            <button type="button" onClick={() => {setPayment("wallet");setPreview(false);}} aria-pressed={payment==="wallet"} className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${payment==="wallet" ? "border-gold/60 bg-gold/10 text-gold" : "border-white/10 bg-night text-muted"}`}><WalletCards size={20}/> محفظة إلكترونية</button>
          </div>
        </div>

        <button type="button" onClick={showPreview} className="mt-7 w-full rounded-xl bg-gold px-5 py-4 font-bold text-night transition hover:bg-[#e8c77e]">معاينة تفاصيل الرحلة</button>
        {preview && <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-300"><CheckCircle2 size={18}/><b className="text-sm">تم التحقق من نقطتي الرحلة</b></div>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="block text-xs text-muted">من</span><b>{pickup}</b></div><div><span className="block text-xs text-muted">إلى</span><b>{destination}</b></div><div><span className="block text-xs text-muted">السيارة</span><b>{selectedVehicle?.name}</b></div><div><span className="block text-xs text-muted">الدفع المفضل</span><b>{payment==="cash" ? "نقداً" : "محفظة إلكترونية"}</b></div></div>
          <button type="button" disabled={submitting || Boolean(booking)} onClick={createTrip} className="mt-5 w-full rounded-xl bg-gold px-4 py-3 font-bold text-night disabled:opacity-50">{submitting ? "جارٍ تسجيل الطلب…" : booking ? "تم تسجيل الطلب" : "تأكيد طلب الرحلة"}</button>
          {booking && <div role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-night p-4 text-sm"><b className="text-emerald-300">طلب الرحلة مسجل</b><p className="mt-2 text-xs text-muted">رقم الطلب: {booking.tripId}</p><p className="mt-1">السعر التقديري: <b className="text-gold">{booking.fareEstimate} ج.م</b></p><p className="mt-2 text-xs text-muted">الحالة: {tripStatusLabels[booking.status] ?? booking.status}</p></div>}
          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-6 text-muted">السعر التقديري يحسبه الخادم من تعريفة الإدارة. لا يتم تأكيد سائق أو تحصيل دفع إلكتروني في هذه المرحلة.</p>
        </div>}
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-panel p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">مسار الرحلة</h3><Navigation className="text-gold" size={20}/></div>
          <div className="relative grid h-56 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#101923] text-center">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:"linear-gradient(35deg,transparent 48%,#718096 49%,#718096 50%,transparent 51%),linear-gradient(125deg,transparent 48%,#718096 49%,#718096 50%,transparent 51%)",backgroundSize:"76px 68px"}}/>
            <div className="relative px-5"><MapPin className="mx-auto mb-3 text-gold" size={28}/><b className="block text-sm">تحديد العناوين عبر Google</b><p className="mt-2 text-xs leading-6 text-muted">يتم التحقق من إحداثيات النقطتين قبل إرسال طلب الرحلة. خريطة المسار الحية ستضاف في مرحلة لاحقة.</p></div>
            <span className="absolute bottom-3 right-3 rounded-lg bg-night/80 px-3 py-1.5 text-[10px] text-muted">لا تعرض مساراً حياً بعد</span>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-panel p-6"><Clock3 className="mb-4 text-gold" size={22}/><h3 className="font-bold">رحلاتك الأخيرة</h3><p className="mt-2 text-sm leading-6 text-muted">سجل الرحلات سيظهر بعد إضافة واجهة قراءة الرحلات الخاصة بالعميل.</p></div>
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5"><b className="text-sm text-gold">خصوصيتك أولاً</b><p className="mt-2 text-xs leading-6 text-muted">لا نطلب موقعك إلا عند ضغط زر «موقعي»، ولا نرسل الإحداثيات إلا عند تأكيد طلب الرحلة.</p></div>
      </aside>
    </div>
  );
}
