import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { BrandMark } from "@/components/brand-mark";
import { ArishHeroArt } from "@/components/arish-hero-art";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-6 text-[var(--app-ink)] md:px-6 md:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_12%,rgba(245,196,0,.11),transparent_34%),radial-gradient(ellipse_at_92%_80%,rgba(36,92,132,.14),transparent_32%)]"/>
      <div className="relative mx-auto max-w-[1320px]">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3"><BrandMark size={46} className="rounded-[16px] shadow-[0_8px_20px_rgba(245,196,0,.18)] transition group-hover:-rotate-3"/><span><b className="block text-[15px] font-black">تاكسي العاصمة</b><small className="text-[9px] font-bold tracking-[.24em] text-[var(--app-muted)]">CAPITAL TAXI</small></span></Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[#111a26]/85 px-4 py-2.5 text-xs font-bold text-[var(--app-muted)] transition hover:bg-[#111a26] hover:text-[var(--app-ink)]"><ArrowRight size={15}/> الرئيسية</Link>
        </header>
        <div className="grid min-h-[calc(100vh-130px)] items-center gap-8 lg:grid-cols-[1fr_.85fr] lg:gap-14">
          <section className="hidden lg:block">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(245,196,0,.3)] bg-[#111a26]/85 px-4 py-2 text-[11px] font-extrabold text-[var(--brand-deep)]"><Sparkles size={14}/> تجربة تنقّل محلية بهوية عصرية</div>
            <h1 className="max-w-xl text-[54px] font-black leading-[1.18] tracking-tight">أهلاً بك في<br/><span className="text-[var(--brand-deep)]">تاكسي العاصمة.</span></h1>
            <p className="mt-5 max-w-lg text-[15px] leading-8 text-[var(--app-muted)]">سجّل الدخول للوصول إلى بوابتك ومتابعة تفاصيل رحلاتك من تجربة عربية واضحة.</p>
            <div className="mt-8 max-w-[580px]"><ArishHeroArt/></div>
            <div className="mt-6 flex flex-wrap gap-5 text-[11px] font-bold text-[var(--app-muted)]"><span className="inline-flex items-center gap-2"><MapPin size={15} className="text-[var(--brand-deep)]"/> العريش · شمال سيناء</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--brand-deep)]"/> جلسة دخول محمية</span></div>
          </section>
          <section className="w-full">
            <div className="mb-6 text-center lg:hidden"><span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-deep)]"><ShieldCheck size={23}/></span><h1 className="text-2xl font-black">مرحبًا بك من جديد</h1><p className="mt-2 text-xs text-[var(--app-muted)]">ادخل إلى بوابة تاكسي العاصمة</p></div>
            <Suspense fallback={<div className="mx-auto max-w-md rounded-[30px] border border-[var(--app-border)] bg-[#111a26] p-8 text-center text-[var(--app-muted)] shadow-[var(--shadow-card)]">جارٍ تحميل نموذج الدخول…</div>}>
              <AuthPanel />
            </Suspense>
            <p className="mt-5 text-center text-[10px] font-medium text-[var(--app-muted)]">© {new Date().getFullYear()} CAPITAL TAXI · العريش، شمال سيناء</p>
          </section>
        </div>
      </div>
    </main>
  );
}
