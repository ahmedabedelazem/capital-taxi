import Link from "next/link";
import {
  ArrowLeft, ArrowUpLeft, CarFront, Check, Clock3, MapPin,
  ShieldCheck, Smartphone, Users, Navigation,
} from "lucide-react";

const portals = [
  {
    href: "/login?next=/customer",
    title: "اطلب رحلة",
    description: "حدد مكانك ووجهتك، واختر السيارة المناسبة لمشوارك.",
    icon: Navigation,
    tag: "للركاب",
  },
  {
    href: "/login?next=/driver/apply",
    title: "كن كابتن معنا",
    description: "قدّم طلب الانضمام وتابع حالة اعتماد حسابك.",
    icon: CarFront,
    tag: "للسائقين",
  },
  {
    href: "/login?next=/admin",
    title: "إدارة التشغيل",
    description: "تابع الرحلات وطلبات السائقين وإعدادات الخدمة.",
    icon: ShieldCheck,
    tag: "للإدارة",
  },
];

const steps = [
  { number: "01", title: "حدد وجهتك", description: "اكتب مكان الانطلاق والوجهة على الخريطة." },
  { number: "02", title: "راجع تفاصيل الرحلة", description: "اختر فئة السيارة وراجع تقدير السعر قبل التأكيد." },
  { number: "03", title: "تابع مشوارك", description: "تابع حالة الطلب وبيانات السائق بعد قبول الرحلة." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f6f6] text-[#111]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <nav className="shell flex h-[76px] items-center justify-between gap-4" aria-label="التنقل الرئيسي">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-black text-sm font-black text-white">CT</span>
            <span>
              <b className="block text-base font-extrabold leading-tight">تاكسي العاصمة</b>
              <span className="text-[9px] font-semibold tracking-[.24em] text-neutral-500">CAPITAL TAXI</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-neutral-700 md:flex">
            <a href="#how-it-works" className="transition hover:text-black">كيف تعمل الخدمة</a>
            <a href="#portals" className="transition hover:text-black">بوابات الاستخدام</a>
            <span className="text-neutral-400">العريش · شمال سيناء</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-neutral-100 sm:inline-flex">تسجيل الدخول</Link>
            <Link href="/login?next=/customer" className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800">اطلب رحلة</Link>
          </div>
        </nav>
      </header>

      <section className="shell grid min-h-[650px] items-center gap-12 py-14 lg:grid-cols-[1fr_.95fr] lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-neutral-700">
            <span className="h-2 w-2 rounded-full bg-black" />
            تنقّل أسهل في العريش وشمال سيناء
          </div>
          <h1 className="text-5xl font-black leading-[1.2] tracking-tight sm:text-6xl lg:text-[76px]">
            مشوارك.
            <br />
            <span className="text-neutral-500">على طريقتك.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-neutral-600 md:text-lg">
            اطلب رحلتك مع تاكسي العاصمة بخطوات واضحة، وتابع حالة مشوارك من طلب السيارة حتى الوصول.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-black px-7 py-4 text-sm font-bold text-white transition hover:bg-neutral-800">
              ابدأ طلب رحلتك <ArrowLeft size={18} />
            </Link>
            <a href="#how-it-works" className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-bold transition hover:bg-neutral-100">
              اعرف كيف تعمل <ArrowUpLeft size={17} />
            </a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-black/10 pt-7 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-2"><Check size={17} className="text-black" /> واجهة عربية</span>
            <span className="inline-flex items-center gap-2"><Smartphone size={17} className="text-black" /> تعمل على الهاتف</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-black" /> حسابات بصلاحيات</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[570px]">
          <div className="overflow-hidden rounded-[28px] bg-[#e7e7e7] p-3 shadow-[0_24px_80px_rgba(0,0,0,.12)] sm:p-4">
            <div className="relative min-h-[390px] overflow-hidden rounded-[20px] bg-[#dededb]">
              <div className="absolute inset-0 opacity-80" aria-hidden="true"
                style={{ backgroundImage: "linear-gradient(28deg,transparent 47%,#fff 48%,#fff 51%,transparent 52%),linear-gradient(112deg,transparent 43%,#fff 44%,#fff 47%,transparent 48%),linear-gradient(160deg,transparent 62%,#c7c7c4 63%,#c7c7c4 65%,transparent 66%)", backgroundSize: "190px 150px,220px 180px,280px 210px" }} />
              <div className="absolute -left-12 top-24 h-32 w-[130%] rotate-[-18deg] border-y-[18px] border-white/90" />
              <div className="absolute left-[18%] top-[20%] h-3 w-3 rounded-full bg-black ring-8 ring-black/10" />
              <div className="absolute right-[20%] bottom-[24%] h-3 w-3 rounded-full bg-black ring-8 ring-black/10" />
              <svg viewBox="0 0 520 390" className="absolute inset-0 h-full w-full" role="img" aria-label="رسم توضيحي لمسار رحلة">
                <path d="M104 92 C170 110 166 204 260 194 S350 246 414 292" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
                <path d="M104 92 C170 110 166 204 260 194 S350 246 414 292" fill="none" stroke="#111" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
              </svg>
              <div className="absolute right-5 top-5 rounded-xl bg-white px-4 py-3 shadow-lg">
                <small className="block text-[10px] text-neutral-500">نقطة الانطلاق</small>
                <b className="mt-1 block text-sm">موقعك الحالي</b>
              </div>
              <div className="absolute bottom-5 left-5 rounded-xl bg-white px-4 py-3 shadow-lg">
                <small className="block text-[10px] text-neutral-500">الوجهة</small>
                <b className="mt-1 block text-sm">اختار مكانك</b>
              </div>
              <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-black text-white shadow-xl">
                <CarFront size={29} />
              </div>
              <span className="absolute bottom-5 right-5 rounded-full bg-black/80 px-3 py-2 text-[10px] font-semibold text-white">تصوّر توضيحي لمسار الرحلة</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-4">
              <div><b className="block text-sm">تاكسي العاصمة</b><span className="text-xs text-neutral-500">رحلات داخل العريش وخارجها</span></div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><MapPin size={18} /></span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[.2em] text-neutral-500">ببساطة</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">ثلاث خطوات. ومشوارك يبدأ.</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="border-t-2 border-black pt-5">
                <span className="text-xs font-bold tracking-widest text-neutral-400">{step.number}</span>
                <h3 className="mt-7 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-neutral-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="portals" className="shell py-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-neutral-500">منصة واحدة</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">كل شخص له تجربته.</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-neutral-600">اختر البوابة المناسبة. تظهر الوظائف وفق نوع الحساب والصلاحيات المعتمدة.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {portals.map(({ href, title, description, icon: Icon, tag }) => (
            <Link key={href} href={href} className="group flex min-h-[250px] flex-col rounded-2xl border border-black/10 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-black hover:shadow-[0_18px_50px_rgba(0,0,0,.08)]">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-100 text-black transition group-hover:bg-black group-hover:text-white"><Icon size={23} /></span>
                <span className="text-xs font-semibold text-neutral-500">{tag}</span>
              </div>
              <h3 className="mt-9 text-xl font-extrabold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{description}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-bold">متابعة <ArrowLeft size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-black py-16 text-white">
        <div className="shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 text-neutral-400"><Users size={17} /><span className="text-xs font-semibold tracking-[.2em]">CAPITAL TAXI</span></div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">جاهز للمشوار؟</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-400">ابدأ من بوابة العميل واطلب رحلتك.</p>
          </div>
          <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-white px-7 py-4 text-sm font-bold text-black transition hover:bg-neutral-200">اطلب رحلتك الآن <ArrowLeft size={18} /></Link>
        </div>
      </section>

      <footer className="bg-black px-5 pb-8 text-white">
        <div className="shell flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-xs text-neutral-400 sm:flex-row">
          <span>© {new Date().getFullYear()} تاكسي العاصمة · CAPITAL TAXI</span>
          <span>العريش · شمال سيناء</span>
        </div>
      </footer>
    </main>
  );
}
