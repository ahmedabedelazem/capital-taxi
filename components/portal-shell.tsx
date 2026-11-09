"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CarFront, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

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

export function PortalShell({ title, subtitle, role, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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
      try {
        await signOut(getFirebaseClientAuth());
      } catch {
        // The server session has already been revoked.
      }
      window.location.assign("/login");
    } catch {
      setLogoutError("لم نتمكن من تسجيل الخروج. تحقق من الاتصال ثم حاول مرة أخرى.");
      setLogoutBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-night text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-black">تخطي إلى المحتوى</a>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="shell flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="تاكسي العاصمة - الرئيسية">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white font-black text-black">CT</span>
            <span><b className="block text-sm">تاكسي العاصمة</b><small className="text-[10px] tracking-[.2em] text-muted">CAPITAL TAXI</small></span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-2 md:flex">
            {portalLinks[role].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${pathname === href ? "bg-white text-black" : "text-neutral-300 hover:bg-white/10 hover:text-white"}`}>
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-white/15 px-3 py-2 text-xs text-neutral-300 sm:inline-flex">حساب {role}</span>
            <button type="button" onClick={handleLogout} disabled={logoutBusy}
              className="hidden items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50 sm:inline-flex">
              <LogOut size={15} />{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
            <button type="button" onClick={() => setOpen(!open)} aria-label="فتح القائمة" aria-expanded={open}
              className="rounded-xl border border-white/15 p-2 md:hidden">
              <Menu size={20} />
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-white/10 bg-neutral-950 md:hidden">
            <nav className="shell flex flex-col gap-1 py-3" aria-label="قائمة الهاتف">
              {portalLinks[role].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white hover:bg-white/10">
                  <Icon size={17} />{label}
                </Link>
              ))}
              <button type="button" onClick={handleLogout} disabled={logoutBusy}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-right text-sm text-white hover:bg-white/10 disabled:opacity-50">
                <LogOut size={17} />{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
              </button>
            </nav>
          </div>
        )}
      </header>

      <section id="main-content" className="shell py-7 md:py-10">
        {logoutError && <p role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{logoutError}</p>}
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"><ArrowRight size={16} /> الرئيسية</Link>
        <div className="mb-8 border-b border-white/10 pb-7">
          <p className="mb-2 text-xs font-semibold tracking-[.18em] text-neutral-400">CAPITAL TAXI / {role}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-400">{subtitle}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-neutral-400" /> بوابة {role}
            </span>
          </div>
        </div>
        {children}
      </section>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} تاكسي العاصمة · العريش، شمال سيناء
      </footer>
    </main>
  );
}
