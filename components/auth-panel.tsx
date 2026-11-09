"use client";

import { FormEvent, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { safeInternalRedirectPath } from "@/lib/domain/redirect";

type Mode = "login" | "register";

function destinationFor(role: unknown): string {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  return "/customer";
}

export function AuthPanel() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function establishServerSession() {
    const auth = getFirebaseClientAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("تعذر التحقق من الحساب.");
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("تعذر إنشاء جلسة آمنة. حاول مرة أخرى.");
    const profileResponse = await fetch("/api/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!profileResponse.ok) throw new Error("تعذر التحقق من صلاحيات الحساب بعد إنشاء الجلسة.");
    const profile = await profileResponse.json() as { user?: { role?: string } };
    const requestedNext = safeInternalRedirectPath(searchParams.get("next"), window.location.origin);
    window.location.assign(requestedNext ?? destinationFor(profile.user?.role));
  }

  async function cleanupFailedSignIn() {
    // Clear the server cookie before signing out of Firebase on the client.
    // If the server cannot confirm cookie removal, preserve the client session
    // so the user can retry instead of leaving an invisible server session.
    try {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("session_cookie_cleanup_failed");
      await signOut(getFirebaseClientAuth());
      return true;
    } catch {
      setMessage("تعذر إكمال الدخول أو تنظيف الجلسة بأمان. لم يتم إنهاء جلسة الحساب؛ حاول تسجيل الخروج ثم أعد المحاولة.");
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const auth = getFirebaseClientAuth();
      if (mode === "register") {
        if (name.trim().length < 2) throw new Error("اكتب الاسم بالكامل.");
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      await establishServerSession();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
      const known: Record<string, string> = {
        "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        "auth/email-already-in-use": "هذا البريد مسجل بالفعل. سجل الدخول بدلاً من ذلك.",
        "auth/weak-password": "كلمة المرور يجب ألا تقل عن 6 أحرف.",
        "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
        "auth/popup-closed-by-user": "تم إغلاق نافذة تسجيل Google قبل الإكمال.",
        "auth/unauthorized-domain": "هذا النطاق غير مضاف إلى نطاقات Firebase المسموح بها.",
      };
      setMessage(known[code] ?? (error instanceof Error ? error.message : "تعذر إكمال العملية."));
      await cleanupFailedSignIn();
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setMessage("");
    try {
      const auth = getFirebaseClientAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
      await establishServerSession();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
      setMessage(code === "auth/unauthorized-domain"
        ? "هذا النطاق غير مضاف إلى نطاقات Firebase المسموح بها."
        : error instanceof Error ? error.message : "تعذر تسجيل الدخول باستخدام Google.");
      await cleanupFailedSignIn();
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-[#24351c]/10 bg-white p-6 shadow-[0_24px_70px_rgba(35,55,25,.10)] md:p-8">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[#8cc63f]/40 bg-[#edf6df] font-bold text-[#5e8f25]">CT</span>
        <h1 className="text-2xl font-bold">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">ادخل إلى بوابة تاكسي العاصمة بأمان.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && <label className="block text-sm"><span className="mb-2 block text-neutral-600">الاسم بالكامل</span><input required minLength={2} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="w-full rounded-xl border border-[#24351c]/15 bg-[#f5f7f2] px-4 py-3 outline-none focus:border-[#8cc63f]"/></label>}
        <label className="block text-sm"><span className="mb-2 block text-neutral-600">البريد الإلكتروني</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-[#24351c]/15 bg-[#f5f7f2] px-4 py-3 outline-none focus:border-[#8cc63f]" dir="ltr"/></label>
        <label className="block text-sm"><span className="mb-2 block text-neutral-600">كلمة المرور</span><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-[#24351c]/15 bg-[#f5f7f2] px-4 py-3 outline-none focus:border-[#8cc63f]" dir="ltr"/></label>
        {message && <p role="alert" className="rounded-xl border border-rose-600/20 bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-800">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[#8cc63f] px-4 py-3.5 font-bold text-[#182015] transition hover:bg-[#a2d75c] disabled:cursor-wait disabled:opacity-60">{busy ? "جارٍ التحقق…" : mode==="login" ? "دخول" : "إنشاء الحساب"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-neutral-600"><span className="h-px flex-1 bg-[#24351c]/10"/><span>أو</span><span className="h-px flex-1 bg-[#24351c]/10"/></div>
      <button type="button" disabled={busy} onClick={googleSignIn} className="w-full rounded-xl border border border-[#24351c]/15 bg-white px-4 py-3.5 text-sm font-semibold transition hover:bg-[#edf6df] disabled:opacity-60">المتابعة باستخدام Google</button>
      <p className="mt-6 text-center text-sm text-neutral-600">{mode==="login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setMessage("");}} className="font-bold text-[#5e8f25]">{mode==="login" ? "إنشاء حساب" : "تسجيل الدخول"}</button></p>
      <p className="mt-5 text-center text-[11px] leading-6 text-neutral-600">تسجيل الدخول ينشئ جلسة خادم محمية بملف تعريف ارتباط HttpOnly. لا تشارك كلمة المرور أو رموز التحقق مع أي شخص.</p>
    </section>
  );
}
