import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

const portals = [
  {
    href: "/login?next=/customer",
    title: "اطلب رحلتك",
    description: "حدد نقطة الانطلاق والوجهة، واختر فئة المركبة، وتابع حالة طلبك.",
    icon: MapPinned,
    tag: "للعملاء",
  },
  {
    href: "/login?next=/driver/apply",
    title: "انضم كسائق",
    description: "قدّم طلب الانضمام، وتابع الاعتماد، واستقبل العروض بعد تفعيل حسابك.",
    icon: CarFront,
    tag: "للسائقين",
  },
  {
    href: "/login?next=/admin",
    title: "لوحة الإدارة",
    description: "إدارة طلبات السائقين والرحلات والتسعير والدعم من مكان واحد.",
    icon: ShieldCheck,
    tag: "لإدارة التشغيل",
  },
];

const highlights = [
  { icon: MapPinned, title: "رحلتك على الخريطة", description: "تحديد مواقع الانطلاق والوجهة وعرض مسار القيادة عند توافر خدمات الخرائط." },
  { icon: Clock3, title: "متابعة حالة الطلب", description: "اعرف مراحل طلب الرحلة وتفاصيل السائق بعد إسناد الرحلة." },
  { icon: ShieldCheck, title: "حسابات بصلاحيات", description: "بوابات منفصلة للعميل والسائق والإدارة مع التحقق من الصلاحيات." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-white">
      <div className="grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-[520px] h-96 w-96 rounded-full bg-sky-500/10 blur-[130px]" />

      <nav className="shell relative z-10 flex h-20 items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-gold/10 font-black text-gold">CT</span>
          <span>
            <b className="block">تاكسي العاصمة</b>
            <span className="text-[10px] tracking-[.25em] text-gold">CAPITAL TAXI</span>
          </span>
        </Link>
        <span className="hidden rounded-full border border-white/10 px-4 py-2 text-xs text-muted sm:block">العريش · شمال سيناء</span>
        <div className="mr-auto flex items-center gap-2 sm:mr-0">
          <Link href="/login" className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white transition hover:border-gold/50">تسجيل الدخول</Link>
          <Link href="/login?next=/customer" className="rounded-full bg-gold px-5 py-2.5 text-xs font-bold text-night transition hover:bg-[#e5c47f]">اطلب رحلة</Link>
        </div>
      </nav>

      <section className="shell relative z-10 grid min-h-[610px] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-4 py-2 text-xs text-gold">
            <span className="h-2 w-2 rounded-full bg-gold" />
            منصة تنقّل رقمية لأهل العريش وشمال سيناء
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.3] md:text-7xl">
            مشوارك يبدأ
            <br />
            <span className="gold-text">من العاصمة</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-muted md:text-lg">
            تجربة واحدة تجمع العميل والسائق والإدارة؛ من تقديم طلب الرحلة وحتى متابعة حالتها، بواجهة عربية مصممة للهاتف والكمبيوتر.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login?next=/customer" className="inline-flex items-center gap-3 rounded-xl bg-gold px-6 py-4 font-bold text-night transition hover:bg-[#e5c47f]">
              ابدأ طلب رحلتك <ArrowLeft size={18} />
            </Link>
            <a href="#portals" className="rounded-xl border border-white/15 px-6 py-4 text-sm transition hover:border-gold/50">استكشف التطبيق</a>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div><b className="text-xl text-gold md:text-2xl">3</b><p className="mt-1 text-xs text-muted">بوابات مترابطة</p></div>
            <div><b className="text-xl text-gold md:text-2xl">RTL</b><p className="mt-1 text-xs text-muted">واجهة عربية</p></div>
            <div><b className="text-xl text-gold md:text-2xl">PWA</b><p className="mt-1 text-xs text-muted">قابل للتثبيت</p></div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-5 rounded-[36px] bg-gold/10 blur-3xl" />
          <div className="glass relative overflow-hidden rounded-[32px] p-5 shadow-glow md:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">CAPITAL TAXI · ARISH</p>
                <b className="mt-1 block text-lg">رحلتك في خطوات بسيطة</b>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">منصة ويب</span>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101c28] p-5">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(35deg,transparent 47%,#607080 48%,#607080 49%,transparent 50%),linear-gradient(120deg,transparent 47%,#607080 48%,#607080 49%,transparent 50%)", backgroundSize: "90px 80px" }} />
              <div className="relative flex min-h-[230px] flex-col justify-between">
                <div className="flex items-center gap-3 self-start rounded-xl border border-white/10 bg-night/85 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold"><MapPinned size={19} /></span>
                  <span><small className="block text-muted">نقطة الانطلاق</small><b className="text-sm">حدد موقعك</b></span>
                </div>
                <div className="absolute inset-x-10 top-1/2 border-t-2 border-dashed border-gold/70" />
                <div className="grid h-14 w-14 place-items-center self-center rounded-2xl border border-gold/40 bg-gold text-night shadow-[0_0_45px_rgba(213,174,99,.25)]">
                  <CarFront size={30} />
                </div>
                <div className="flex items-center gap-3 self-end rounded-xl border border-white/10 bg-night/85 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-400/10 text-sky-200"><MapPinned size={19} /></span>
                  <span><small className="block text-muted">الوجهة</small><b className="text-sm">اختر المكان</b></span>
                </div>
              </div>
              <p className="relative mt-3 text-center text-[11px] text-muted">رسم توضيحي للواجهة — الخريطة الفعلية تظهر داخل طلب الرحلة</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-4">
                <Smartphone className="mb-2 text-gold" size={19} />
                <b className="text-sm">من الهاتف أو الكمبيوتر</b>
                <p className="mt-1 text-xs leading-5 text-muted">تصميم متجاوب مع مختلف الشاشات</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <CheckCircle2 className="mb-2 text-gold" size={19} />
                <b className="text-sm">طلب ومتابعة</b>
                <p className="mt-1 text-xs leading-5 text-muted">حسب إعدادات الحساب والخدمات</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell relative z-10 py-14">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs tracking-[.2em] text-gold">HOW IT WORKS</p>
          <h2 className="mt-3 text-3xl font-bold">كل دور له مساحة واضحة</h2>
          <p className="mt-3 text-sm leading-7 text-muted">اختار بوابتك؛ كل حساب يصل إلى الوظائف المسموح بها حسب دوره وصلاحياته.</p>
        </div>
        <div id="portals" className="grid gap-4 md:grid-cols-3">
          {portals.map(({ href, title, description, icon: Icon, tag }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-white/10 bg-panel p-6 transition duration-200 hover:-translate-y-1 hover:border-gold/40 hover:shadow-glow">
              <div className="mb-8 flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={24} /></span>
                <span className="text-xs text-muted">{tag}</span>
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-3 min-h-14 text-sm leading-7 text-muted">{description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gold">الدخول للبوابة <ArrowLeft size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell relative z-10 py-14">
        <div className="mb-8">
          <p className="text-xs tracking-[.2em] text-gold">BUILT FOR DAILY RIDES</p>
          <h2 className="mt-3 text-3xl font-bold">أدوات تساعد على تنظيم الرحلة</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
              <Icon className="mb-5 text-gold" size={25} />
              <h3 className="font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell relative z-10 pb-20 pt-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold/20 bg-gradient-to-l from-gold/10 to-white/[.02] p-7 md:flex-row md:items-center md:p-10">
          <div>
            <div className="mb-3 flex items-center gap-2 text-gold"><Users size={18} /><span className="text-xs tracking-widest">CAPITAL TAXI</span></div>
            <h2 className="text-2xl font-bold md:text-3xl">جاهز تبدأ مشوارك؟</h2>
            <p className="mt-3 text-sm leading-7 text-muted">سجّل الدخول للوصول إلى بوابة العميل أو السائق أو الإدارة.</p>
          </div>
          <Link href="/login?next=/customer" className="inline-flex shrink-0 items-center gap-3 rounded-xl bg-gold px-6 py-4 font-bold text-night transition hover:bg-[#e5c47f]">الدخول إلى التطبيق <ArrowLeft size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-7 text-center text-xs text-muted">
        © {new Date().getFullYear()} CAPITAL TAXI · تاكسي العاصمة · العريش، شمال سيناء
      </footer>
    </main>
  );
}
