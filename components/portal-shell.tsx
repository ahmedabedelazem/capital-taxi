"use client";

import Link from "next/link";
import { ArrowRight, Bell, Menu, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

type Props = {
  title: string;
  subtitle: string;
  role: "العميل" | "السائق" | "الإدارة";
  children: React.ReactNode;
};

export function PortalShell({ title, subtitle, role, children }: Props) {
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
        // The server session is already revoked; continue to the login screen.
      }
      window.location.assign("/login");
    } catch {
      setLogoutError("لم نتمكن من تسجيل الخروج. تحقق من الاتصال ثم حاول مرة أخرى.");
      setLogoutBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-night/85 backdrop-blur-xl">
        <div className="shell flex h-[76px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">CT</span>
            <span><b className="block text-sm">تاكسي العاصمة</b><small className="text-[10px] tracking-[.22em] text-gold">CAPITAL TAXI</small></span>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-muted">بوابة {role}</span>
            <Bell size={18} className="text-muted" />
            <button type="button" onClick={handleLogout} disabled={logoutBusy} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-muted transition hover:border-gold/40 hover:text-gold disabled:opacity-50">
              <LogOut size={15} /> {logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
          </div>
          <button onClick={() => setOpen(!open)} className="rounded-xl border border-white/10 p-2 sm:hidden" aria-label="القائمة" aria-expanded={open}>
            <Menu size={20} />
          </button>
        </div>
        {open && (
          <div className="shell flex flex-wrap items-center gap-5 pb-4 text-sm text-muted sm:hidden">
            <Link href="/customer">العميل</Link>
            <Link href="/driver">السائق</Link>
            <Link href="/admin">الإدارة</Link>
            <button type="button" onClick={handleLogout} disabled={logoutBusy} className="inline-flex items-center gap-2 text-gold disabled:opacity-50">
              <LogOut size={15} /> {logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
          </div>
        )}
      </header>
      <section className="shell py-8 md:py-12">
        {logoutError && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{logoutError}</p>}
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-gold"><ArrowRight size={16} /> الرئيسية</Link>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs tracking-widest text-gold">CAPITAL TAXI / {role}</p>
            <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-200">مرحلة تأسيس – لا يوجد تشغيل حي</span>
        </div>
        {children}
      </section>
    </main>
  );
}
