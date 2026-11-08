"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, CarFront, CircleDollarSign, ClipboardList, MapPin, Power, ShieldCheck, WalletCards } from "lucide-react";

type TripOffer = {
  offerId: string;
  tripId: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  expiresAt: string;
};

export function DriverWorkspace() {
  const [available, setAvailable] = useState(false);
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [section, setSection] = useState("offers");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("سجّل الدخول بحساب سائق معتمد لتفعيل الخدمات.");
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [acceptedTripId, setAcceptedTripId] = useState<string | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [application, setApplication] = useState({ fullName: "", phone: "", vehicleType: "ملاكي", vehicleModel: "", plateNumber: "" });
  const [applicationBusy, setApplicationBusy] = useState(false);
  const lastLocationSentAt = useRef(0);

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
    if (!available) return;
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
          if (!response.ok && mounted) {
            const data = await response.json().catch(() => ({})) as { error?: string };
            if (data.error === "approved_driver_required") setMessage("حساب السائق يحتاج إلى اعتماد الإدارة.");
          }
        } catch {
          if (mounted) setMessage("تعذر تحديث الموقع. تحقق من اتصال الإنترنت.");
        }
      }, () => {
        if (mounted) setMessage("اسمح للموقع من المتصفح حتى تظهر لك الرحلات القريبة.");
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
  }, [available, loadOffers]);

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
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

  async function acceptOffer(offer: TripOffer) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(offer.tripId)}/accept`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json() as { error?: string; status?: string };
      if (!response.ok) {
        if (response.status === 409) throw new Error("سبق قبول الرحلة أو لم تعد متاحة. حدّث العروض.");
        if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        throw new Error("تعذر قبول الرحلة.");
      }
      setAcceptedTripId(offer.tripId);
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
      <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-gold"/><div><h2 className="font-bold">طلب الانضمام كسائق</h2><p className="mt-1 text-xs text-muted">املأ بياناتك ومركبتك لإرسال الطلب إلى الإدارة.</p></div></div>
      <form onSubmit={submitApplication} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-muted">الاسم بالكامل<input required maxLength={100} value={application.fullName} onChange={e=>setApplication(v=>({...v,fullName:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-muted">رقم الهاتف<input required type="tel" maxLength={25} value={application.phone} onChange={e=>setApplication(v=>({...v,phone:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" dir="ltr"/></label>
        <label className="text-xs text-muted">نوع المركبة<input required maxLength={40} value={application.vehicleType} onChange={e=>setApplication(v=>({...v,vehicleType:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-muted">موديل المركبة<input required maxLength={60} value={application.vehicleModel} onChange={e=>setApplication(v=>({...v,vehicleModel:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
        <label className="text-xs text-muted sm:col-span-2">رقم اللوحة<input required maxLength={30} value={application.plateNumber} onChange={e=>setApplication(v=>({...v,plateNumber:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
        <button type="submit" disabled={applicationBusy} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-night disabled:opacity-50 sm:col-span-2">{applicationBusy ? "جارٍ إرسال الطلب…" : "إرسال طلب الانضمام"}</button>
      </form>
      <p className="mt-3 text-[11px] leading-6 text-muted">لا ترفع مستندات حساسة هنا حالياً. ستتم إضافة قناة آمنة لمراجعة المستندات قبل التشغيل.</p>
    </section>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"حالة الاتصال",value:available ? "متاح – متصل بالخادم" : "غير متصل",icon:Power},{label:"العروض الحالية",value:String(offers.length),icon:ClipboardList},{label:"الرحلة النشطة",value:activeTripId ? "قيد المتابعة" : "لا توجد",icon:CarFront},{label:"اعتماد الحساب",value:"يتحقق منه الخادم",icon:BadgeCheck}].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-panel p-5"><Icon className="mb-5 text-gold" size={21}/><p className="text-xs text-muted">{label}</p><b className="mt-2 block text-lg">{value}</b></div>)}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-3xl border border-white/10 bg-panel p-6">
        <div className="mb-4 flex items-center justify-between"><CarFront className="text-gold" size={28}/><span className="rounded-full bg-amber-300/10 px-3 py-1 text-[11px] text-amber-200">حساب معتمد فقط</span></div>
        <h2 className="text-xl font-bold">حالة استقبال الرحلات</h2>
        <p className="mt-3 text-sm leading-7 text-muted">عند تفعيل التوفر، يطلب المتصفح إذن الموقع ويرسل آخر إحداثياتك أثناء اتصالك فقط. يمكنك إيقاف التوفر في أي وقت ما لم تكن لديك رحلة نشطة.</p>
        <button type="button" disabled={busy} aria-pressed={available} onClick={toggleAvailability} className={`mt-6 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-4 text-sm font-bold transition disabled:opacity-50 ${available ? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-300" : "bg-gold text-night hover:bg-[#e8c77e]"}`}><Power size={18}/>{busy ? "جارٍ التنفيذ…" : available ? "إيقاف استقبال الرحلات" : "بدء استقبال الرحلات"}</button>
        {message && <p role="status" className="mt-4 rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
      </section>
      <section className="rounded-3xl border border-white/10 bg-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">مساحة العمل</h2><div className="flex gap-2">{[{id:"offers",label:"العروض"},{id:"active",label:"الرحلة الحالية"},{id:"history",label:"السجل"}].map(item=><button key={item.id} type="button" onClick={()=>setSection(item.id)} className={`rounded-lg px-3 py-2 text-xs ${section===item.id ? "bg-gold text-night font-bold" : "bg-white/5 text-muted"}`}>{item.label}</button>)}</div></div>
        {section==="offers" && <div className="mt-5 space-y-3">
          {!available && <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center"><div><ClipboardList className="mx-auto mb-3 text-gold" size={26}/><b className="block text-sm">فعّل التوفر لاستقبال العروض</b><p className="mt-2 text-xs leading-6 text-muted">العروض الحقيقية تظهر بعد اعتماد الحساب وتحديث الموقع.</p></div></div>}
          {available && offers.length===0 && <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center"><div><MapPin className="mx-auto mb-3 text-gold" size={26}/><b className="block text-sm">لا توجد عروض متاحة الآن</b><p className="mt-2 text-xs leading-6 text-muted">سيتم تحديث القائمة تلقائياً كل 10 ثوانٍ.</p></div></div>}
          {offers.map(offer=><article key={offer.offerId} className="rounded-2xl border border-white/10 bg-night p-4"><div className="grid gap-3 sm:grid-cols-2"><div><span className="text-[11px] text-muted">نقطة الانطلاق</span><p className="mt-1 text-sm font-semibold">{offer.pickupLabel ?? "غير محدد"}</p></div><div><span className="text-[11px] text-muted">الوجهة</span><p className="mt-1 text-sm font-semibold">{offer.destinationLabel ?? "غير محددة"}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="text-sm text-gold">{offer.fareEstimate === null ? "السعر غير متاح" : `تقدير السعر: ${offer.fareEstimate} ج.م`}</span><button type="button" disabled={busy} onClick={()=>acceptOffer(offer)} className="rounded-lg bg-gold px-4 py-2 text-xs font-bold text-night disabled:opacity-50">قبول الرحلة</button></div></article>)}
        </div>}
        {section==="active" && <div className="mt-5 grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center"><div><CarFront className="mx-auto mb-3 text-gold" size={28}/><b className="block text-sm">{activeTripId ? "تم قبول الرحلة" : "لا توجد رحلة نشطة"}</b>{activeTripId && <p className="mt-2 break-all text-xs text-muted">رقم الرحلة: {activeTripId}</p>}<p className="mt-2 text-xs leading-6 text-muted">تحديث مراحل الرحلة وإنهاؤها سيضاف في المرحلة التالية.</p></div></div>}
        {section==="history" && <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center"><div><WalletCards className="mx-auto mb-3 text-gold" size={28}/><b className="block text-sm">سجل الرحلات غير متاح بعد</b><p className="mt-2 text-xs leading-6 text-muted">سيظهر بعد إضافة واجهات سجل الرحلات.</p></div></div>}
      </section>
    </div>
    <section className="mt-5 rounded-3xl border border-white/10 bg-panel p-6"><div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-gold"/><h2 className="font-bold">متطلبات تفعيل حساب السائق</h2></div><div className="grid gap-3 sm:grid-cols-3">{["بيانات السائق والتحقق من الهوية","بيانات المركبة والترخيص","موافقة الإدارة وتفعيل الحساب"].map((item,i)=><div key={item} className="flex items-start gap-3 rounded-xl bg-night p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold/10 text-xs text-gold">{i+1}</span><p className="text-xs leading-6 text-muted">{item}</p></div>)}</div></section>
  </div>;
}
