"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

type ApplicationStatus = "not_submitted" | "pending" | "rejected" | "approved" | "unknown";
type ApplicationFields = {
  fullName: string;
  phone: string;
  vehicleType: string;
  vehicleModel: string;
  plateNumber: string;
};

const emptyApplication: ApplicationFields = {
  fullName: "",
  phone: "",
  vehicleType: "ملاكي",
  vehicleModel: "",
  plateNumber: "",
};

export function DriverApplicationForm() {
  const [status, setStatus] = useState<ApplicationStatus>("unknown");
  const [application, setApplication] = useState<ApplicationFields>(emptyApplication);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadApplication() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/driver/application", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json() as {
        status?: ApplicationStatus;
        application?: Partial<ApplicationFields> | null;
      };
      if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      if (response.status === 403) throw new Error("التقديم متاح من حساب العميل فقط.");
      if (!response.ok) throw new Error("تعذر تحميل حالة طلب الانضمام.");
      const nextStatus = data.status ?? "unknown";
      setStatus(nextStatus);
      if (data.application) {
        setApplication({
          fullName: data.application.fullName ?? "",
          phone: data.application.phone ?? "",
          vehicleType: data.application.vehicleType ?? "ملاكي",
          vehicleModel: data.application.vehicleModel ?? "",
          plateNumber: data.application.plateNumber ?? "",
        });
      } else {
        setApplication(emptyApplication);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ أثناء تحميل الطلب.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, []);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/driver/application", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      });
      const data = await response.json() as { error?: string };
      if (response.status === 401) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      if (response.status === 403) throw new Error("التقديم متاح من حساب العميل فقط.");
      if (data.error === "already_approved") {
        setStatus("approved");
        throw new Error("حسابك معتمد بالفعل. سجّل الدخول مجدداً لتحديث الصلاحيات.");
      }
      if (data.error === "application_already_pending") {
        setStatus("pending");
        throw new Error("طلبك قيد المراجعة بالفعل.");
      }
      if (data.error === "application_rate_limited") {
        throw new Error("وصلت إلى الحد المسموح لإعادة التقديم: 3 مرات خلال 24 ساعة. حاول لاحقاً.");
      }
      if (data.error === "application_not_resubmittable") {
        throw new Error("يوجد طلب سابق بحالة غير متوقعة. تواصل مع الإدارة لمراجعته.");
      }
      if (!response.ok) throw new Error("تعذر إرسال الطلب. راجع البيانات وحاول مرة أخرى.");
      setStatus("pending");
      setMessage("تم إرسال طلبك بنجاح. ستتم مراجعته من الإدارة، ولن تتمكن من استقبال رحلات قبل الاعتماد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال الطلب.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl md:p-8">
      <div className="mb-7 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h2 className="text-xl font-bold">طلب الانضمام كسائق</h2>
          <p className="mt-1 text-sm text-muted">أرسل بياناتك ومركبتك لمراجعتها من إدارة تاكسي العاصمة.</p>
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-night p-5 text-sm text-muted">جارٍ تحميل حالة طلبك…</p>
      ) : status === "pending" ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
          <Clock3 className="mb-3 text-amber-200" size={28} />
          <h3 className="text-lg font-bold">طلبك قيد المراجعة</h3>
          <p className="mt-2 text-sm leading-7 text-muted">استلمنا بياناتك وهي الآن لدى الإدارة. لا تحتاج إلى إرسال طلب آخر؛ يمكنك العودة لهذه الصفحة لمتابعة الحالة.</p>
          <button type="button" onClick={() => void loadApplication()} className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm hover:border-gold/50">تحديث الحالة</button>
        </div>
      ) : status === "approved" ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-6">
          <CheckCircle2 className="mb-3 text-emerald-300" size={28} />
          <h3 className="text-lg font-bold">تم اعتماد طلبك</h3>
          <p className="mt-2 text-sm leading-7 text-muted">سجّل الخروج ثم ادخل مجدداً حتى يتم تحديث صلاحيات حسابك وفتح بوابة السائق.</p>
          <Link href="/login?next=/driver" className="mt-4 inline-flex rounded-xl bg-gold px-5 py-3 text-sm font-bold text-night">الدخول إلى بوابة السائق</Link>
        </div>
      ) : status === "unknown" ? (
        <div className="rounded-2xl border border-white/10 bg-night p-5 text-sm text-muted">حالة الطلب غير معروفة. حدّث الصفحة أو تواصل مع الإدارة قبل إعادة الإرسال.</div>
      ) : (
        <>
          {status === "rejected" && (
            <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5">
              <AlertCircle className="mb-2 text-rose-200" size={24} />
              <h3 className="font-bold">لم تتم الموافقة على الطلب السابق</h3>
              <p className="mt-1 text-sm leading-7 text-muted">يمكنك مراجعة بياناتك وتعديلها ثم إعادة التقديم.</p>
            </div>
          )}
          {message && <p role="status" className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm leading-6 text-emerald-100">{message}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm leading-6 text-rose-100">{error}</p>}
          <form onSubmit={submitApplication} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted">الاسم بالكامل
              <input required maxLength={100} value={application.fullName} onChange={event => setApplication(current => ({ ...current, fullName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" />
            </label>
            <label className="text-xs text-muted">رقم الهاتف
              <input required type="tel" maxLength={25} value={application.phone} onChange={event => setApplication(current => ({ ...current, phone: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" dir="ltr" />
            </label>
            <label className="text-xs text-muted">نوع المركبة
              <input required maxLength={40} value={application.vehicleType} onChange={event => setApplication(current => ({ ...current, vehicleType: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" />
            </label>
            <label className="text-xs text-muted">موديل المركبة
              <input required maxLength={60} value={application.vehicleModel} onChange={event => setApplication(current => ({ ...current, vehicleModel: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" />
            </label>
            <label className="text-xs text-muted sm:col-span-2">رقم اللوحة
              <input required maxLength={30} value={application.plateNumber} onChange={event => setApplication(current => ({ ...current, plateNumber: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white outline-none focus:border-gold/50" />
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm leading-6 text-rose-100 sm:col-span-2">{error}</p>}
            <button type="submit" disabled={busy} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-night disabled:opacity-50 sm:col-span-2">
              {busy ? "جارٍ إرسال الطلب…" : status === "rejected" ? "إعادة تقديم الطلب" : "إرسال طلب الانضمام"}
            </button>
          </form>
          <p className="mt-4 text-[11px] leading-6 text-muted">لا ترسل مستندات حساسة عبر هذه الاستمارة؛ سيُتاح مسار آمن لمراجعة المستندات عند الحاجة.</p>
        </>
      )}
      {error && (status === "pending" || status === "approved" || status === "unknown") && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
    </section>
  );
}
