import { Suspense } from "react";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return <main className="min-h-screen bg-[#f5f7f2] px-4 py-8 text-[#182015]">
    <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#8cc63f] font-bold text-[#182015]">CT</span><span><b className="block text-sm">تاكسي العاصمة</b><small className="text-[10px] tracking-[.22em] text-[#5e8f25]">CAPITAL TAXI</small></span></Link>
      <Link href="/" className="text-sm text-neutral-600 hover:text-[#5e8f25]">العودة للرئيسية</Link>
    </div>
    <Suspense fallback={<div className="mx-auto max-w-md rounded-3xl border border-[#24351c]/10 bg-white p-8 text-center text-neutral-500">جارٍ تحميل نموذج الدخول…</div>}>
      <AuthPanel />
    </Suspense>
  </main>;
}
