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
        {active !== "overview" && active !== "drivers" && <div className="mt-6 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><current.icon className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">قسم {current.label}</b><p className="mt-2 max-w-md text-xs leading-6 text-muted">سيتم تفعيل أدوات هذا القسم بعد إضافة API والتحقق من صلاحية المدير على الخادم.</p></div></div>}
      </section>
    </div>
  </div>;
}
