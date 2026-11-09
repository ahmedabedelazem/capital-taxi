import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, CarFront, Check, MapPin, ShieldCheck, Smartphone, Users, Navigation, Leaf } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ArishHeroArt } from "@/components/arish-hero-art";

const portals = [
  { href: "/login?next=/customer", title: "اطلب رحلة", description: "حدد مكانك ووجهتك، واختر السيارة المناسبة لمشوارك.", icon: Navigation, tag: "للركاب" },
  { href: "/login?next=/driver/apply", title: "انضم كسائق", description: "قدّم طلب الانضمام وتابع حالة اعتماد حسابك.", icon: CarFront, tag: "للسائقين" },
  { href: "/login?next=/admin", title: "إدارة التشغيل", description: "تابع الرحلات وطلبات السائقين وإعدادات الخدمة.", icon: ShieldCheck, tag: "للإدارة" },
];
const steps = [
  { number: "01", title: "حدد مشوارك", description: "أدخل مكان الانطلاق والوجهة وحدد تفاصيل رحلتك." },
  { number: "02", title: "راجع العرض", description: "راجع فئة السيارة والسعر التقديري قبل تأكيد الطلب." },
  { number: "03", title: "تحرك بثقة", description: "تابع حالة الرحلة وبيانات السائق بعد قبول الطلب." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f2] text-[#182015]">
      <header className="sticky top-0 z-40 border-b border-[#24351c]/10 bg-white/95 backdrop-blur">
        <nav className="shell flex h-[76px] items-center justify-between gap-4" aria-label="التنقل الرئيسي">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <BrandMark size={44} className="rounded-2xl" />
            <span><b className="block text-base font-extrabold leading-tight">تاكسي العاصمة</b><span className="text-[9px] font-semibold tracking-[.24em] text-neutral-500">CAPITAL TAXI</span></span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-neutral-700 md:flex">
            <a href="#how-it-works" className="transition hover:text-[#5e8f25]">كيف تعمل الخدمة</a>
            <a href="#portals" className="transition hover:text-[#5e8f25]">بوابات الاستخدام</a>
            <span className="text-neutral-500">العريش · شمال سيناء</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-3 text-sm font-semibold transition hover:bg-neutral-100 sm:inline-flex">تسجيل الدخول</Link>
            <Link href="/login?next=/customer" className="rounded-full bg-[#8cc63f] px-5 py-3 text-sm font-extrabold text-[#182015] transition hover:bg-[#7db432]">اطلب رحلة</Link>
          </div>
        </nav>
      </header>

      <section className="shell grid min-h-[650px] items-center gap-12 py-14 lg:grid-cols-[1fr_.95fr] lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#8cc63f]/40 bg-[#edf6df] px-4 py-2 text-xs font-bold text-[#466d20]">
            <Leaf size={15} /> تنقّل أسهل في العريش وشمال سيناء
          </div>
          <h1 className="text-5xl font-black leading-[1.2] tracking-tight sm:text-6xl lg:text-[76px]">
            مشوارك،<br /><span className="text-[#65972c]">اختيارك.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-neutral-600 md:text-lg">
            تاكسي العاصمة يقرّبك من مشوارك بخطوات واضحة وتجربة مرنة، من تحديد نقطة الانطلاق حتى متابعة الرحلة.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-[#8cc63f] px-7 py-4 text-sm font-extrabold text-[#182015] transition hover:bg-[#7db432]">ابدأ طلب رحلتك <ArrowLeft size={18} /></Link>
            <a href="#how-it-works" className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-bold transition hover:bg-[#edf6df]">اعرف كيف تعمل <ArrowUpLeft size={17} /></a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-black/10 pt-7 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-2"><Check size={17} className="text-[#65972c]" /> واجهة عربية</span>
            <span className="inline-flex items-center gap-2"><Smartphone size={17} className="text-[#65972c]" /> مناسبة للهاتف</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-[#65972c]" /> حسابات بصلاحيات</span>
          </div>
        </div>

        <ArishHeroArt />
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="shell">
          <div className="max-w-2xl"><p className="text-xs font-bold tracking-[.2em] text-[#65972c]">ببساطة</p><h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">خطوات واضحة. ومشوار أسهل.</h2></div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => <article key={step.number} className="border-t-4 border-[#8cc63f] pt-5"><span className="text-xs font-bold tracking-widest text-neutral-500">{step.number}</span><h3 className="mt-7 text-xl font-extrabold">{step.title}</h3><p className="mt-3 max-w-sm text-sm leading-7 text-neutral-600">{step.description}</p></article>)}
          </div>
        </div>
      </section>

      <section id="portals" className="shell py-20">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold tracking-[.2em] text-[#65972c]">منصة واحدة</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">كل شخص له تجربته.</h2></div><p className="max-w-md text-sm leading-7 text-neutral-600">اختر البوابة المناسبة. تظهر الوظائف وفق نوع الحساب والصلاحيات المعتمدة.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {portals.map(({ href, title, description, icon: Icon, tag }) => <Link key={href} href={href} className="group flex min-h-[250px] flex-col rounded-2xl border border-[#24351c]/10 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#8cc63f] hover:shadow-[0_18px_50px_rgba(54,83,30,.10)]">
            <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf6df] text-[#5e8f25] transition group-hover:bg-[#8cc63f] group-hover:text-[#182015]"><Icon size={23} /></span><span className="text-xs font-semibold text-neutral-500">{tag}</span></div>
            <h3 className="mt-9 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-7 text-neutral-600">{description}</p><span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-bold text-[#527e25]">متابعة <ArrowLeft size={16} /></span>
          </Link>)}
        </div>
      </section>

      <section className="bg-[#182015] py-16 text-white"><div className="shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div><div className="mb-4 flex items-center gap-2 text-[#b6d88a]"><Users size={17} /><span className="text-xs font-semibold tracking-[.2em]">CAPITAL TAXI</span></div><h2 className="text-3xl font-black tracking-tight md:text-4xl">جاهز للمشوار؟</h2><p className="mt-3 text-sm leading-7 text-neutral-300">ابدأ من بوابة العميل واطلب رحلتك.</p></div>
        <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-[#8cc63f] px-7 py-4 text-sm font-extrabold text-[#182015] transition hover:bg-[#a2d75c]">اطلب رحلتك الآن <ArrowLeft size={18} /></Link>
      </div></section>
      <footer className="bg-[#182015] px-5 pb-8 text-white"><div className="shell flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-xs text-neutral-300 sm:flex-row"><span>© {new Date().getFullYear()} تاكسي العاصمة · CAPITAL TAXI</span><span>العريش · شمال سيناء</span></div></footer>
    </main>
  );
}