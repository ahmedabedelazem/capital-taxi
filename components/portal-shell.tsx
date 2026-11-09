"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CarFront, LayoutDashboard, LogOut, Menu, UserRound, ShieldCheck, Sparkles } from "lucide-react";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { BrandMark } from "@/components/brand-mark";

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
  "العميل": { eyebrow: "رحلتك تبدأ من هنا", icon: UserRound, accent: "منصة الركاب" },
  "السائق": { eyebrow: "كل مشوار بخطوة أوضح", icon: CarFront, accent: "منصة السائقين" },
  "الإدارة": { eyebrow: "إدارة التشغيل بوضوح", icon: ShieldCheck, accent: "مركز العمليات" },
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-black">تخطي إلى المحتوى</a>
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-white/90 text-[var(--app-ink)] shadow-[0_8px_30px_rgba(28,48,20,.035)] backdrop-blur-2xl">
        <div className="shell flex h-[76px] items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <BrandMark size={44} className="rounded-[15px] shadow-[0_7px_18px_rgba(92,143,37,.18)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
            <span><b className="block text-[15px] font-black tracking-tight">تاكسي العاصمة</b><small className="text-[9px] font-bold tracking-[.24em] text-[var(--app-muted)]">CAPITAL TAXI</small></span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-2 md:flex">
            {portalLinks[role].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all duration-200 ${pathname === href ? "bg-[var(--brand-soft)] text-[var(--brand-deep)] shadow-[inset_0_0_0_1px_rgba(92,143,37,.12)]" : "text-[var(--app-muted)] hover:bg-[var(--app-bg)] hover:text-[var(--app-ink)]"}`}>
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] px-3.5 py-2 text-[11px] font-bold text-[var(--app-muted)] sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-deep)]" /> حساب {role}</span>
            <button type="button" onClick={handleLogout} disabled={logoutBusy}
              className="hidden items-center gap-2 rounded-full bg-[var(--app-ink)] px-4 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(24,32,21,.12)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] disabled:opacity-50 sm:inline-flex">
              <LogOut size={14} />{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
            <button type="button" onClick={() => setOpen(!open)} aria-label="فتح القائمة" aria-expanded={open}
              className="rounded-xl border border-[var(--app-border)] bg-white p-2.5 text-[var(--app-ink)] shadow-sm transition hover:bg-[var(--app-bg)] md:hidden">
              <Menu size={19} />
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-[var(--app-border)] bg-white/95 shadow-xl md:hidden">
            <nav className="shell flex flex-col gap-1 py-3" aria-label="قائمة الهاتف">
              {portalLinks[role].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--app-ink)] transition hover:bg-[var(--brand-soft)]">
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
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[390px] bg-[radial-gradient(ellipse_at_top_right,rgba(140,198,63,.13),transparent_55%),radial-gradient(ellipse_at_top_left,rgba(115,168,162,.10),transparent_48%)]" />
        <div className="shell">
          {logoutError && <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{logoutError}</p>}
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--brand-deep)]"><ArrowRight size={15} /> الرئيسية</Link>
          <div className="relative mb-8 overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-white p-6 shadow-[0_18px_55px_rgba(28,48,20,.055)] md:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-20 h-56 w-56 rounded-full bg-[var(--brand-soft)] blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-[var(--brand-deep)]"><Sparkles size={13} /> {roleMeta[role].accent} <span className="text-[var(--app-muted)]">/ CAPITAL TAXI</span></div>
                <p className="mb-2 text-xs font-bold text-[var(--app-muted)]">{roleMeta[role].eyebrow}</p>
                <h1 className="text-[28px] font-black leading-tight tracking-tight text-[var(--app-ink)] md:text-[38px]">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)] md:text-[15px]">{subtitle}</p>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--brand-soft)] text-[var(--brand-deep)] md:flex"><RoleIcon size={30} strokeWidth={1.8} /></div>
            </div>
          </div>
          {children}
        </div>
      </section>
      <footer className="border-t border-[var(--app-border)] bg-white/75 py-6 text-center text-[11px] font-medium text-[var(--app-muted)]">
        © {new Date().getFullYear()} تاكسي العاصمة · العريش، شمال سيناء
      </footer>
    </main>
  );
}
