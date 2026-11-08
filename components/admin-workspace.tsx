"use client";

import { useState } from "react";
import { Activity, BadgeCheck, CarFront, ChartNoAxesCombined, CircleHelp, SlidersHorizontal, Users } from "lucide-react";

const sections = [
  { id: "overview", label: "نظرة عامة", icon: ChartNoAxesCombined, title: "مؤشرات التشغيل" },
  { id: "drivers", label: "السائقون", icon: CarFront, title: "إدارة السائقين" },
  { id: "trips", label: "الرحلات", icon: Activity, title: "متابعة الرحلات" },
  { id: "pricing", label: "التسعير", icon: SlidersHorizontal, title: "إعدادات التسعير" },
  { id: "support", label: "الدعم", icon: CircleHelp, title: "الدعم والشكاوى" }
] as const;

export function AdminWorkspace() {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("overview");
  const current = sections.find((section) => section.id === active)!;
  return <div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"إجمالي العملاء",icon:Users},{label:"السائقون المعتمدون",icon:BadgeCheck},{label:"الرحلات النشطة",icon:Activity},{label:"السائقون المتاحون",icon:CarFront}].map(({label,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-panel p-5"><Icon className="mb-5 text-gold" size={21}/><p className="text-xs text-muted">{label}</p><b className="mt-2 block text-2xl">—</b><span className="mt-1 block text-[10px] text-muted">بانتظار ربط بيانات الإنتاج</span></div>)}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="أقسام الإدارة" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-panel p-3 lg:flex-col">
        {sections.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>setActive(id)} aria-current={active===id ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition lg:w-full ${active===id ? "bg-gold text-night font-bold" : "text-muted hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</button>)}
      </nav>
      <section className="min-h-[360px] rounded-3xl border border-white/10 bg-panel p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-gold">CONTROL CENTER</p><h2 className="mt-1 text-xl font-bold">{current.title}</h2></div><span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-[11px] text-amber-200">غير متصل ببيانات الإنتاج</span></div>
        {active === "overview" ? <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-night p-5"><h3 className="font-bold">حالة المنصة</h3><p className="mt-3 text-sm leading-7 text-muted">تم إعداد واجهات العميل والسائق والإدارة. لا توجد بعد خدمات خادم موصولة أو قراءات من قواعد البيانات.</p></div><div className="rounded-2xl bg-night p-5"><h3 className="font-bold">أولويات ما قبل التشغيل</h3><ul className="mt-3 space-y-2 text-sm text-muted"><li>• مصادقة وصلاحيات خادمية</li><li>• ربط الخرائط ومزود المواقع</li><li>• واجهات API آمنة للرحلات</li><li>• سجلات تدقيق ومراقبة</li></ul></div></div> : <div className="mt-6 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><current.icon className="mx-auto mb-3 text-gold" size={30}/><b className="block text-sm">قسم {current.label}</b><p className="mt-2 max-w-md text-xs leading-6 text-muted">تم تجهيز موضع القسم والتنقل داخله. ستظهر أدوات الإدارة والسجلات بعد بناء API والتحقق من صلاحية المدير على الخادم.</p></div></div>}
      </section>
    </div>
  </div>;
}
