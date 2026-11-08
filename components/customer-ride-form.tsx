"use client";

import { useState } from "react";
import { CarFront, CheckCircle2, CircleDollarSign, Clock3, LocateFixed, MapPin, Navigation, WalletCards } from "lucide-react";

const vehicleOptions = [
  { id: "economy", name: "اقتصادي", detail: "للمشاوير اليومية", seats: "حتى 4 ركاب", icon: CarFront },
  { id: "family", name: "عائلي", detail: "مساحة أوسع للعائلة", seats: "حسب المركبة", icon: CarFront },
  { id: "private", name: "خصوصي", detail: "رحلة خاصة ومريحة", seats: "حسب المركبة", icon: CarFront }
] as const;

export function CustomerRideForm() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState("economy");
  const [payment, setPayment] = useState("cash");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [preview, setPreview] = useState(false);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("المتصفح لا يدعم تحديد الموقع. اكتب نقطة الانطلاق يدوياً.");
      return;
    }
    setLocating(true);
    setLocationMessage("بانتظار إذن تحديد الموقع من المتصفح…");
    navigator.geolocation.getCurrentPosition(
      () => {
        setPickup("موقعي الحالي");
        setLocationMessage("تم تحديد موقع الانطلاق على هذا الجهاز. لم يتم إرسال إحداثياتك لأي خادم.");
        setLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "لم تسمح بالوصول للموقع. يمكنك كتابة نقطة الانطلاق يدوياً."
          : "تعذر تحديد الموقع حالياً. تحقق من إعدادات الموقع وحاول مرة أخرى.";
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function showPreview() {
    if (!pickup.trim() || !destination.trim()) {
      setPreview(false);
      setLocationMessage("أدخل نقطة الانطلاق والوجهة أولاً.");
      return;
    }
    setPreview(true);
    setLocationMessage("");
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
              <input id="pickup" value={pickup} onChange={(event) => { setPickup(event.target.value); setPreview(false); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="اكتب مكانك أو استخدم موقعي الحالي"/>
              <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gold/25 px-3 py-2 text-xs text-gold transition hover:bg-gold/10 disabled:opacity-50"><LocateFixed size={15}/>{locating ? "جارٍ التحديد" : "موقعي"}</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-night p-4">
            <label htmlFor="destination" className="mb-2 block text-xs text-muted">الوجهة</label>
            <div className="flex items-center gap-3"><MapPin className="shrink-0 text-gold" size={18}/><input id="destination" value={destination} onChange={(event) => { setDestination(event.target.value); setPreview(false); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="مثال: جامعة سيناء، المساعيد، الكورنيش"/></div>
          </div>
          {locationMessage && <p aria-live="polite" className="rounded-xl bg-white/5 px-4 py-3 text-xs leading-6 text-muted">{locationMessage}</p>}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">اختر فئة السيارة</h3><span className="text-xs text-muted">نوع المركبة</span></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {vehicleOptions.map(({id,name,detail,seats,icon:Icon}) => <button key={id} type="button" onClick={() => {setVehicle(id);setPreview(false);}} aria-pressed={vehicle===id} className={`rounded-2xl border p-4 text-right transition ${vehicle===id ? "border-gold/60 bg-gold/10 shadow-glow" : "border-white/10 bg-night hover:border-white/25"}`}><Icon className={vehicle===id ? "mb-4 text-gold" : "mb-4 text-muted"} size={23}/><b className="block text-sm">{name}</b><span className="mt-1 block text-[11px] text-muted">{detail}</span><span className="mt-3 block text-[10px] text-muted">{seats}</span></button>)}
          </div>
        </div>

        <div className="mt-7">
          <h3 className="mb-3 font-bold">وسيلة الدفع</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => {setPayment("cash");setPreview(false);}} aria-pressed={payment==="cash"} className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${payment==="cash" ? "border-gold/60 bg-gold/10 text-gold" : "border-white/10 bg-night text-muted"}`}><CircleDollarSign size={20}/> نقداً</button>
            <button type="button" onClick={() => {setPayment("wallet");setPreview(false);}} aria-pressed={payment==="wallet"} className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${payment==="wallet" ? "border-gold/60 bg-gold/10 text-gold" : "border-white/10 bg-night text-muted"}`}><WalletCards size={20}/> محفظة إلكترونية</button>
          </div>
        </div>

        <button type="button" onClick={showPreview} className="mt-7 w-full rounded-xl bg-gold px-5 py-4 font-bold text-night transition hover:bg-[#e8c77e]">معاينة تفاصيل الرحلة</button>
        {preview && <div role="status" className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-300"><CheckCircle2 size={18}/><b className="text-sm">تم تجهيز المعاينة محلياً</b></div>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="block text-xs text-muted">من</span><b>{pickup}</b></div><div><span className="block text-xs text-muted">إلى</span><b>{destination}</b></div><div><span className="block text-xs text-muted">السيارة</span><b>{selectedVehicle?.name}</b></div><div><span className="block text-xs text-muted">الدفع</span><b>{payment==="cash" ? "نقداً" : "محفظة إلكترونية"}</b></div></div>
          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-6 text-muted">هذه معاينة على جهازك فقط. لم يتم إنشاء رحلة أو إرسال موقعك أو التواصل مع أي سائق. تفعيل الحجز يتطلب تسجيل الدخول وخدمة تسعير وإسناد آمنة.</p>
        </div>}
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-panel p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">مسار الرحلة</h3><Navigation className="text-gold" size={20}/></div>
          <div className="relative grid h-56 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#101923] text-center">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:"linear-gradient(35deg,transparent 48%,#718096 49%,#718096 50%,transparent 51%),linear-gradient(125deg,transparent 48%,#718096 49%,#718096 50%,transparent 51%)",backgroundSize:"76px 68px"}}/>
            <div className="relative px-5"><MapPin className="mx-auto mb-3 text-gold" size={28}/><b className="block text-sm">الخريطة الحية قيد التكامل</b><p className="mt-2 text-xs leading-6 text-muted">سيتم توصيل خرائط Google بعد إعداد المفاتيح المقيدة والتحقق من إعدادات المشروع.</p></div>
            <span className="absolute bottom-3 right-3 rounded-lg bg-night/80 px-3 py-1.5 text-[10px] text-muted">معاينة مكانية فقط</span>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-panel p-6"><Clock3 className="mb-4 text-gold" size={22}/><h3 className="font-bold">رحلاتك الأخيرة</h3><p className="mt-2 text-sm leading-6 text-muted">ستظهر رحلاتك هنا بعد تفعيل حساب العميل والاتصال الآمن بقاعدة البيانات.</p></div>
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5"><b className="text-sm text-gold">خصوصيتك أولاً</b><p className="mt-2 text-xs leading-6 text-muted">لا نطلب موقعك إلا عند ضغط زر «موقعي»، ويظل استخدام الموقع اختيارياً ويمكنك كتابة العنوان يدوياً.</p></div>
      </aside>
    </div>
  );
}
