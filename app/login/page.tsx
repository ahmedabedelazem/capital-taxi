import { Suspense } from "react";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return <main className="min-h-screen bg-night px-4 py-8 text-white">
    <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-gold/10 font-bold text-gold">CT</span><span><b className="block text-sm">تاكسي العاصمة</b><small className="text-[10px] tracking-[.22em] text-gold">CAPITAL TAXI</small></span></Link>
      <Link href="/" className="text-sm text-muted hover:text-gold">العودة للرئيسية</Link>
    </div>
    <Suspense fallback={<div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-panel p-8 text-center text-muted">جارٍ تحميل نموذج الدخول…</div>}>
      <AuthPanel />
    </Suspense>
  </main>;
}
