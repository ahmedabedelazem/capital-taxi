# تشغيل مجدول توزيع الرحلات

> هذا الدليل يجهز Cloud Scheduler فقط. لا تشغّل الأوامر قبل نشر نسخة التطبيق التي تحتوي على المسار `/api/internal/dispatch/sweep` وضبط أسرار الخادم. لا تضع السر في Git أو في ملفات المشروع.

## 1) تأكد من مشروع Google Cloud

من Cloud Shell اختر المشروع المقصود صراحةً، ثم تحقق من المعرف قبل أي تغيير:

```bash
gcloud projects list
gcloud config set project YOUR_GOOGLE_CLOUD_PROJECT_ID
gcloud config get-value project
```

يجب أن يكون المشروع هو نفسه الذي يستضيف بيئة التطبيق وFirestore المقصودة. لا تفترض أن مشروعاً قديماً هو المشروع الصحيح.

## 2) متغيرات بيئة التطبيق

اضبط في منصة استضافة التطبيق، من إعدادات الأسرار الخادمية:

- `APP_BASE_URL`: عنوان النشر الأساسي بصيغة HTTPS، دون مسار.
- `DISPATCH_WORKER_SECRET`: سر عشوائي قوي لا يقل عن 32 حرفاً، مطابق تماماً لقيمة ترويسة المجدول.

مثال لتوليد سر محلياً (لا ترسله في المحادثات ولا تضفه إلى Git):

```bash
openssl rand -hex 32
```

يجب أن تكون إعدادات Firebase Admin متاحة للتطبيق أيضاً. أعد نشر التطبيق بعد ضبط المتغيرات.

## 3) نشر فهارس Firestore المطلوبة

من مجلد المشروع الذي يحتوي على `firebase.json`:

```bash
firebase deploy --only firestore:indexes
```

انتظر حتى تكتمل الفهارس قبل تشغيل المجدول. الاستعلامات الجديدة تعتمد على فهرسي `trips(status, createdAt)` و`trips(status, lastDispatchAt)`.

## 4) إنشاء مهمة كل دقيقة

فعّل خدمة Cloud Scheduler:

```bash
gcloud services enable cloudscheduler.googleapis.com
```

ثم أدخل عنوان التطبيق والمنطقة والسر في جلسة Cloud Shell. تجنب حفظ السر في ملفات أو أوامر موثقة:

```bash
read -r -p "APP_BASE_URL (https://...): " APP_BASE_URL
read -r -p "SCHEDULER_REGION: " SCHEDULER_REGION
read -r -s -p "DISPATCH_WORKER_SECRET: " DISPATCH_WORKER_SECRET
echo
```

أنشئ المهمة:

```bash
gcloud scheduler jobs create http capital-taxi-dispatch-sweep \
  --location="$SCHEDULER_REGION" \
  --schedule="* * * * *" \
  --time-zone="Africa/Cairo" \
  --uri="${APP_BASE_URL%/}/api/internal/dispatch/sweep" \
  --http-method=POST \
  --update-headers="x-dispatch-secret=${DISPATCH_WORKER_SECRET}" \
  --attempt-deadline=60s \
  --max-retry-attempts=3 \
  --max-backoff=300s
```

بعد نجاح الإنشاء، امسح المتغير من جلسة Shell:

```bash
unset DISPATCH_WORKER_SECRET
```

**تنبيه أمني:** ترويسة السر مخزنة ضمن إعداد المهمة؛ قيّد صلاحيات IAM على Cloud Scheduler ولا تمنح صلاحية عرض أو تعديل المهمة إلا للمشغلين الموثوقين. لا تستخدم هذا النمط إذا كانت سياسة مؤسستك تمنع تخزين سر مشترك في إعداد المهمة؛ عندها نحتاج نقل المصادقة إلى OIDC والتحقق منه في التطبيق.

## 5) تحقق تشغيلي

اعرض المهمة وتاريخ تشغيلها:

```bash
gcloud scheduler jobs describe capital-taxi-dispatch-sweep --location="$SCHEDULER_REGION"
gcloud scheduler jobs run capital-taxi-dispatch-sweep --location="$SCHEDULER_REGION"
```

افحص سجلات Cloud Scheduler واستجابة التطبيق. الاستجابة الناجحة من العامل تتضمن `scanned`, `due`, `processed`, `deferred`, `failed`, و`truncated`.

لا تعتبر الاختبار ناجحاً لمجرد إنشاء المهمة: يلزم التأكد من أن استجابة HTTP ناجحة، وأن إعدادات `config/dispatch` مكتملة، وأن هناك سائقين معتمدين متصلين بموقع حديث. لا تنشئ رحلات أو تعدّل بيانات حقيقية بغرض الاختبار دون موافقة تشغيلية.

## ملاحظات تشغيلية

- الفحص يعمل كل دقيقة؛ مدة العرض المحددة في إعدادات التوزيع يجب أن تكون 15–300 ثانية.
- كل دورة تعالج حتى 20 رحلة، على دفعات متوازية من خمس رحلات.
- الاستعلام يختار الرحلات المستحقة زمنياً من الأقدم، بدلاً من قراءة أول مجموعة عشوائية ثم اكتشاف أنها غير مستحقة؛ هذا يقلل احتمال تأخر الرحلات الأحدث في قائمة الانتظار.
- المسار الداخلي يرفض الطلبات التي لا تحمل السر الصحيح، ولا يُستدعى من واجهة العميل أو السائق.
