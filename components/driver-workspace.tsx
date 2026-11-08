"use client";

import { useState } from "react";
import { BadgeCheck, CarFront, CircleDollarSign, ClipboardList, Power, ShieldCheck, WalletCards } from "lucide-react";

export function DriverWorkspace() {
  const [available, setAvailable] = useState(false);
  const [section, setSection] = useState("offers");
  return <div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"حالة الاتصال",value:available ? "متاح – معاينة محلية" : "غير متصل",icon:Power},{label:"الرحلات اليوم",value:"—",icon:ClipboardList},{label:"المستحقات",value:"— ج.م",icon:CircleDollarSign},{label:"اعتماد الحساب",value:"بانتظار التحقق",icon:BadgeCheck}].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-panel p-5"><Icon className="mb-5 text-gold" size={21}/><p className="text-xs text-muted">{label}</p><b className="mt-2 block text-lg">{value}</b></div>)}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-3xl border border-white/10 bg-panel p-6">
        <div className="mb-4 flex items-center justify-between"><CarFront className="text-gold" size={28}/><span className="rounded-full bg-amber-300/10 px-3 py-1 text-[11px] text-amber-200">حساب تجريبي</span></div>
        <h2 className="text-xl font-bold">حالة استقبال الرحلات</h2>
        <p className="mt-3 text-sm leading-7 text-muted">يمكنك تجربة مفتاح التوفر داخل هذه الصفحة فقط. لن يتم بث موقعك أو استقبال رحلات حقيقية قبل ربط حساب سائق معتمد بالخادم.</p>
        <button type="button" aria-pressed={available} onClick={()=>setAvailable(!available)} className={`mt-6 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-4 text-sm font-bold transition ${available ? "bg-emerald-400/15 text-emerald-300 border border-emerald-300/30" : "bg-white/10 text-white hover:bg-white/15"}`}><Power size={18}/>{available ? "إيقاف المعاينة" : "تجربة حالة متاح"}</button>
        <p className="mt-3 text-center text-[11px] text-muted">الحالة الحالية محفوظة في الواجهة فقط ولا تتغير في قاعدة البيانات.</p>
      </section>
      <section className="rounded-3xl border border-white/10 bg-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">مساحة العمل</h2><div className="flex gap-2">{[{id:"offers",label:"العروض"},{id:"active",label:"الرحلة الحالية"},{id:"history",label:"السجل"}].map(item=><button key={item.id} type="button" onClick={()=>setSection(item.id)} className={`rounded-lg px-3 py-2 text-xs ${section===item.id ? "bg-gold text-night font-bold" : "bg-white/5 text-muted"}`}>{item.label}</button>)}</div></div>
        <div className="mt-5 grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center">
          <div>{section==="offers" ? <ClipboardList className="mx-auto mb-3 text-gold" size={28}/> : section==="active" ? <CarFront className="mx-auto mb-3 text-gold" size={28}/> : <WalletCards className="mx-auto mb-3 text-gold" size={28}/>}<b className="block text-sm">{section==="offers" ? "لا توجد عروض رحلات" : section==="active" ? "لا توجد رحلة نشطة" : "سجل الرحلات غير متاح بعد"}</b><p className="mt-2 text-xs leading-6 text-muted">سيتم عرض بياناتك الفعلية بعد تفعيل تسجيل الدخول واعتماد السائق وربط نظام الإسناد.</p></div>
        </div>
      </section>
    </div>
    <section className="mt-5 rounded-3xl border border-white/10 bg-panel p-6"><div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-gold"/><h2 className="font-bold">متطلبات تفعيل حساب السائق</h2></div><div className="grid gap-3 sm:grid-cols-3">{["بيانات السائق والتحقق من الهوية","بيانات المركبة والترخيص","موافقة الإدارة وتفعيل الحساب"].map((item,i)=><div key={item} className="flex items-start gap-3 rounded-xl bg-night p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold/10 text-xs text-gold">{i+1}</span><p className="text-xs leading-6 text-muted">{item}</p></div>)}</div></section>
  </div>;
}
