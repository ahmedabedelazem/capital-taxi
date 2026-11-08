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
- `APP_BASE_URL` عنوان HTTPS الأساسي للنشر، ليعيد مجدول التوزيع استدعاء العامل الداخلي

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
| GET/POST | `/api/driver/availability` | قراءة وتغيير حالة التوفر |
| POST | `/api/driver/location` | تحديث موقع السائق المعتمد |
| GET | `/api/driver/offers` | قراءة العروض الموجهة للسائق |
| POST | `/api/trips` | إنشاء رحلة وحساب تقدير السعر خادمياً |
| GET | `/api/trips/:tripId` | قراءة حالة الرحلة للعميل أو السائق المسند أو الإدارة |
| POST | `/api/trips/:tripId/accept` | قبول ذري لعرض رحلة |
| POST | `/api/internal/dispatch` | توزيع مرحلي داخلي للعروض |
| POST | `/api/internal/dispatch/sweep` | فحص الرحلات المستحقة وتشغيل مراحل التوزيع تلقائياً عبر مجدول موثوق |

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
- نموذج العميل متصل بخدمة إنشاء الرحلات وقراءة حالة الرحلة، ويستخدم Google Places لاستخراج إحداثيات العناوين؛ يلزم تهيئة `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` مع تفعيل Maps JavaScript API وPlaces API. خريطة المسار الحية وسجل العميل لم يكتملَا بعد.
- مساحة السائق متصلة بواجهات قراءة/تغيير التوفر، وتحديث الموقع بعد موافقة المتصفح، وجلب العروض وقبولها. سجل الرحلات النشطة والتاريخ لم يكتمل بعد.
- أضيف مسار sweep داخلي ليتولى فحص الرحلات المستحقة وتشغيل مراحل التوزيع؛ يلزمه Cloud Scheduler أو مجدول موثوق خارجي يستدعيه دورياً مع السر المشترك.
- لم يتم نشر التطبيق، ولم يتم تغيير قواعد أو بيانات مشروع Firebase القائم.

## الأمان

- التحقق من الهوية والدور على الخادم.
- لا تفتح قواعد Firebase لتسهيل التطوير.
- لا تسمح للعميل بتعديل المحافظ أو العمولات أو أدوار الإدارة.
- لا تعرض بيانات تواصل العميل قبل إسناد الرحلة.
- لا تجمع موقع السائق إلا عندما يكون متصلاً أو لديه رحلة نشطة، وبموافقة المتصفح.
