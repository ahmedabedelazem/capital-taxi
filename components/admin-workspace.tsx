"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BadgeCheck, CarFront, ChartNoAxesCombined, CircleHelp, Clock3, RefreshCw, SlidersHorizontal, Users, XCircle } from "lucide-react";

type Application = {
  uid: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehicleModel: string;
  plateNumber: string;
  status: "pending";
  submittedAt: string | null;
};

const sections = [
  { id: "overview", label: "نظرة عامة", icon: ChartNoAxesCombined, title: "مؤشرات التشغيل" },
  { id: "drivers", label: "طلبات السائقين", icon: CarFront, title: "مراجعة طلبات السائقين" },
  { id: "trips", label: "الرحلات", icon: Activity, title: "متابعة الرحلات" },
  { id: "pricing", label: "التسعير", icon: SlidersHorizontal, title: "إعدادات التسعير" },
  { id: "support", label: "الدعم", icon: CircleHelp, title: "الدعم والشكاوى" }
] as const;

export function AdminWorkspace() {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("overview");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [message, setMessage] = useState("لوحة الإدارة تعرض بيانات الخادم بعد تسجيل الدخول بحساب مدير معتمد.");
  const [pricingForm, setPricingForm] = useState({ enabled: false, baseFare: "", perKm: "", minimumFare: "", maximumDistanceKm: "", roundingIncrement: "1", minLat: "", maxLat: "", minLng: "", maxLng: "" });
  const [dispatchForm, setDispatchForm] = useState({ stageRadiiKm: "", offerTtlSeconds: "60", maxOffersPerStage: "5" });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const current = sections.find((section) => section.id === active)!;

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/drivers", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("سجّل الدخول بحساب الإدارة.");
      if (response.status === 403) throw new Error("هذا الحساب لا يملك صلاحية الإدارة.");
      if (!response.ok) throw new Error("تعذر تحميل طلبات السائقين.");
      const data = await response.json() as { applications?: Application[] };
      setApplications(Array.isArray(data.applications) ? data.applications : []);
      setMessage("تم تحديث طلبات السائقين من الخادم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الطلبات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "drivers") void loadApplications();
  }, [active, loadApplications]);

  useEffect(() => {
    if (active !== "pricing") return;
    let mounted = true;
    setConfigLoading(true);
    setMessage("");
    Promise.all([
      fetch("/api/admin/config/pricing", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/config/dispatch", { credentials: "same-origin", cache: "no-store" }),
    ]).then(async ([pricingResponse, dispatchResponse]) => {
      if (pricingResponse.status === 401 || pricingResponse.status === 403 ||
          dispatchResponse.status === 401 || dispatchResponse.status === 403) {
        throw new Error("يلزم تسجيل الدخول بصلاحية مدير لعرض إعدادات التشغيل.");
      }
      if (!pricingResponse.ok || !dispatchResponse.ok) throw new Error("تعذر تحميل إعدادات التشغيل.");
      const [pricingData, dispatchData] = await Promise.all([
        pricingResponse.json() as Promise<{ config?: Record<string, unknown> | null }>,
        dispatchResponse.json() as Promise<{ config?: Record<string, unknown> | null }>,
      ]);
      if (!mounted) return;
      const pricing = pricingData.config;
      const area = pricing?.serviceArea && typeof pricing.serviceArea === "object"
        ? pricing.serviceArea as Record<string, unknown> : {};
      if (pricing) setPricingForm({
        enabled: pricing.enabled === true,
        baseFare: String(pricing.baseFare ?? ""),
        perKm: String(pricing.perKm ?? ""),
        minimumFare: String(pricing.minimumFare ?? ""),
        maximumDistanceKm: String(pricing.maximumDistanceKm ?? ""),
        roundingIncrement: String(pricing.roundingIncrement ?? "1"),
        minLat: String(area.minLat ?? ""),
        maxLat: String(area.maxLat ?? ""),
        minLng: String(area.minLng ?? ""),
        maxLng: String(area.maxLng ?? ""),
      });
      const dispatch = dispatchData.config;
      if (dispatch) setDispatchForm({
        stageRadiiKm: Array.isArray(dispatch.stageRadiiKm) ? dispatch.stageRadiiKm.join(", ") : "",
        offerTtlSeconds: String(dispatch.offerTtlSeconds ?? "60"),
        maxOffersPerStage: String(dispatch.maxOffersPerStage ?? "5"),
      });
      setMessage(pricing || dispatch ? "تم تحميل إعدادات التشغيل الحالية." : "لم تُضبط التعريفة أو مراحل التوزيع بعد. أدخل القيم ثم احفظها.");
    }).catch((error: unknown) => {
      if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحميل الإعدادات.");
    }).finally(() => {
      if (mounted) setConfigLoading(false);
    });
    return () => { mounted = false; };
  }, [active]);

  async function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigSaving(true);
    setMessage("");
    try {
      const payload = {
        enabled: pricingForm.enabled,
        baseFare: Number(pricingForm.baseFare),
        perKm: Number(pricingForm.perKm),
        minimumFare: Number(pricingForm.minimumFare),
        maximumDistanceKm: Number(pricingForm.maximumDistanceKm),
        roundingIncrement: Number(pricingForm.roundingIncrement),
        serviceArea: {
          minLat: Number(pricingForm.minLat), maxLat: Number(pricingForm.maxLat),
          minLng: Number(pricingForm.minLng), maxLng: Number(pricingForm.maxLng),
        },
      };
      const response = await fetch("/api/admin/config/pricing", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401 || response.status === 403) throw new Error("لا تملك صلاحية تعديل التعريفة.");
      if (!response.ok) throw new Error("رفض الخادم القيم. راجع السعر وحدود نطاق الخدمة.");
      setMessage("تم حفظ التعريفة ونطاق الخدمة في Firestore مع تسجيل عملية الإدارة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ التعريفة.");
    } finally {
      setConfigSaving(false);
    }
  }

  async function saveDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigSaving(true);
    setMessage("");
    try {
      const radii = dispatchForm.stageRadiiKm.split(",").map((value) => Number(value.trim()));
      const response = await fetch("/api/admin/config/dispatch", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageRadiiKm: radii,
          offerTtlSeconds: Number(dispatchForm.offerTtlSeconds),
          maxOffersPerStage: Number(dispatchForm.maxOffersPerStage),
        }),
      });
      if (response.status === 401 || response.status === 403) throw new Error("لا تملك صلاحية تعديل إعدادات التوزيع.");
      if (!response.ok) throw new Error("راجع أن أنصاف الأقطار تصاعدية وأن مدة العرض من 15 إلى 300 ثانية.");
      setMessage("تم حفظ مراحل توزيع الرحلات في Firestore مع تسجيل عملية الإدارة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ إعدادات التوزيع.");
    } finally {
      setConfigSaving(false);
    }
  }

  async function decide(uid: string, decision: "approved" | "rejected") {
    setBusyUid(uid);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/drivers/${encodeURIComponent(uid)}/decision`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json() as { error?: string };
      if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      if (response.status === 403) throw new Error("لا تملك صلاحية تنفيذ قرار الاعتماد.");
      if (response.status === 404) throw new Error("طلب السائق غير موجود أو تمت مراجعته.");
      if (!response.ok) throw new Error("تعذر حفظ قرار المراجعة. لم نغيّر حالة الطلب في الواجهة.");
      setApplications((current) => current.filter((application) => application.uid !== uid));
      setMessage(decision === "approved"
        ? "تم اعتماد السائق وتحديث صلاحية حسابه."
        : "تم رفض الطلب وتسجيل القرار في سجل التدقيق.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ القرار.");
    } finally {
      setBusyUid(null);
    }
  }

  return <div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"طلبات سائقين معلقة",value:active==="drivers" ? String(applications.length) : "—",icon:CarFront},{label:"مراجعة الصلاحيات",value:"خادمية",icon:BadgeCheck},{label:"الرحلات النشطة",value:"—",icon:Activity},{label:"حالة النظام",value:"تجهيز",icon:Users}].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-panel p-5"><Icon className="mb-5 text-gold" size={21}/><p className="text-xs text-muted">{label}</p><b className="mt-2 block text-2xl">{value}</b><span className="mt-1 block text-[10px] text-muted">بيانات حية عند توفر API القسم</span></div>)}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="أقسام الإدارة" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-panel p-3 lg:flex-col">
        {sections.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>setActive(id)} aria-current={active===id ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition lg:w-full ${active===id ? "bg-gold text-night font-bold" : "text-muted hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</button>)}
      </nav>
      <section className="min-h-[360px] rounded-3xl border border-white/10 bg-panel p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-gold">CONTROL CENTER</p><h2 className="mt-1 text-xl font-bold">{current.title}</h2></div>
          {active === "drivers" && <button type="button" disabled={loading} onClick={() => void loadApplications()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-muted hover:border-gold/40 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> تحديث القائمة</button>}
          {active !== "drivers" && <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-[11px] text-amber-200">قيد الاستكمال</span>}
        </div>
        {active === "overview" && <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-night p-5"><h3 className="font-bold">حالة المنصة</h3><p className="mt-3 text-sm leading-7 text-muted">تم ربط بعض خدمات العميل والسائق والإدارة بخدمات خادمية. لا تُعرض أرقام تشغيل غير متحققة.</p></div><div className="rounded-2xl bg-night p-5"><h3 className="font-bold">الأولويات</h3><ul className="mt-3 space-y-2 text-sm text-muted"><li>• اعتماد السائقين ومراجعة الطلبات</li><li>• ضبط التعريفة ونطاق الخدمة</li><li>• تشغيل مجدول التوزيع الموثوق</li><li>• استكمال متابعة الرحلات والتقارير</li></ul></div></div>}
        {active === "drivers" && <div className="mt-5 space-y-4">
          {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
          {loading && <div className="py-12 text-center text-sm text-muted">جارٍ تحميل الطلبات…</div>}
          {!loading && applications.length === 0 && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><CarFront className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">لا توجد طلبات معلقة</b><p className="mt-2 text-xs text-muted">ستظهر هنا طلبات السائقين الجديدة بعد إرسالها.</p></div></div>}
          {applications.map((application) => <article key={application.uid} className="rounded-2xl border border-white/10 bg-night p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{application.fullName || "اسم غير متاح"}</h3><p className="mt-1 text-xs text-muted" dir="ltr">{application.phone}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-300/10 px-3 py-1.5 text-[11px] text-amber-200"><Clock3 size={13}/> قيد المراجعة</span></div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><span className="block text-[11px] text-muted">نوع المركبة</span><b>{application.vehicleType}</b></div><div><span className="block text-[11px] text-muted">الموديل</span><b>{application.vehicleModel}</b></div><div><span className="block text-[11px] text-muted">رقم اللوحة</span><b>{application.plateNumber}</b></div></div>
            <p className="mt-3 text-[10px] text-muted">معرّف الحساب: <span dir="ltr">{application.uid}</span>{application.submittedAt ? ` • تاريخ الإرسال: ${new Date(application.submittedAt).toLocaleString("ar-EG")}` : ""}</p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"><button type="button" disabled={busyUid !== null} onClick={() => void decide(application.uid, "approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/15 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-400/25 disabled:opacity-40"><BadgeCheck size={15}/>{busyUid===application.uid ? "جارٍ الحفظ…" : "اعتماد السائق"}</button><button type="button" disabled={busyUid !== null} onClick={() => void decide(application.uid, "rejected")} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 px-4 py-2.5 text-xs text-rose-200 hover:bg-rose-400/10 disabled:opacity-40"><XCircle size={15}/> رفض الطلب</button></div>
          </article>)}
        </div>}
        {active === "pricing" && <div className="mt-5 space-y-5">
          {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
          {configLoading && <p className="py-8 text-center text-sm text-muted">جارٍ تحميل الإعدادات…</p>}
          {!configLoading && <div className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={savePricing} className="space-y-4 rounded-2xl border border-white/10 bg-night p-5">
              <div><h3 className="font-bold">تعريفة الرحلات ونطاق الخدمة</h3><p className="mt-1 text-xs text-muted">كل القيم تحفظ خادمياً ولا يحدد العميل السعر.</p></div>
              <label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>تفعيل التعريفة</span><input type="checkbox" checked={pricingForm.enabled} onChange={e=>setPricingForm(v=>({...v,enabled:e.target.checked}))}/></label>
              <div className="grid grid-cols-2 gap-3">
                {([{key:"baseFare",label:"فتح العداد"},{key:"perKm",label:"السعر لكل كم"},{key:"minimumFare",label:"الحد الأدنى"},{key:"maximumDistanceKm",label:"أقصى مسافة كم"},{key:"roundingIncrement",label:"خطوة التقريب"}] as const).map(field=><label key={field.key} className="text-xs text-muted">{field.label}<input required type="number" min="0" step="0.01" value={pricingForm[field.key]} onChange={e=>setPricingForm(v=>({...v,[field.key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50"/></label>)}
              </div>
              <div><p className="mb-2 text-xs font-bold">حدود نطاق الخدمة – إحداثيات</p><div className="grid grid-cols-2 gap-3">
                {([{key:"minLat",label:"أقل خط عرض"},{key:"maxLat",label:"أعلى خط عرض"},{key:"minLng",label:"أقل خط طول"},{key:"maxLng",label:"أعلى خط طول"}] as const).map(field=><label key={field.key} className="text-xs text-muted">{field.label}<input required type="number" step="0.000001" value={pricingForm[field.key]} onChange={e=>setPricingForm(v=>({...v,[field.key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50"/></label>)}
              </div></div>
              <button disabled={configSaving} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-bold text-night disabled:opacity-50">{configSaving ? "جارٍ الحفظ…" : "حفظ التعريفة والنطاق"}</button>
            </form>
            <form onSubmit={saveDispatch} className="space-y-4 rounded-2xl border border-white/10 bg-night p-5">
              <div><h3 className="font-bold">مراحل توزيع السائقين</h3><p className="mt-1 text-xs text-muted">المسافات بالكيلومتر، ويجب أن تكون تصاعدية.</p></div>
              <label className="block text-xs text-muted">أنصاف أقطار المراحل – مثال: 2, 5, 10<input required value={dispatchForm.stageRadiiKm} onChange={e=>setDispatchForm(v=>({...v,stageRadiiKm:e.target.value}))} placeholder="2, 5, 10" className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <label className="block text-xs text-muted">مدة العرض بالثواني (15–300)<input required type="number" min="15" max="300" value={dispatchForm.offerTtlSeconds} onChange={e=>setDispatchForm(v=>({...v,offerTtlSeconds:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <label className="block text-xs text-muted">أقصى عدد عروض لكل مرحلة (1–30)<input required type="number" min="1" max="30" value={dispatchForm.maxOffersPerStage} onChange={e=>setDispatchForm(v=>({...v,maxOffersPerStage:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <button disabled={configSaving} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-bold text-night disabled:opacity-50">{configSaving ? "جارٍ الحفظ…" : "حفظ إعدادات التوزيع"}</button>
              <p className="text-[11px] leading-6 text-muted">الحفظ يجهز إعدادات العامل فقط. يلزم ضبط APP_BASE_URL وDISPATCH_WORKER_SECRET وتشغيل مجدول موثوق خارج التطبيق.</p>
            </form>
          </div>}
        </div>}
        {active !== "overview" && active !== "drivers" && active !== "pricing" && <div className="mt-6 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><current.icon className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">قسم {current.label}</b><p className="mt-2 max-w-md text-xs leading-6 text-muted">سيتم تفعيل أدوات هذا القسم بعد إضافة API والتحقق من صلاحية المدير على الخادم.</p></div></div>}
      </section>
    </div>
  </div>;
}
