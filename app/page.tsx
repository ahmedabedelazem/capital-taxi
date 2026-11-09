import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, CarFront, Check, ShieldCheck, Smartphone, Users, Navigation, Leaf, MapPin, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";


const portals = [
  { href: "/login?next=/customer", title: "اطلب رحلتك", description: "حدد نقطة الانطلاق والوجهة، واستعرض تفاصيل المشوار من واجهة واضحة.", icon: Navigation, tag: "للركاب", number: "01" },
  { href: "/login?next=/driver/apply", title: "كن سائقًا معنا", description: "قدّم طلب الانضمام وتابع حالة حسابك من مساحة مخصصة للسائقين.", icon: CarFront, tag: "للسائقين", number: "02" },
  { href: "/login?next=/admin", title: "مركز الإدارة", description: "تابع التشغيل والرحلات وطلبات السائقين من بوابة الإدارة.", icon: ShieldCheck, tag: "للإدارة", number: "03" },
];
const steps = [
  { number: "01", title: "حدد مشوارك", description: "اختر نقطة الانطلاق والوجهة من خريطة وعناوين واضحة." },
  { number: "02", title: "راجع التفاصيل", description: "اطّلع على فئة السيارة وتفاصيل الرحلة قبل إرسال الطلب." },
  { number: "03", title: "تابع رحلتك", description: "تابع حالة الطلب وتفاصيل السائق بعد إسناد الرحلة." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-white/90 shadow-[0_8px_30px_rgba(28,48,20,.04)] backdrop-blur-2xl">
        <nav className="shell flex h-[78px] items-center justify-between gap-4" aria-label="التنقل الرئيسي">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <BrandMark size={46} className="rounded-[16px] shadow-[0_8px_20px_rgba(92,143,37,.2)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
            <span><b className="block text-[16px] font-black leading-tight tracking-tight">تاكسي العاصمة</b><span className="text-[9px] font-bold tracking-[.25em] text-[var(--app-muted)]">CAPITAL TAXI</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-[13px] font-bold text-[var(--app-muted)] md:flex">
            <a href="#how-it-works" className="transition hover:text-[var(--brand-deep)]">كيف تعمل الخدمة</a>
            <a href="#portals" className="transition hover:text-[var(--brand-deep)]">بوابات الاستخدام</a>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-2 text-[11px] font-extrabold text-[var(--brand-deep)]"><MapPin size={13}/> العريش · شمال سيناء</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-3 text-[13px] font-bold text-[var(--app-muted)] transition hover:bg-[var(--app-bg)] hover:text-[var(--app-ink)] sm:inline-flex">تسجيل الدخول</Link>
            <Link href="/login?next=/customer" className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-[12px] font-black text-[var(--app-ink)] shadow-[0_8px_20px_rgba(116,170,48,.2)] transition hover:-translate-y-0.5 hover:bg-[#a0d653]">اطلب رحلة <ArrowLeft size={15}/></Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_20%,rgba(145,200,62,.13),transparent_35%),radial-gradient(ellipse_at_90%_60%,rgba(115,168,162,.15),transparent_34%)]"/>
        <div className="shell grid min-h-[690px] items-center gap-10 py-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-14 lg:py-16">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#8cc63f]/35 bg-white/80 px-4 py-2 text-[11px] font-extrabold text-[var(--brand-deep)] shadow-sm backdrop-blur"><Sparkles size={14}/> تنقّل محلي بتجربة أكثر وضوحًا <span className="mx-1 h-1 w-1 rounded-full bg-[var(--brand)]"/> العريش وشمال سيناء</div>
            <h1 className="text-[48px] font-black leading-[1.15] tracking-[-.045em] sm:text-[64px] lg:text-[78px]">مشوارك،<br/><span className="relative inline-block text-[var(--brand-deep)]">اختيارك.</span></h1>
            <p className="mt-7 max-w-xl text-[15px] leading-8 text-[var(--app-muted)] md:text-[17px]">من أول نقطة على الخريطة إلى نهاية الطريق؛ تجربة تاكسي العاصمة مصممة لتجعل تفاصيل مشوارك أوضح وأسهل.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--brand)] px-7 py-4 text-[13px] font-black text-[var(--app-ink)] shadow-[0_14px_30px_rgba(116,170,48,.22)] transition hover:-translate-y-1 hover:bg-[#a0d653]">ابدأ طلب رحلتك <ArrowLeft size={18}/></Link>
              <a href="#how-it-works" className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-white/85 px-6 py-4 text-[13px] font-extrabold text-[var(--app-ink)] transition hover:border-[#8cc63f]/60 hover:bg-white"><ArrowUpLeft size={17}/> اكتشف التجربة</a>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-[var(--app-border)] pt-6">
              <div><div className="mb-2 flex items-center gap-2 text-[var(--brand-deep)]"><MapPin size={16}/><span className="text-[10px] font-black">محلي</span></div><p className="text-[11px] font-bold text-[var(--app-muted)]">مصمم للعريش</p></div>
              <div><div className="mb-2 flex items-center gap-2 text-[var(--brand-deep)]"><Smartphone size={16}/><span className="text-[10px] font-black">مرن</span></div><p className="text-[11px] font-bold text-[var(--app-muted)]">متوافق مع الهاتف</p></div>
              <div><div className="mb-2 flex items-center gap-2 text-[var(--brand-deep)]"><ShieldCheck size={16}/><span className="text-[10px] font-black">منظم</span></div><p className="text-[11px] font-bold text-[var(--app-muted)]">بوابات حسب الدور</p></div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[650px]">
            <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[42px] bg-[#8cc63f]/15 blur-3xl"/>
            <div className="relative rounded-[34px] border border-white/80 bg-white/70 p-2.5 shadow-[0_30px_90px_rgba(34,59,28,.16)] backdrop-blur">
              <div className="overflow-hidden rounded-[27px]"><div className="relative">
                <img src="https://commons.wikimedia.org/wiki/Special:FilePath/%D8%B4%D8%A7%D8%B7%D8%A6_%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg" alt="شاطئ مدينة العريش على البحر المتوسط" className="block aspect-[5/4] w-full object-cover" fetchPriority="high"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d14]/85 via-transparent to-transparent"/>
                <div className="absolute bottom-5 right-5 left-5 flex items-end justify-between gap-3 text-white">
                  <div><span className="text-[10px] font-black tracking-[.2em] text-[#f5c400]">NORTH SINAI · EGYPT</span><h2 className="mt-1 text-2xl font-black md:text-3xl">جمال العريش… في كل مشوار</h2></div>
                  <span className="rounded-full border border-white/25 bg-black/35 px-3 py-2 text-[10px] font-bold backdrop-blur">شاطئ العريش</span>
                </div>
              </div></div>
              <div className="absolute -bottom-5 right-6 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(28,48,20,.14)] backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]"><CarFront size={21}/></span>
                <span><b className="block text-[12px] font-black">تاكسي العاصمة</b><small className="text-[10px] font-semibold text-[var(--app-muted)]">رحلتك تبدأ من العريش</small></span>
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="border-y border-[var(--app-border)] bg-[#0b121c] py-16 md:py-20">
        <div className="shell">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.24em] text-[var(--brand)]">OUR CITY · EL ARISH</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">من قلب العريش</h2></div><p className="max-w-md text-sm leading-7 text-[var(--app-muted)]">صور حقيقية من شاطئ المدينة ونخيلها وساحلها؛ لأن تاكسي العاصمة جزء من المكان وأهله.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
            <figure className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#111a26]">
              <img src="https://commons.wikimedia.org/wiki/Special:FilePath/%D8%B4%D8%A7%D8%B7%D8%A6_%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg" alt="شاطئ مدينة العريش" loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.03]"/>
              <figcaption className="flex items-center justify-between gap-3 p-5"><span><b className="block text-base font-black">شاطئ العريش</b><small className="mt-1 block text-xs text-[var(--app-muted)]">ساحل البحر المتوسط</small></span><span className="text-xs font-bold text-[var(--brand)]">01 / EL ARISH</span></figcaption>
            </figure>
            <figure className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#111a26]">
              <img src="https://commons.wikimedia.org/wiki/Special:FilePath/%D9%86%D8%AE%D9%8A%D9%84_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg" alt="نخيل العريش" loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.03]"/>
              <figcaption className="flex items-center justify-between gap-3 p-5"><span><b className="block text-base font-black">نخيل العريش</b><small className="mt-1 block text-xs text-[var(--app-muted)]">ملامح المدينة الساحلية</small></span><span className="text-xs font-bold text-[var(--brand)]">02 / SINAI</span></figcaption>
            </figure>
          </div>
          <p className="mt-5 text-[10px] leading-6 text-[var(--app-muted)]">مصدر الصور: Wikimedia Commons — <a className="underline decoration-white/30 underline-offset-4 hover:text-[var(--brand)]" href="https://commons.wikimedia.org/wiki/Category:Arish" target="_blank" rel="noreferrer">صفحة ملفات العريش وتفاصيل التراخيص والإسناد</a>.</p>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[var(--app-border)] bg-white py-20 md:py-24">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6"><div className="max-w-2xl"><p className="text-[10px] font-black tracking-[.24em] text-[var(--brand-deep)]">ثلاث خطوات بسيطة</p><h2 className="mt-4 text-[32px] font-black leading-tight tracking-tight md:text-[48px]">طريق أوضح، من البداية.</h2></div><p className="max-w-sm text-[13px] leading-7 text-[var(--app-muted)]">كل مرحلة في مكانها؛ من تفاصيل الطلب إلى متابعة الرحلة.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => <article key={step.number} className="group relative overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-bg)] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[var(--shadow-float)]">
              <div className="flex items-center justify-between"><span className="text-[12px] font-black tracking-[.2em] text-[var(--brand-deep)]">{step.number}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--brand-deep)] shadow-sm transition group-hover:bg-[var(--brand-soft)]"><Check size={18}/></span></div>
              <h3 className="mt-9 text-[19px] font-black">{step.title}</h3><p className="mt-3 text-[13px] leading-7 text-[var(--app-muted)]">{step.description}</p>
              {index<2 && <div aria-hidden="true" className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[var(--brand-soft)] blur-2xl"/>}
            </article>)}
          </div>
        </div>
      </section>

      <section id="portals" className="shell py-20 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black tracking-[.24em] text-[var(--brand-deep)]">منصة واحدة · ثلاث تجارب</p><h2 className="mt-4 text-[32px] font-black tracking-tight md:text-[48px]">كل دور له مساحته.</h2></div><p className="max-w-md text-[13px] leading-7 text-[var(--app-muted)]">واجهات مخصصة للعميل والسائق والإدارة، مع تجربة بصرية موحدة وهوية واحدة.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {portals.map(({ href, title, description, icon: Icon, tag, number }) => <Link key={href} href={href} className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-white p-6 shadow-[0_8px_28px_rgba(28,48,20,.035)] transition duration-300 hover:-translate-y-1.5 hover:border-[#8cc63f]/60 hover:shadow-[var(--shadow-float)]">
            <span className="absolute left-5 top-5 text-[11px] font-black tracking-[.2em] text-[#a5ad9e]">{number}</span>
            <div className="flex items-center justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-deep)] transition duration-300 group-hover:rotate-[-4deg] group-hover:bg-[var(--brand)] group-hover:text-[var(--app-ink)]"><Icon size={25}/></span><span className="rounded-full border border-[var(--app-border)] px-3 py-1.5 text-[10px] font-bold text-[var(--app-muted)]">{tag}</span></div>
            <h3 className="mt-9 text-[20px] font-black">{title}</h3><p className="mt-3 text-[13px] leading-7 text-[var(--app-muted)]">{description}</p><span className="mt-auto inline-flex items-center gap-2 pt-7 text-[12px] font-black text-[var(--brand-deep)]">الدخول إلى البوابة <ArrowLeft size={15} className="transition group-hover:-translate-x-1"/></span>
          </Link>)}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#172116] py-16 text-white md:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(145,200,62,.22),transparent_35%),linear-gradient(115deg,transparent_40%,rgba(255,255,255,.035))]"/>
        <div className="shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div><div className="mb-4 flex items-center gap-3 text-[#b9df8a]"><BrandMark size={32}/><span className="text-[10px] font-black tracking-[.24em]">CAPITAL TAXI</span></div><h2 className="text-[32px] font-black tracking-tight md:text-[44px]">العريش أقرب… مع تاكسي العاصمة.</h2><p className="mt-3 text-[13px] leading-7 text-white/65">ابدأ من بوابة العميل واطلب رحلتك بخطوات واضحة.</p></div>
          <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--brand)] px-7 py-4 text-[13px] font-black text-[var(--app-ink)] shadow-[0_12px_28px_rgba(145,200,62,.18)] transition hover:-translate-y-1 hover:bg-[#a0d653]">اطلب رحلتك الآن <ArrowLeft size={18}/></Link>
        </div>
      </section>
      <footer className="bg-[#172116] px-5 pb-8 text-white"><div className="shell flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-[11px] font-medium text-white/55 sm:flex-row"><span>© {new Date().getFullYear()} تاكسي العاصمة · CAPITAL TAXI</span><span className="inline-flex items-center gap-2"><MapPin size={13}/> العريش · شمال سيناء</span></div></footer>
    </main>
  );
}
