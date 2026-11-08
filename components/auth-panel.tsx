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
    if (!profileResponse.ok) throw new Error("تم تسجيل الدخول لكن تعذر تحميل صلاحيات الحساب.");
    const profile = await profileResponse.json() as { user?: { role?: string } };
    const requestedNext = searchParams.get("next");
    const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : destinationFor(profile.user?.role);
    window.location.assign(safeNext);
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
      try { await signOut(getFirebaseClientAuth()); } catch { /* Keep the original sign-in error. */ }
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
      try { await signOut(getFirebaseClientAuth()); } catch { /* Keep the original error. */ }
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl md:p-8">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-gold/40 bg-gold/10 font-bold text-gold">CT</span>
        <h1 className="text-2xl font-bold">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">ادخل إلى بوابة تاكسي العاصمة بأمان.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && <label className="block text-sm"><span className="mb-2 block text-muted">الاسم بالكامل</span><input required minLength={2} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="w-full rounded-xl border border-white/10 bg-night px-4 py-3 outline-none focus:border-gold/60"/></label>}
        <label className="block text-sm"><span className="mb-2 block text-muted">البريد الإلكتروني</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-white/10 bg-night px-4 py-3 outline-none focus:border-gold/60" dir="ltr"/></label>
        <label className="block text-sm"><span className="mb-2 block text-muted">كلمة المرور</span><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-white/10 bg-night px-4 py-3 outline-none focus:border-gold/60" dir="ltr"/></label>
        {message && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-xs leading-6 text-rose-200">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-gold px-4 py-3.5 font-bold text-night transition hover:bg-[#e8c77e] disabled:cursor-wait disabled:opacity-60">{busy ? "جارٍ التحقق…" : mode==="login" ? "دخول" : "إنشاء الحساب"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-white/10"/><span>أو</span><span className="h-px flex-1 bg-white/10"/></div>
      <button type="button" disabled={busy} onClick={googleSignIn} className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60">المتابعة باستخدام Google</button>
      <p className="mt-6 text-center text-sm text-muted">{mode==="login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setMessage("");}} className="font-bold text-gold">{mode==="login" ? "إنشاء حساب" : "تسجيل الدخول"}</button></p>
      <p className="mt-5 text-center text-[11px] leading-6 text-muted">تسجيل الدخول ينشئ جلسة خادم محمية بملف تعريف ارتباط HttpOnly. لا تشارك كلمة المرور أو رموز التحقق مع أي شخص.</p>
    </section>
  );
}
