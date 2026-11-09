import Link from "next/link";
import {
  ArrowLeft, ArrowUpLeft, BadgeCheck, CarFront, Check, ChevronLeft,
  Clock3, Compass, MapPin, Navigation, ShieldCheck, Smartphone,
  Sparkles, UsersRound, Wallet, Waves
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const destinations = [
  { name: "شاطئ الريسة", note: "نسيم البحر ورمال الساحل", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/%D8%B4%D8%A7%D8%B7%D8%A6_%D8%A7%D9%84%D8%B1%D9%8A%D8%B3%D8%A9_%D8%A8%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg/1280px-%D8%B4%D8%A7%D8%B7%D8%A6_%D8%A7%D9%84%D8%B1%D9%8A%D8%B3%D8%A9_%D8%A8%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg", alt: "شاطئ الريسة في مدينة العريش" },
  { name: "نخيل العريش", note: "علامة مميزة على ساحل سيناء", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/%D9%86%D8%AE%D9%8A%D9%84_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg/1280px-%D9%86%D8%AE%D9%8A%D9%84_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg", alt: "نخيل العريش على الساحل" },
  { name: "ساحل العريش", note: "المدينة من منظور واسع", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/ISS075-E-351_-_View_of_Egypt_-_Mediterranean_Sea_-_Al_Arish_%28El_Arish%29_-_Wadi_al-Arish_%28cropped%29.jpg/1920px-ISS075-E-351_-_View_of_Egypt_-_Mediterranean_Sea_-_Al_Arish_%28El_Arish%29_-_Wadi_al-Arish_%28cropped%29.jpg", alt: "مشهد جوي لساحل العريش" },
];
const portals = [
  { href: "/login?next=/customer", title: "اطلب رحلتك", description: "حدد مكانك ووجهتك، واختر فئة السيارة وتابع حالة طلبك.", icon: Navigation, tag: "للركاب", number: "01" },
  { href: "/login?next=/driver/apply", title: "انضم كسائق", description: "ابدأ طلب الانضمام وتابع بياناتك وحالة مراجعة حسابك.", icon: CarFront, tag: "للسائقين", number: "02" },
  { href: "/login?next=/admin", title: "لوحة الإدارة", description: "مساحة تشغيل لمتابعة الرحلات وطلبات السائقين والإدارة.", icon: ShieldCheck, tag: "للإدارة", number: "03" },
];
const steps = [
  { number: "01", title: "حدد مكانك", description: "اختر نقطة الانطلاق من الخريطة أو استخدم موقعك الحالي." },
  { number: "02", title: "اختر وجهتك", description: "راجع تفاصيل المشوار وفئة المركبة قبل إرسال الطلب." },
  { number: "03", title: "تابع مشوارك", description: "تابع حالة الطلب وتفاصيل الرحلة من حسابك." },
];

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#070d16] text-[#f4f0e7]">
      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#080f19]/90 backdrop-blur-2xl">
        <nav className="shell flex h-[76px] items-center justify-between gap-4" aria-label="التنقل الرئيسي">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <BrandMark size={46} className="rounded-[15px] shadow-[0_8px_28px_rgba(220,177,91,.2)] transition-transform duration-300 group-hover:scale-105" />
            <span><b className="block text-[16px] font-black leading-tight">تاكسي العاصمة</b><span className="text-[9px] font-bold tracking-[.28em] text-[#aab4c1]">CAPITAL TAXI</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-[12px] font-bold text-[#aab4c1] lg:flex">
            <a href="#experience" className="transition hover:text-[#e5bd70]">التجربة</a>
            <a href="#arish" className="transition hover:text-[#e5bd70]">العريش</a>
            <a href="#how-it-works" className="transition hover:text-[#e5bd70]">كيف تعمل</a>
            <a href="#portals" className="transition hover:text-[#e5bd70]">بوابات الاستخدام</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-[#c1cbd4] sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[#7ac49b]"/> العريش · شمال سيناء</span>
            <Link href="/login" className="hidden rounded-full px-4 py-3 text-[12px] font-bold text-[#c2cbd5] transition hover:bg-white/5 sm:inline-flex">دخول الحساب</Link>
            <Link href="/login?next=/customer" className="inline-flex items-center gap-2 rounded-full bg-[#e5bd70] px-5 py-3 text-[11px] font-black text-[#101722] shadow-[0_8px_25px_rgba(229,189,112,.18)] transition hover:-translate-y-0.5 hover:bg-[#f1d18e]">اطلب رحلة <ArrowLeft size={15}/></Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate min-h-[690px] overflow-hidden border-b border-white/[.07]">
        <div className="absolute inset-0 -z-20">
          <img src={destinations[0].image} alt="" className="h-full w-full object-cover object-center opacity-[.34]" fetchPriority="high"/>
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,11,19,.95)_0%,rgba(5,11,19,.77)_48%,rgba(5,11,19,.48)_100%),linear-gradient(0deg,#070d16_0%,transparent_48%)]"/>
        <div aria-hidden="true" className="absolute -right-36 top-10 -z-10 h-[500px] w-[500px] rounded-full border border-[#e5bd70]/10"/>
        <div aria-hidden="true" className="absolute -right-20 top-28 -z-10 h-[360px] w-[360px] rounded-full border border-[#e5bd70]/10"/>
        <div className="shell grid min-h-[690px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e5bd70]/30 bg-[#111b28]/75 px-4 py-2 text-[10px] font-extrabold text-[#f0cc87] backdrop-blur"><Sparkles size={14}/> تجربة تنقّل تنتمي إلى العريش <span className="mx-1 h-1 w-1 rounded-full bg-[#e5bd70]"/> شمال سيناء</div>
            <p className="mb-4 text-[10px] font-black tracking-[.32em] text-[#c8d1dc]">CAPITAL TAXI · EL ARISH</p>
            <h1 className="text-[48px] font-black leading-[1.16] tracking-[-.045em] sm:text-[66px] lg:text-[78px]">العريش على<br/><span className="text-[#e5bd70]">طريقك.</span></h1>
            <p className="mt-7 max-w-xl text-[15px] leading-9 text-[#c0cad5] md:text-[17px]">من مشاويرك اليومية إلى الرحلات الخاصة؛ تاكسي العاصمة يقدّم لك تجربة محلية واضحة، بهوية مستوحاة من جمال الساحل وروح المدينة.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[#e5bd70] px-7 py-4 text-[12px] font-black text-[#101722] shadow-[0_14px_35px_rgba(229,189,112,.2)] transition hover:-translate-y-1 hover:bg-[#f1d18e]">ابدأ طلب رحلتك <ArrowLeft size={18}/></Link>
              <a href="#experience" className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-white/20 bg-[#101b29]/65 px-6 py-4 text-[12px] font-extrabold text-white backdrop-blur transition hover:border-[#e5bd70]/60 hover:bg-[#152337]"><ArrowUpLeft size={17}/> اكتشف التجربة</a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6">
              <div className="flex items-center gap-3"><MapPin className="text-[#e5bd70]" size={19}/><span><b className="block text-[11px]">خدمة محلية</b><small className="text-[10px] text-[#9eabb9]">العريش وشمال سيناء</small></span></div>
              <div className="flex items-center gap-3"><ShieldCheck className="text-[#e5bd70]" size={19}/><span><b className="block text-[11px]">حسابات مخصصة</b><small className="text-[10px] text-[#9eabb9]">عميل · سائق · إدارة</small></span></div>
              <div className="flex items-center gap-3"><Smartphone className="text-[#e5bd70]" size={19}/><span><b className="block text-[11px]">متوافق مع هاتفك</b><small className="text-[10px] text-[#9eabb9]">تصميم متجاوب</small></span></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[590px]">
            <div className="absolute -inset-8 rounded-[42px] bg-[#d8aa58]/10 blur-3xl"/>
            <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-[#101a27]/75 p-2.5 shadow-[0_35px_100px_rgba(0,0,0,.5)] backdrop-blur-xl">
              <div className="relative overflow-hidden rounded-[27px]">
                <img src={destinations[2].image} alt={destinations[2].alt} className="aspect-[4/5] w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050a12] via-[#050a12]/5 to-transparent"/>
                <div className="absolute right-5 top-5 rounded-full border border-white/25 bg-[#08111d]/55 px-4 py-2 text-[9px] font-black tracking-[.2em] text-[#f1d18e] backdrop-blur">NORTH SINAI · EGYPT</div>
                <div className="absolute bottom-6 right-6 left-6 text-white">
                  <span className="text-[10px] font-bold tracking-[.22em] text-[#e5bd70]">A CITY WE CALL HOME</span>
                  <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">مشوارك يبدأ<br/>من قلب العريش</h2>
                  <p className="mt-3 max-w-sm text-xs leading-7 text-white/75">طريقك، مدينتك، وخدمة تعرف تفاصيل المكان.</p>
                </div>
              </div>
              <div className="absolute -bottom-1 left-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#111d2b]/95 px-4 py-3 shadow-2xl backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5bd70]/15 text-[#e5bd70]"><CarFront size={22}/></span>
                <span><b className="block text-[11px] font-black">CAPITAL TAXI</b><small className="text-[9px] text-[#aab6c3]">رحلتك تبدأ هنا</small></span>
              </div>
            </div>
            <div className="absolute -left-5 top-1/3 hidden rounded-2xl border border-white/10 bg-[#101b29]/90 px-4 py-3 shadow-xl backdrop-blur md:block">
              <div className="flex items-center gap-2 text-[#e5bd70]"><Waves size={15}/><span className="text-[9px] font-black">MEDITERRANEAN COAST</span></div>
              <p className="mt-1 text-[10px] text-white/70">سحر البحر… ودفء المدينة</p>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="border-b border-white/[.07] bg-[#0b1420] py-20 md:py-24">
        <div className="shell">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-[9px] font-black tracking-[.3em] text-[#e5bd70]">THE CAPITAL EXPERIENCE</p><h2 className="mt-3 text-3xl font-black md:text-5xl">خدمة مرتبة… من أول خطوة.</h2></div>
            <p className="max-w-md text-[12px] leading-8 text-[#9eabb9]">واجهة تجمع بين سهولة الاستخدام وهوية بصرية هادئة، وتضع تفاصيل المشوار في مكان واضح.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[25px] border border-white/10 bg-gradient-to-br from-[#17283a] to-[#0e1825] p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5bd70]/15 text-[#e5bd70]"><Compass size={23}/></span><h3 className="mt-6 text-lg font-black">اختيار واضح</h3><p className="mt-2 text-[12px] leading-7 text-[#aab6c3]">حدد الانطلاق والوجهة، وراجع بيانات الرحلة قبل إرسال الطلب.</p></article>
            <article className="rounded-[25px] border border-white/10 bg-gradient-to-br from-[#17283a] to-[#0e1825] p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5bd70]/15 text-[#e5bd70]"><Clock3 size={23}/></span><h3 className="mt-6 text-lg font-black">متابعة منظمة</h3><p className="mt-2 text-[12px] leading-7 text-[#aab6c3]">تابع حالة الطلب وتفاصيل الرحلة من حسابك بعد تسجيل الدخول.</p></article>
            <article className="rounded-[25px] border border-white/10 bg-gradient-to-br from-[#17283a] to-[#0e1825] p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5bd70]/15 text-[#e5bd70]"><Wallet size={23}/></span><h3 className="mt-6 text-lg font-black">تفاصيل قبل التأكيد</h3><p className="mt-2 text-[12px] leading-7 text-[#aab6c3]">راجع الفئة والتكلفة التقديرية المتاحة قبل تأكيد طلبك.</p></article>
          </div>
        </div>
      </section>

      <section id="arish" className="bg-[#080f19] py-20 md:py-24">
        <div className="shell">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="text-[9px] font-black tracking-[.3em] text-[#e5bd70]">OUR CITY · EL ARISH</p><h2 className="mt-3 text-3xl font-black md:text-5xl">العريش… حكاية المكان.</h2></div><p className="max-w-md text-[12px] leading-8 text-[#9eabb9]">من شاطئ الريسة إلى صفوف النخيل؛ تفاصيل من المدينة التي تنطلق منها رحلاتنا.</p></div>
          <div className="grid gap-5 md:grid-cols-12">
            {destinations.map((place, index) => <figure key={place.name} className={`group relative overflow-hidden rounded-[27px] border border-white/10 bg-[#111c29] ${index === 0 ? "md:col-span-6" : "md:col-span-3"}`}>
              <div className="overflow-hidden"><img src={place.image} alt={place.alt} loading="lazy" className={`w-full object-cover transition duration-700 group-hover:scale-[1.045] ${index === 0 ? "aspect-[5/4]" : "aspect-[5/6]"}`}/></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a12]/90 via-transparent to-transparent"/>
              <figcaption className="absolute bottom-0 right-0 left-0 p-6"><span className="text-[9px] font-black tracking-[.2em] text-[#e5bd70]">0{index+1} / EL ARISH</span><h3 className="mt-2 text-xl font-black">{place.name}</h3><p className="mt-1 text-[11px] text-white/70">{place.note}</p></figcaption>
            </figure>)}
          </div>
          <p className="mt-5 text-[9px] leading-6 text-[#778596]">مصادر الصور: Wikimedia Commons (شاطئ الريسة ونخيل العريش، بترخيص CC BY-SA 4.0) وNASA (الصورة الجوية، الملكية العامة). <a className="underline underline-offset-4 hover:text-[#e5bd70]" href="https://commons.wikimedia.org/wiki/Category:Arish" target="_blank" rel="noreferrer">أرشيف صور العريش</a>.</p>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-[#0c1724] py-20 md:py-24">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[9px] font-black tracking-[.3em] text-[#e5bd70]">CHOOSE YOUR RIDE</p><h2 className="mt-3 text-3xl font-black md:text-5xl">اختار ما يناسب مشوارك.</h2></div><p className="max-w-md text-[12px] leading-8 text-[#9eabb9]">تظهر فئات المركبات المتاحة داخل نموذج طلب الرحلة، وفق إعدادات التشغيل.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { name: "اقتصادي", detail: "للمشاوير اليومية والتنقل داخل المدينة", icon: CarFront },
              { name: "عائلي", detail: "مساحة أوسع حسب المركبة المتاحة", icon: UsersRound },
              { name: "خصوصي", detail: "رحلة خاصة وفق تفاصيل المركبة المتاحة", icon: BadgeCheck },
            ].map(({name,detail,icon:Icon},i)=><article key={name} className="group rounded-[25px] border border-white/10 bg-[#111e2c] p-7 transition hover:-translate-y-1 hover:border-[#e5bd70]/45"><div className="flex items-center justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e5bd70]/10 text-[#e5bd70] transition group-hover:bg-[#e5bd70] group-hover:text-[#101722]"><Icon size={26}/></span><span className="text-[10px] font-black tracking-[.2em] text-[#778596]">0{i+1}</span></div><h3 className="mt-7 text-xl font-black">{name}</h3><p className="mt-2 text-[12px] leading-7 text-[#9eabb9]">{detail}</p></article>)}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5bd70]/20 bg-[#e5bd70]/[.06] px-6 py-5"><p className="text-[11px] leading-7 text-[#b9c4d0]">اختيار الفئة ومراجعة التكلفة يتمان قبل إرسال الطلب.</p><Link href="/login?next=/customer" className="inline-flex items-center gap-2 rounded-xl bg-[#e5bd70] px-5 py-3 text-[11px] font-black text-[#101722] transition hover:bg-[#f1d18e]">اعرض خيارات الرحلة <ArrowLeft size={15}/></Link></div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#080f19] py-20 md:py-24">
        <div className="shell">
          <div className="max-w-2xl"><p className="text-[9px] font-black tracking-[.3em] text-[#e5bd70]">HOW IT WORKS</p><h2 className="mt-3 text-3xl font-black md:text-5xl">ثلاث خطوات… والطريق أوضح.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{steps.map((step,index)=><article key={step.number} className="relative overflow-hidden rounded-[25px] border border-white/10 bg-[#111c29] p-7"><span className="text-[12px] font-black tracking-[.2em] text-[#e5bd70]">{step.number}</span><div className="absolute left-6 top-6 text-[#e5bd70]/20"><Check size={34}/></div><h3 className="mt-10 text-lg font-black">{step.title}</h3><p className="mt-3 text-[12px] leading-8 text-[#9eabb9]">{step.description}</p>{index<2&&<div className="mt-7 flex items-center gap-2 text-[9px] font-bold text-[#e5bd70]">الخطوة التالية <ChevronLeft size={13}/></div>}</article>)}</div>
        </div>
      </section>

      <section id="portals" className="border-y border-white/[.07] bg-[#0c1724] py-20 md:py-24">
        <div className="shell"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[9px] font-black tracking-[.3em] text-[#e5bd70]">ONE PLATFORM · THREE SPACES</p><h2 className="mt-3 text-3xl font-black md:text-5xl">كل دور له بوابته.</h2></div><p className="max-w-md text-[12px] leading-8 text-[#9eabb9]">منصة واحدة بهوية موحدة، وتجربة دخول مخصصة للعميل والسائق والإدارة.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{portals.map(({href,title,description,icon:Icon,tag,number})=><Link key={href} href={href} className="group flex min-h-[270px] flex-col rounded-[25px] border border-white/10 bg-[#111e2c] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#e5bd70]/50 hover:shadow-[0_25px_60px_rgba(0,0,0,.25)]"><div className="flex items-center justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e5bd70]/10 text-[#e5bd70] transition group-hover:bg-[#e5bd70] group-hover:text-[#101722]"><Icon size={25}/></span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold text-[#aab6c3]">{tag} · {number}</span></div><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-3 text-[12px] leading-8 text-[#9eabb9]">{description}</p><span className="mt-auto inline-flex items-center gap-2 pt-6 text-[11px] font-black text-[#e5bd70]">الدخول إلى البوابة <ArrowLeft size={15} className="transition group-hover:-translate-x-1"/></span></Link>)}</div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#070d16] py-20 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_50%,rgba(229,189,112,.13),transparent_40%),linear-gradient(120deg,transparent_35%,rgba(32,76,106,.15))]"/>
        <div className="shell relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><div className="mb-5 flex items-center gap-3 text-[#e5bd70]"><BrandMark size={36}/><span className="text-[9px] font-black tracking-[.28em]">CAPITAL TAXI</span></div><h2 className="max-w-2xl text-3xl font-black leading-tight md:text-5xl">مشوارك القادم يبدأ من هنا.</h2><p className="mt-4 text-[12px] leading-8 text-[#aab6c3]">ابدأ من بوابة العميل، وحدد تفاصيل رحلتك في خطوات واضحة.</p></div><Link href="/login?next=/customer" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[#e5bd70] px-7 py-4 text-[12px] font-black text-[#101722] shadow-[0_12px_35px_rgba(229,189,112,.18)] transition hover:-translate-y-1 hover:bg-[#f1d18e]">اطلب رحلتك الآن <ArrowLeft size={18}/></Link></div>
      </section>

      <footer className="bg-[#050a11] px-5 pb-8 text-white"><div className="shell flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[10px] font-medium text-white/50 sm:flex-row"><span>© {new Date().getFullYear()} تاكسي العاصمة · CAPITAL TAXI</span><span className="inline-flex items-center gap-2"><MapPin size={13}/> العريش · شمال سيناء</span></div></footer>
    </main>
  );
}
