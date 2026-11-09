"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CarFront, LayoutDashboard, LogOut, Menu, UserRound, ShieldCheck, Sparkles } from "lucide-react";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { BrandMark } from "@/components/brand-mark";
import { GoogleArishMap } from "@/components/google-arish-map";

type Props = {
  title: string;
  subtitle: string;
  role: "العميل" | "السائق" | "الإدارة";
  children: React.ReactNode;
};

const portalLinks = {
  "العميل": [{ href: "/customer", label: "طلب رحلة", icon: UserRound }],
  "السائق": [{ href: "/driver", label: "مساحة السائق", icon: CarFront }],
  "الإدارة": [{ href: "/admin", label: "مركز التحكم", icon: LayoutDashboard }],
} as const;

const roleMeta = {
  "العميل": { eyebrow: "رحلتك تبدأ من هنا", icon: UserRound, accent: "منصة الركاب", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/%D8%B4%D8%A7%D8%B7%D8%A6_%D8%A7%D9%84%D8%B1%D9%8A%D8%B3%D8%A9_%D8%A8%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg/1280px-%D8%B4%D8%A7%D8%B7%D8%A6_%D8%A7%D9%84%D8%B1%D9%8A%D8%B3%D8%A9_%D8%A8%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg", imageAlt: "شاطئ مدينة العريش" },
  "السائق": { eyebrow: "كل مشوار بخطوة أوضح", icon: CarFront, accent: "منصة السائقين", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/%D9%86%D8%AE%D9%8A%D9%84_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg/1280px-%D9%86%D8%AE%D9%8A%D9%84_%D8%A7%D9%84%D8%B9%D8%B1%D9%8A%D8%B4.jpg", imageAlt: "نخيل العريش" },
  "الإدارة": { eyebrow: "إدارة التشغيل بوضوح", icon: ShieldCheck, accent: "مركز العمليات", image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/ISS075-E-351_-_View_of_Egypt_-_Mediterranean_Sea_-_Al_Arish_%28El_Arish%29_-_Wadi_al-Arish_%28cropped%29.jpg/1920px-ISS075-E-351_-_View_of_Egypt_-_Mediterranean_Sea_-_Al_Arish_%28El_Arish%29_-_Wadi_al-Arish_%28cropped%29.jpg", imageAlt: "مشهد من مدينة العريش" },
} as const;

export function PortalShell({ title, subtitle, role, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const RoleIcon = roleMeta[role].icon;

  async function handleLogout() {
    setLogoutBusy(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("تعذر إنهاء جلسة الخادم.");
      try { await signOut(getFirebaseClientAuth()); } catch { /* Server session already revoked. */ }
      window.location.assign("/login");
    } catch {
      setLogoutError("لم نتمكن من تسجيل الخروج. تحقق من الاتصال ثم حاول مرة أخرى.");
      setLogoutBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-ink)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[var(--brand)] focus:px-4 focus:py-3 focus:text-[#101722]">تخطي إلى المحتوى</a>
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[#0a111b]/95 text-[var(--app-ink)] shadow-[0_10px_35px_rgba(0,0,0,.32)] backdrop-blur-2xl">
        <div className="shell flex h-[76px] items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <BrandMark size={44} className="rounded-[15px] shadow-[0_7px_18px_rgba(184,139,0,.22)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
            <span><b className="block text-[15px] font-black tracking-tight">تاكسي العاصمة</b><small className="text-[9px] font-bold tracking-[.24em] text-[var(--app-muted)]">CAPITAL TAXI</small></span>
          </Link>
          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-2 md:flex">
            {portalLinks[role].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all duration-200 ${pathname === href ? "bg-[var(--brand-soft)] text-[var(--brand)] shadow-[inset_0_0_0_1px_rgba(245,196,0,.24)]" : "text-[var(--app-muted)] hover:bg-[var(--app-bg)] hover:text-[var(--app-ink)]"}`}>
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[var(--app-border)] bg-[#111b28] px-3.5 py-2 text-[11px] font-bold text-[var(--app-muted)] sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-deep)]" /> حساب {role}</span>
            <button type="button" onClick={handleLogout} disabled={logoutBusy}
              className="hidden items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2.5 text-xs font-black text-[#101722] shadow-[0_7px_18px_rgba(245,196,0,.16)] transition hover:-translate-y-0.5 hover:bg-[#ffd633] disabled:opacity-50 sm:inline-flex">
              <LogOut size={14} />{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
            <button type="button" onClick={() => setOpen(!open)} aria-label="فتح القائمة" aria-expanded={open}
              className="rounded-xl border border-[var(--app-border)] bg-[#111c2a] p-2.5 text-[var(--app-ink)] shadow-sm transition hover:bg-[var(--app-bg)] md:hidden">
              <Menu size={19} />
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-[var(--app-border)] bg-[#0b1420]/98 shadow-xl md:hidden">
            <nav className="shell flex flex-col gap-1 py-3" aria-label="قائمة الهاتف">
              {portalLinks[role].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  aria-current={pathname === href ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === href ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--app-ink)] hover:bg-[var(--brand-soft)]"}`}>
                  <Icon size={17} />{label}
                </Link>
              ))}
              <button type="button" onClick={handleLogout} disabled={logoutBusy}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold text-[var(--app-ink)] transition hover:bg-[var(--brand-soft)] disabled:opacity-50">
                <LogOut size={17} />{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
              </button>
            </nav>
          </div>
        )}
      </header>

      <section id="main-content" className="relative isolate min-h-[calc(100vh-150px)] overflow-hidden py-7 md:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[390px] bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,.11),transparent_55%),radial-gradient(ellipse_at_top_left,rgba(36,92,132,.16),transparent_48%)]" />
        <div className="shell">
          {logoutError && <p role="alert" className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-950/40 p-4 text-sm text-rose-200">{logoutError}</p>}
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--brand)]"><ArrowRight size={15} /> الرئيسية</Link>
          <div className="relative mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[var(--navy)] p-6 text-white shadow-[var(--shadow-float)] ring-1 ring-black/20 md:p-8 lg:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,20,32,.18)_0%,rgba(10,20,32,.58)_38%,rgba(10,20,32,.98)_100%)]" />
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[58%] scale-[1.03] bg-cover bg-center opacity-75 saturate-[.82] transition-transform duration-700 md:w-[48%]" style={{ backgroundImage: `url(${roleMeta[role].image})` }} />
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="relative z-10 flex min-h-[190px] flex-wrap items-end justify-between gap-6 md:min-h-[220px]">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#111a26]/10 px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-[var(--brand)] backdrop-blur"><Sparkles size={13} /> {roleMeta[role].accent} <span className="text-white/60">/ CAPITAL TAXI</span></div>
                <p className="mb-2 text-xs font-bold text-white/70">{roleMeta[role].eyebrow}</p>
                <h1 className="text-[28px] font-black leading-tight tracking-tight text-white md:text-[40px]">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 md:text-[15px]">{subtitle}</p>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center rounded-[22px] border border-white/20 bg-[#111a26]/10 text-[var(--brand)] backdrop-blur md:flex"><RoleIcon size={30} strokeWidth={1.8} /></div>
            </div>
            <div className="absolute bottom-0 right-0 h-1.5 w-40 bg-[var(--brand)]" />
          </div>
          <section aria-label="خريطة العريش" className="mb-8 overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[#101a27] shadow-[0_20px_55px_rgba(0,0,0,.22)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white md:px-6">
              <div><p className="text-[9px] font-black tracking-[.22em] text-[var(--brand)]">GOOGLE MAPS · EL ARISH</p><h2 className="mt-1 text-base font-black">خريطة العريش ومحيط الخدمة</h2></div>
              <a href="https://www.google.com/maps?q=31.137964865936812,33.779992824945815" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-bold text-white/80 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">فتح في خرائط Google</a>
            </div>
            <div className="h-[280px] w-full sm:h-[340px] lg:h-[390px]"><GoogleArishMap /></div>
            <p className="border-t border-white/10 px-5 py-3 text-[10px] leading-6 text-white/55">هذه خريطة مرجعية لموقع العريش؛ لا تعرض مواقع السائقين أو الرحلات بشكل مباشر.</p>
          </section>
          {children}
        </div>
      </section>
      <footer className="border-t border-[var(--app-border)] bg-[#0a111b] py-7 text-center text-[11px] font-medium text-[var(--app-muted)]">
        © {new Date().getFullYear()} تاكسي العاصمة · العريش، شمال سيناء
      </footer>
    </main>
  );
}
