"use client";

import type { FormEvent } from "react";
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

type AdminTrip = {
  tripId: string;
  status: string;
  pickupLabel: string | null;
  destinationLabel: string | null;
  fareEstimate: number | null;
  distanceKm: number | null;
  vehicleCategory: string | null;
  paymentMethod: string | null;
  driverUid: string | null;
  driverLocation: { lat: number; lng: number; updatedAt: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SupportTicket = {
  ticketId: string;
  uid: string | null;
  userRole: "customer" | "driver" | null;
  category: string;
  subject: string;
  description: string;
  tripId: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  adminNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const tripStatusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "جديدة", className: "border-sky-300/20 bg-sky-300/10 text-sky-200" },
  searching: { label: "جارٍ البحث عن سائق", className: "border-amber-300/20 bg-amber-300/10 text-amber-200" },
  accepted: { label: "تم قبولها", className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" },
  driver_arrived: { label: "السائق وصل", className: "border-violet-300/20 bg-violet-300/10 text-violet-200" },
  in_progress: { label: "قيد التنفيذ", className: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" },
  completed: { label: "مكتملة", className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" },
  cancelled: { label: "ملغاة", className: "border-rose-300/20 bg-rose-300/10 text-rose-200" },
  no_driver: { label: "لم يتوفر سائق", className: "border-orange-300/20 bg-orange-300/10 text-orange-200" },
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
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportBusyId, setSupportBusyId] = useState<string | null>(null);
  const [supportNoteDrafts, setSupportNoteDrafts] = useState<Record<string, string>>({});
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripStatusFilter, setTripStatusFilter] = useState("active");
  const [loading, setLoading] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [message, setMessage] = useState("لوحة الإدارة تعرض بيانات الخادم بعد تسجيل الدخول بحساب مدير معتمد.");
  const [pricingForm, setPricingForm] = useState({ enabled: false, baseFare: "", perKm: "", minimumFare: "", maximumDistanceKm: "", roundingIncrement: "1", minLat: "", maxLat: "", minLng: "", maxLng: "" });
  const [dispatchForm, setDispatchForm] = useState({ stageRadiiKm: "", offerTtlSeconds: "60", maxOffersPerStage: "5" });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState<{ pendingDrivers: number; activeTrips: number } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [overviewRefresh, setOverviewRefresh] = useState(0);
  const current = sections.find((section) => section.id === active)!;

  useEffect(() => {
    if (active !== "overview") return;
    let mounted = true;
    setOverviewLoading(true);
    setOverviewError("");
    Promise.all([
      fetch("/api/admin/drivers", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/trips", { credentials: "same-origin", cache: "no-store" }),
    ]).then(async ([driversResponse, tripsResponse]) => {
      if (driversResponse.status === 401 || tripsResponse.status === 401) {
        throw new Error("سجّل الدخول بحساب الإدارة لعرض مؤشرات التشغيل.");
      }
      if (driversResponse.status === 403 || tripsResponse.status === 403) {
        throw new Error("هذا الحساب لا يملك صلاحية الإدارة.");
      }
      if (!driversResponse.ok || !tripsResponse.ok) {
        throw new Error("تعذر تحميل مؤشرات التشغيل من الخادم.");
      }
      const [driversData, tripsData] = await Promise.all([
        driversResponse.json() as Promise<{ applications?: Application[] }>,
        tripsResponse.json() as Promise<{ trips?: AdminTrip[] }>,
      ]);
      if (!mounted) return;
      setOverviewMetrics({
        pendingDrivers: Array.isArray(driversData.applications) ? driversData.applications.length : 0,
        activeTrips: Array.isArray(tripsData.trips) ? tripsData.trips.length : 0,
      });
    }).catch((error: unknown) => {
      if (mounted) setOverviewError(error instanceof Error ? error.message : "تعذر تحميل المؤشرات.");
    }).finally(() => {
      if (mounted) setOverviewLoading(false);
    });
    return () => { mounted = false; };
  }, [active, overviewRefresh]);

  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    setMessage("");
    try {
      const query = tripStatusFilter === "active" ? "" : `?status=${encodeURIComponent(tripStatusFilter)}`;
      const response = await fetch(`/api/admin/trips${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("سجّل الدخول بحساب الإدارة.");
      if (response.status === 403) throw new Error("هذا الحساب لا يملك صلاحية الإدارة.");
      if (!response.ok) throw new Error("تعذر تحميل الرحلات.");
      const data = await response.json() as { trips?: AdminTrip[] };
      setTrips(Array.isArray(data.trips) ? data.trips : []);
      setMessage("تم تحديث قائمة الرحلات من الخادم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الرحلات.");
    } finally {
      setTripsLoading(false);
    }
  }, [tripStatusFilter]);

  const loadSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/support", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("سجّل الدخول بحساب الإدارة.");
      if (response.status === 403) throw new Error("هذا الحساب لا يملك صلاحية الإدارة.");
      if (!response.ok) throw new Error("تعذر تحميل تذاكر الدعم.");
      const data = await response.json() as { tickets?: SupportTicket[] };
      setSupportTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setMessage("تم تحميل تذاكر الدعم من الخادم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الدعم.");
    } finally {
      setSupportLoading(false);
    }
  }, []);

  async function updateSupportTicket(ticketId: string, status: SupportTicket["status"], adminNote?: string) {
    setSupportBusyId(ticketId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status, ...(adminNote !== undefined ? { adminNote } : {}) }),
      });
      if (response.status === 401 || response.status === 403) throw new Error("لا تملك صلاحية تحديث تذكرة الدعم.");
      if (!response.ok) throw new Error("تعذر تحديث حالة التذكرة.");
      setSupportTickets((current) => current.map((ticket) =>
        ticket.ticketId === ticketId
          ? { ...ticket, status, ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}) }
          : ticket
      ));
      setMessage(adminNote !== undefined
        ? "تم حفظ رد الإدارة وسيظهر لصاحب الشكوى في سجل طلباته."
        : "تم تحديث حالة التذكرة وتسجيل الإجراء في سجل الإدارة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث التذكرة.");
    } finally {
      setSupportBusyId(null);
    }
  }

  useEffect(() => {
    if (active === "support") void loadSupportTickets();
  }, [active, loadSupportTickets]);

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
    if (active === "trips") void loadTrips();
  }, [active, loadTrips]);

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
    const numericValues = {
      baseFare: Number(pricingForm.baseFare),
      perKm: Number(pricingForm.perKm),
      minimumFare: Number(pricingForm.minimumFare),
      maximumDistanceKm: Number(pricingForm.maximumDistanceKm),
      roundingIncrement: Number(pricingForm.roundingIncrement),
    };
    const coordinates = {
      minLat: Number(pricingForm.minLat),
      maxLat: Number(pricingForm.maxLat),
      minLng: Number(pricingForm.minLng),
      maxLng: Number(pricingForm.maxLng),
    };
    if (Object.values(numericValues).some((value) => !Number.isFinite(value) || value < 0) ||
        numericValues.maximumDistanceKm <= 0 || numericValues.roundingIncrement <= 0 ||
        numericValues.baseFare > 100000 || numericValues.perKm > 10000 ||
        numericValues.minimumFare > 100000 || numericValues.maximumDistanceKm > 500 ||
        numericValues.roundingIncrement > 1000) {
      setMessage("راجع قيم التعريفة: يجب إدخال أرقام صحيحة ضمن الحدود المسموح بها، والمسافة وخطوة التقريب أكبر من صفر.");
      return;
    }
    if (Object.values(coordinates).some((value) => !Number.isFinite(value)) ||
        coordinates.minLat < -90 || coordinates.maxLat > 90 ||
        coordinates.minLng < -180 || coordinates.maxLng > 180 ||
        coordinates.minLat >= coordinates.maxLat || coordinates.minLng >= coordinates.maxLng) {
      setMessage("إحداثيات نطاق الخدمة غير صحيحة. تأكد من حدود خطوط العرض والطول ومن أن الحد الأدنى أقل من الحد الأعلى.");
      return;
    }
    setConfigSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/config/pricing", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: pricingForm.enabled,
          ...numericValues,
          serviceArea: coordinates,
        }),
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
    const radiusValues = dispatchForm.stageRadiiKm.split(",").map((value) => value.trim());
    const radii = radiusValues.map(Number);
    const ttl = Number(dispatchForm.offerTtlSeconds);
    const maxOffers = Number(dispatchForm.maxOffersPerStage);
    if (radiusValues.length < 1 || radiusValues.length > 6 ||
        radiusValues.some((value) => value === "") ||
        radii.some((value) => !Number.isFinite(value) || value <= 0 || value > 100) ||
        radii.some((value, index) => index > 0 && value <= radii[index - 1])) {
      setMessage("أدخل من مرحلة إلى 6 مراحل، بأنصاف أقطار موجبة لا تتجاوز 100 كم وبترتيب تصاعدي، وافصل بينها بفواصل.");
      return;
    }
    if (!Number.isInteger(ttl) || ttl < 15 || ttl > 300 ||
        !Number.isInteger(maxOffers) || maxOffers < 1 || maxOffers > 30) {
      setMessage("مدة العرض يجب أن تكون من 15 إلى 300 ثانية، وعدد العروض من 1 إلى 30.");
      return;
    }
    setConfigSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/config/dispatch", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageRadiiKm: radii,
          offerTtlSeconds: ttl,
          maxOffersPerStage: maxOffers,
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
      {[{label:"طلبات السائقين المعلقة",value:overviewLoading ? "…" : overviewMetrics ? String(overviewMetrics.pendingDrivers) : "—",icon:CarFront},{label:"الرحلات النشطة المعروضة",value:overviewLoading ? "…" : overviewMetrics ? String(overviewMetrics.activeTrips) : "—",icon:Activity},{label:"مراجعة الصلاحيات",value:"خادمية",icon:BadgeCheck},{label:"مصدر المؤشرات",value:"Firestore",icon:Users}].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-panel p-5"><Icon className="mb-5 text-gold" size={21}/><p className="text-xs text-muted">{label}</p><b className="mt-2 block text-2xl">{value}</b><span className="mt-1 block text-[10px] text-muted">{overviewLoading ? "جارٍ جلب البيانات…" : "آخر قراءة مباشرة من واجهات الإدارة"}</span></div>)}
    </div>
    {active === "overview" && <p className="mt-3 text-[11px] leading-6 text-muted">الأعداد المعروضة مأخوذة من نتائج الإدارة الحالية، وكل واجهة تعرض بحد أقصى 50 سجلاً؛ لذلك قد لا تمثل إجمالي جميع الطلبات أو الرحلات.</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="أقسام الإدارة" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-panel p-3 lg:flex-col">
        {sections.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>setActive(id)} aria-current={active===id ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition lg:w-full ${active===id ? "bg-gold text-night font-bold" : "text-muted hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</button>)}
      </nav>
      <section className="min-h-[360px] rounded-3xl border border-white/10 bg-panel p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-gold">CONTROL CENTER</p><h2 className="mt-1 text-xl font-bold">{current.title}</h2></div>
          {active === "overview" && <button type="button" disabled={overviewLoading} onClick={() => setOverviewRefresh((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-muted hover:border-gold/40 disabled:opacity-50"><RefreshCw size={15} className={overviewLoading ? "animate-spin" : ""}/> تحديث المؤشرات</button>}
          {(active === "drivers" || active === "trips" || active === "support") && <button type="button" disabled={active === "drivers" ? loading : active === "trips" ? tripsLoading : supportLoading} onClick={() => void (active === "drivers" ? loadApplications() : active === "trips" ? loadTrips() : loadSupportTickets())} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-muted hover:border-gold/40 disabled:opacity-50"><RefreshCw size={15} className={(active === "drivers" ? loading : active === "trips" ? tripsLoading : supportLoading) ? "animate-spin" : ""}/> تحديث القائمة</button>}
          {active === "support" && <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-[11px] text-amber-200">قيد الاستكمال</span>}
        </div>
        {active === "overview" && <div className="mt-6 grid gap-4 sm:grid-cols-2">{overviewError && <p role="alert" className="sm:col-span-2 rounded-xl border border-rose-300/20 bg-rose-400/5 p-3 text-xs leading-6 text-rose-200">{overviewError}</p>}<div className="rounded-2xl bg-night p-5"><h3 className="font-bold">حالة المنصة</h3><p className="mt-3 text-sm leading-7 text-muted">تم ربط بعض خدمات العميل والسائق والإدارة بخدمات خادمية. لا تُعرض أرقام تشغيل غير متحققة.</p></div><div className="rounded-2xl bg-night p-5"><h3 className="font-bold">الأولويات</h3><ul className="mt-3 space-y-2 text-sm text-muted"><li>• اعتماد السائقين ومراجعة الطلبات</li><li>• ضبط التعريفة ونطاق الخدمة</li><li>• تشغيل مجدول التوزيع الموثوق</li><li>• استكمال متابعة الرحلات والتقارير</li></ul></div></div>}
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
        {active === "trips" && <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night p-3">
            <label className="flex flex-1 flex-wrap items-center gap-3 text-xs text-muted">تصفية حسب الحالة
              <select value={tripStatusFilter} onChange={(event) => setTripStatusFilter(event.target.value)} disabled={tripsLoading} className="min-w-48 rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50 disabled:opacity-60">
                <option value="active">الرحلات النشطة</option>
                <option value="all">كل الحالات</option>
                <option value="pending">رحلات جديدة</option>
                <option value="searching">جارٍ البحث عن سائق</option>
                <option value="accepted">تم قبولها</option>
                <option value="driver_arrived">السائق وصل</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">رحلات مكتملة</option>
                <option value="cancelled">رحلات ملغاة</option>
                <option value="no_driver">لم يتوفر لها سائق</option>
              </select>
            </label>
            <span className="text-[11px] text-muted">{tripsLoading ? "جارٍ التحديث…" : `${trips.length} رحلة معروضة`}</span>
          </div>
          {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
          {tripsLoading && <div className="py-12 text-center text-sm text-muted">جارٍ تحميل الرحلات…</div>}
          {!tripsLoading && trips.length === 0 && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><Activity className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">{tripStatusFilter === "active" ? "لا توجد رحلات نشطة حالياً" : "لا توجد رحلات بهذه الحالة ضمن السجلات المعروضة"}</b><p className="mt-2 text-xs text-muted">يمكنك تغيير فلتر الحالة أو تحديث القائمة. النتائج تقتصر على أحدث 100 سجل وبحد أقصى 50 نتيجة.</p></div></div>}
          {trips.map((trip) => <article key={trip.tripId} className="rounded-2xl border border-white/10 bg-night p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-bold">{trip.pickupLabel || "نقطة انطلاق غير متاحة"} <span className="text-gold">←</span> {trip.destinationLabel || "وجهة غير متاحة"}</h3><p className="mt-2 text-[10px] text-muted" dir="ltr">{trip.tripId}</p></div>
              <span className={`rounded-full border px-3 py-1.5 text-[11px] ${tripStatusMeta[trip.status]?.className || "border-white/10 bg-white/5 text-muted"}`}>{tripStatusMeta[trip.status]?.label || trip.status}</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div><span className="block text-[11px] text-muted">الأجرة التقديرية</span><b>{trip.fareEstimate ?? "—"} ج.م</b></div>
              <div><span className="block text-[11px] text-muted">المسافة</span><b>{trip.distanceKm ?? "—"} كم</b></div>
              <div><span className="block text-[11px] text-muted">فئة المركبة</span><b>{trip.vehicleCategory || "—"}</b></div>
              <div><span className="block text-[11px] text-muted">الدفع</span><b>{trip.paymentMethod === "cash" ? "نقداً" : trip.paymentMethod === "wallet" ? "محفظة" : "—"}</b></div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-muted">
              <p>السائق: {trip.driverUid ? <span dir="ltr">{trip.driverUid}</span> : "لم يتم التعيين بعد"}</p>
              <p className="mt-1">موقع السائق: {trip.driverLocation ? <><span className="text-emerald-300">موقع حديث</span><span dir="ltr"> · {trip.driverLocation.lat.toFixed(5)}, {trip.driverLocation.lng.toFixed(5)} · {new Date(trip.driverLocation.updatedAt).toLocaleTimeString("ar-EG")}</span><a className="mr-2 text-gold underline underline-offset-4" href={`https://www.google.com/maps?q=${trip.driverLocation.lat},${trip.driverLocation.lng}`} target="_blank" rel="noreferrer">فتح على الخريطة</a></> : <span className="text-muted">لا يوجد موقع حديث متاح</span>}</p>
              <p className="mt-1">تُعرض إحداثيات GPS إذا كان آخر تحديث خلال 120 ثانية فقط.</p>
              <p className="mt-1">وقت الطلب: {trip.createdAt ? new Date(trip.createdAt).toLocaleString("ar-EG") : "غير متاح"}</p>
              <p className="mt-1">آخر تحديث للحالة: {trip.updatedAt ? new Date(trip.updatedAt).toLocaleString("ar-EG") : "غير متاح"}</p>
            </div>
          </article>)}
        </div>}
        {active === "pricing" && <div className="mt-5 space-y-5">
          {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
          {configLoading && <p className="py-8 text-center text-sm text-muted">جارٍ تحميل الإعدادات…</p>}
          {!configLoading && <div className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={savePricing} className="space-y-4 rounded-2xl border border-white/10 bg-night p-5">
              <div><h3 className="font-bold">تعريفة الرحلات ونطاق الخدمة</h3><p className="mt-1 text-xs text-muted">كل القيم تحفظ خادمياً ولا يحدد العميل السعر.</p></div>
              <label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>تفعيل التعريفة</span><input type="checkbox" disabled={configSaving} checked={pricingForm.enabled} onChange={e=>setPricingForm(v=>({...v,enabled:e.target.checked}))}/></label>
              <div className="grid grid-cols-2 gap-3">
                {([{key:"baseFare",label:"فتح العداد",max:100000},{key:"perKm",label:"السعر لكل كم",max:10000},{key:"minimumFare",label:"الحد الأدنى",max:100000},{key:"maximumDistanceKm",label:"أقصى مسافة كم",max:500},{key:"roundingIncrement",label:"خطوة التقريب",max:1000}] as const).map(field=><label key={field.key} className="text-xs text-muted">{field.label}<input required type="number" min="0" max={field.max} step="0.01" disabled={configSaving} value={pricingForm[field.key]} onChange={e=>setPricingForm(v=>({...v,[field.key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50 disabled:cursor-not-allowed disabled:opacity-60"/></label>)}
              </div>
              <div><p className="mb-2 text-xs font-bold">حدود نطاق الخدمة – إحداثيات</p><div className="grid grid-cols-2 gap-3">
                {([{key:"minLat",label:"أقل خط عرض",min:-90,max:90},{key:"maxLat",label:"أعلى خط عرض",min:-90,max:90},{key:"minLng",label:"أقل خط طول",min:-180,max:180},{key:"maxLng",label:"أعلى خط طول",min:-180,max:180}] as const).map(field=><label key={field.key} className="text-xs text-muted">{field.label}<input required type="number" min={field.min} max={field.max} step="0.000001" disabled={configSaving} value={pricingForm[field.key]} onChange={e=>setPricingForm(v=>({...v,[field.key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50 disabled:cursor-not-allowed disabled:opacity-60"/></label>)}
              </div></div>
              <button disabled={configSaving} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-bold text-night disabled:opacity-50">{configSaving ? "جارٍ الحفظ…" : "حفظ التعريفة والنطاق"}</button>
            </form>
            <form onSubmit={saveDispatch} className="space-y-4 rounded-2xl border border-white/10 bg-night p-5">
              <div><h3 className="font-bold">مراحل توزيع السائقين</h3><p className="mt-1 text-xs text-muted">المسافات بالكيلومتر، ويجب أن تكون تصاعدية.</p></div>
              <label className="block text-xs text-muted">أنصاف أقطار المراحل – مثال: 2, 5, 10<input required disabled={configSaving} value={dispatchForm.stageRadiiKm} onChange={e=>setDispatchForm(v=>({...v,stageRadiiKm:e.target.value}))} placeholder="2, 5, 10" className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <label className="block text-xs text-muted">مدة العرض بالثواني (15–300)<input required disabled={configSaving} type="number" min="15" max="300" value={dispatchForm.offerTtlSeconds} onChange={e=>setDispatchForm(v=>({...v,offerTtlSeconds:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <label className="block text-xs text-muted">أقصى عدد عروض لكل مرحلة (1–30)<input required disabled={configSaving} type="number" min="1" max="30" value={dispatchForm.maxOffersPerStage} onChange={e=>setDispatchForm(v=>({...v,maxOffersPerStage:e.target.value}))} className="mt-2 w-full rounded-lg border border-white/10 bg-panel px-3 py-3 text-sm text-white outline-none focus:border-gold/50"/></label>
              <button disabled={configSaving} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-bold text-night disabled:opacity-50">{configSaving ? "جارٍ الحفظ…" : "حفظ إعدادات التوزيع"}</button>
              <p className="text-[11px] leading-6 text-muted">الحفظ يجهز إعدادات العامل فقط. يلزم ضبط APP_BASE_URL وDISPATCH_WORKER_SECRET وتشغيل مجدول موثوق خارج التطبيق.</p>
            </form>
          </div>}
        </div>}
        {active === "support" && <div className="mt-5 space-y-4">
          {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-xs leading-6 text-muted">{message}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{supportLoading ? "جارٍ تحميل التذاكر…" : `${supportTickets.length} تذكرة معروضة`}</span><span>أحدث 100 تذكرة</span></div>
          {!supportLoading && supportTickets.length === 0 && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><CircleHelp className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">لا توجد تذاكر دعم حتى الآن</b><p className="mt-2 text-xs text-muted">ستظهر طلبات العملاء والسائقين هنا بعد إرسالها من واجهاتهم.</p></div></div>}
          {supportTickets.map((ticket) => <article key={ticket.ticketId} className="rounded-2xl border border-white/10 bg-night p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{ticket.subject}</h3><p className="mt-1 text-[10px] text-muted" dir="ltr">{ticket.ticketId}</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px]">{ticket.status === "open" ? "مفتوحة" : ticket.status === "in_progress" ? "قيد المعالجة" : ticket.status === "resolved" ? "تم الحل" : "مغلقة"}</span></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{ticket.description}</p>
            <div className="mt-3 grid gap-2 text-[11px] text-muted sm:grid-cols-3"><span>صاحب الطلب: {ticket.userRole === "driver" ? "سائق" : ticket.userRole === "customer" ? "عميل" : "غير محدد"} · <span dir="ltr">{ticket.uid ?? "—"}</span></span><span>التصنيف: {({trip:"رحلة",payment:"مدفوعات",driver:"سائق",account:"حساب",app:"التطبيق",other:"أخرى"} as Record<string,string>)[ticket.category] ?? "أخرى"}</span><span>تاريخ الإرسال: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("ar-EG") : "غير متاح"}</span></div>
            {ticket.tripId && <p className="mt-2 text-[11px] text-muted">رقم الرحلة: <span dir="ltr">{ticket.tripId}</span></p>}
            <div className="mt-4 space-y-2">
              <label className="block text-xs text-muted" htmlFor={`support-note-${ticket.ticketId}`}>رد الإدارة الظاهر لصاحب الشكوى</label>
              <textarea id={`support-note-${ticket.ticketId}`} rows={3} maxLength={1000} disabled={supportBusyId !== null}
                value={supportNoteDrafts[ticket.ticketId] ?? ticket.adminNote ?? ""}
                onChange={(event) => setSupportNoteDrafts((current) => ({ ...current, [ticket.ticketId]: event.target.value }))}
                placeholder="اكتب توضيحاً أو رداً لصاحب الطلب…"
                className="w-full resize-y rounded-xl border border-white/10 bg-panel px-3 py-3 text-sm leading-6 text-white outline-none focus:border-gold/50 disabled:opacity-50" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-muted">حتى 1000 حرف</span>
                <button type="button" disabled={supportBusyId !== null}
                  onClick={() => void updateSupportTicket(ticket.ticketId, ticket.status, supportNoteDrafts[ticket.ticketId] ?? ticket.adminNote ?? "")}
                  className="rounded-lg border border-gold/30 px-3 py-2 text-xs font-bold text-gold hover:bg-gold/10 disabled:opacity-50">حفظ رد الإدارة</button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3"><label className="text-xs text-muted" htmlFor={`support-${ticket.ticketId}`}>تحديث الحالة</label><select id={`support-${ticket.ticketId}`} value={ticket.status} disabled={supportBusyId !== null} onChange={(event) => void updateSupportTicket(ticket.ticketId, event.target.value as SupportTicket["status"])} className="rounded-lg border border-white/10 bg-panel px-3 py-2 text-xs text-white disabled:opacity-50"><option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option><option value="resolved">تم الحل</option><option value="closed">مغلقة</option></select>{supportBusyId === ticket.ticketId && <span className="text-[11px] text-gold">جارٍ الحفظ…</span>}</div>
          </article>)}
        </div>}
      </section>
    </div>
  </div>;
}
