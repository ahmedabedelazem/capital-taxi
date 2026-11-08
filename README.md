# تاكسي العاصمة | CAPITAL TAXI

منصة نقل عربية مخصصة للعريش وشمال سيناء، بثلاث بوابات: العميل والسائق والإدارة.

## التقنية

- Next.js App Router + TypeScript
- Tailwind CSS وواجهة عربية RTL متجاوبة
- Firebase Authentication للمتصفح وFirebase Admin للخادم
- Firestore كعقد بيانات للخدمات الخادمية
- هوية Premium Dark Luxury

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح http://localhost:3000.

## المسارات

- `/` الصفحة الرئيسية
- `/login` تسجيل الدخول وإنشاء الحساب بالبريد أو Google
- `/customer` بوابة العميل
- `/driver` بوابة السائق
- `/admin` بوابة الإدارة

## إعداد البيئة

املأ قيم Firebase Web SDK العامة في `.env.local`:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

قيّد مفتاح Firebase API في Google Cloud بنطاقات الموقع وواجهات API المطلوبة. القيم العامة ليست بديلاً عن قواعد Firebase الآمنة.

على الخادم فقط، أضف:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` أو Application Default Credentials
- `DISPATCH_WORKER_SECRET` سراً عشوائياً لا يقل عن 32 حرفاً

لا ترفع ملفات service account أو أسراراً أو ملفات `.env.local` إلى Git.

## المصادقة

- `POST /api/auth/session`: يستبدل Firebase ID token بجلسة خادمية في Cookie من نوع HttpOnly.
- `DELETE /api/auth/session`: ينهي الجلسة.
- `GET /api/me`: يعيد هوية المستخدم والدور بعد التحقق الخادمي.
- أدوار الإدارة والسائق تعتمد على Firebase custom claims موقعة؛ ولا يجوز قبول role من جسم طلب العميل.
- اعتماد السائق يتطلب claim موقّعاً وسجل طلب اعتماد خادمي بحالة `approved`.

## واجهات التشغيل الخادمية المضافة

| Method | Route | الغرض |
| --- | --- | --- |
| POST | `/api/driver/application` | تقديم طلب انضمام سائق |
| GET | `/api/admin/drivers` | عرض طلبات السائقين للإدارة |
| PATCH | `/api/admin/drivers/:uid/decision` | اعتماد أو رفض طلب سائق |
| POST | `/api/driver/availability` | تغيير حالة التوفر |
| POST | `/api/driver/location` | تحديث موقع السائق المعتمد |
| GET | `/api/driver/offers` | قراءة العروض الموجهة للسائق |
| POST | `/api/trips` | إنشاء رحلة وحساب تقدير السعر خادمياً |
| POST | `/api/trips/:tripId/accept` | قبول ذري لعرض رحلة |
| POST | `/api/internal/dispatch` | توزيع مرحلي داخلي للعروض |

## إعدادات Firestore المطلوبة قبل التشغيل

- `config/tripPricing`: تعريفة معتمدة من الإدارة ونطاق الخدمة.
- `config/dispatch`: أنصاف أقطار مراحل التوزيع ومدة العرض وحد أقصى للعروض.
- `driverApplications/{uid}`: طلبات السائقين ومراجعتها.
- `drivers/{uid}`: حالة التوفر وآخر موقع بموافقة السائق.
- `trips/{tripId}` و`tripOffers/{tripId}_{driverUid}`: الرحلات والعروض.
- `tripIdempotency/{hash}`: منع إنشاء رحلات مكررة عند إعادة المحاولة.

هذه أسماء ومواصفات تعاقدية فقط؛ لا تنشئ هذه النسخة بيانات تشغيلية في Firebase ولا تنفذ ترحيل بيانات.

## حدود المرحلة الحالية

- واجهة تسجيل الدخول والـ APIs الخادمية أضيفت للمستودع، لكنها تحتاج إعداد Firebase في بيئة التشغيل والتحقق من CI قبل النشر.
- نموذج العميل الحالي لا يزال معاينة محلية؛ لم يُربط بعد بإنشاء الرحلات أو خرائط Google ولا يدعم تحويل عناوين نصية إلى إحداثيات.
- واجهة السائق لم تُربط بعد بواجهات التوفر والموقع والعروض.
- عامل التوزيع المرحلي API داخلي؛ يلزمه مجدول موثوق يستدعي المراحل بالتوقيت الصحيح.
- لم يتم نشر التطبيق، ولم يتم تغيير قواعد أو بيانات مشروع Firebase القائم.

## الأمان

- التحقق من الهوية والدور على الخادم.
- لا تفتح قواعد Firebase لتسهيل التطوير.
- لا تسمح للعميل بتعديل المحافظ أو العمولات أو أدوار الإدارة.
- لا تعرض بيانات تواصل العميل قبل إسناد الرحلة.
- لا تجمع موقع السائق إلا عندما يكون متصلاً أو لديه رحلة نشطة، وبموافقة المتصفح.
