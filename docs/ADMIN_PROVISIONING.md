# تجهيز أول حساب إدارة — CAPITAL TAXI

هذا الدليل إجراء يدوي حساس لمنح صلاحية الإدارة. **لا ينفّذ أي تغيير عند حفظه في Git**، ولا توجد في التطبيق آلية تسجيل ذاتي تمنح دور `admin`.

## قبل البدء

1. حدّد مشروع Firebase المقصود من مالكه، ولا تفترض أن مشروعاً قديماً هو المشروع الصحيح.
2. تأكد من أن حساب Google المستخدم مخوّل بإدارة مستخدمي Firebase Authentication في ذلك المشروع.
3. استخدم حساباً شخصياً موثوقاً ومحمياً بالمصادقة متعددة العوامل، وراجع هوية صاحبه خارج التطبيق قبل منحه الصلاحية.
4. لا تستخدم البريد أو الاسم الظاهر وحده لتحديد الحساب. اعتمد UID الذي تعرضه Firebase Authentication بعد التحقق اليدوي.
5. لا تضع Service Account JSON أو private key في Git أو المحادثات أو متغيرات `NEXT_PUBLIC_*`. فضّل Application Default Credentials في بيئة Google موثوقة.

## 1) تحقق من المشروع قبل أي كتابة

في Cloud Shell:

```bash
gcloud projects list
gcloud config set project YOUR_FIREBASE_PROJECT_ID
gcloud config get-value project
```

قارن الناتج حرفياً بمعرّف المشروع الذي قررت تشغيل CAPITAL TAXI عليه. أوقف الإجراء إذا اختلف المشروع أو لم تكن متأكداً.

تأكد من هوية الحساب الحالي:

```bash
gcloud auth list
```

## 2) راجع المستخدم وUID

من Firebase Console افتح Authentication ثم Users، وابحث عن الحساب الذي تم التحقق من صاحبه. انسخ UID يدوياً بعد المراجعة. لا تنشئ حساباً إدارياً عاماً ولا تمنح الصلاحية اعتماداً على اسم مستخدم يرسله المتصفح.

## 3) منح الدور يدوياً وبموافقة صريحة

نفّذ من بيئة موثوقة تحتوي على اعتماد Firebase Admin SDK، وبعد مراجعة المشروع والـ UID. المثال التالي يطلب UID ويعرض هوية الحساب، ثم يتطلب كتابة UID نفسه كتأكيد قبل تغيير الـ custom claims. وهو يحافظ على بقية الـ claims الموجودة.

```bash
export FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
node <<'NODE'
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

(async () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId !== (await import("node:child_process")).execSync("gcloud config get-value project", { encoding: "utf8" }).trim()) {
    throw new Error("Firebase project ID does not match the active gcloud project.");
  }

  const app = initializeApp({ credential: applicationDefault(), projectId });
  const auth = getAuth(app);
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const uid = (await rl.question("Verified Firebase Auth UID: ")).trim();
    if (!uid) throw new Error("UID is required.");

    const user = await auth.getUser(uid);
    console.log({ uid: user.uid, email: user.email ?? "(no email)", disabled: user.disabled, currentClaims: user.customClaims ?? {} });

    if (user.disabled) throw new Error("This account is disabled; stop and review it first.");

    const confirmation = (await rl.question("To grant admin to this exact UID, type the UID again: ")).trim();
    if (confirmation !== uid) throw new Error("Confirmation did not match. No claims changed.");

    await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), role: "admin" });

    const verified = await auth.getUser(uid);
    if (verified.customClaims?.role !== "admin") throw new Error("Post-write verification failed.");
    console.log("Admin claim verified for UID:", verified.uid);
  } finally {
    rl.close();
    await app.delete();
  }
})().catch((error) => {
  console.error("Admin provisioning stopped:", error.message);
  process.exitCode = 1;
});
NODE

unset FIREBASE_PROJECT_ID
```

> لا تشغّل المثال إلا بعد موافقة مالك المشروع والتحقق المستقل من الحساب والـ UID. إذا لم تكن لديك صلاحية إدارة Firebase Authentication، توقّف واطلب من مالك المشروع تنفيذ الإجراء. لا تشارك ناتجاً يحتوي بيانات اعتماد.

## 4) تحديث جلسة المستخدم والتحقق

بعد نجاح الإجراء:

1. سجّل خروج الحساب من التطبيق ثم سجّل الدخول مجدداً حتى يحصل على ID token محدث يتضمن الـ custom claim الجديد.
2. افتح بوابة `/admin` وتحقق من أن الخادم يقرأ الدور من Firebase token الموقّع.
3. اختبر بحساب عميل منفصل أن الوصول إلى واجهات الإدارة مرفوض.
4. احتفظ بسجل داخلي لمن وافق على المنح، وUID، والمشروع، والتاريخ، وسبب المنح. لا تسجل مفاتيح أو tokens.

## حدود هذا الدليل

- هذا الإجراء يضيف `role: "admin"` إلى Firebase custom claims؛ لا ينشئ مستخدم Firebase ولا يغيّر بيانات Firestore أو قواعده.
- لا تنفّذ هذا الإجراء من متصفح العميل أو من API عام.
- نجاح GitHub CI لا يثبت نجاح Firebase Authentication أو صلاحية الاعتمادات في مشروع حي.
- لا يتم نشر التطبيق أو تشغيل Cloud Scheduler أو تعديل بيانات Firebase بمجرد إضافة هذا الملف.
- سحب صلاحية الإدارة يتطلب إجراءً خادمياً موثوقاً لتعديل custom claims، ثم إبطال الجلسات/الرموز وفق سياسة التشغيل والتحقق من زوال الوصول.
