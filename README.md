# Solvix — جرد أصول المدارس

Solvix (نوفارو سابقاً) تطبيق لجرد أصول المدارس في **ملف HTML واحد** (`index.html`)، بنفس شكل تطبيق Laravel الأصلي:
- **صفحات الفني** (عربي/English): الدخول بالرقم الوظيفي وكلمة المرور، ثم المدرسة وصورتها، ثم الدور والغرفة، ثم بيانات الأصل بالصورة والموقع على الخريطة.
- **لوحة الإدارة** (`#admin`، قالب AdminLTE 4): المؤشرات، والأصول المجمّعة، والمدارس، والفنيون، وقوائم الأصول والغرف، والمستخدمون، وتصدير Excel، وسجل التعديلات.

## قاعدة البيانات (مستقلة)
مشروع Supabase خاص بـ Solvix.

1. أنشئ المشروع، ثم شغّل `solvix_setup.sql` كاملاً في SQL Editor. التشغيل آمن للتكرار.
2. **أول مدير:** من Authentication ← Users ← Add user، فعّل «Auto Confirm User». أول حساب يُنشأ يصبح المدير.
3. **ربط الموقع:** ضع رابط المشروع والمفتاح العام (publishable / anon) في `SOLVIX_CFG` داخل `src/parts/cloud.js` ثم أعد البناء. أو اربط كل جهاز من «Data & Backup ← Connect». **لا تضع مفتاح service_role أبداً.**
4. من الموقع: Dashboard ← «Load the built-in lists»، ثم Employees ← «Create logins» لإنشاء كلمات مرور الفنيين.

ما يسجله الفني بلا إنترنت يبقى على جهازه ويُرسل تلقائياً عند عودة الاتصال. والرابط `index.html?local` يعمل بدون سحابة، والبيانات فيه على الجهاز فقط.

## رسائل الاشتراك وطلب التجديد (NV29)
1. شغّل `solvix_setup.sql`، ثم **أعد نشر** الدالة `solvix-mail` بالمحتوى الجديد من `supabase/functions/solvix-mail/index.ts`.
2. **مهم:** عطّل «Verify JWT» لهذه الدالة (في إعدادات الدالة، أو `supabase functions deploy solvix-mail --no-verify-jwt`)؛ الدالة تتحقق من المستخدم بنفسها.
3. التذكير (قبل 14 و7 أيام ويوم واحد، ومرة عند الانتهاء) يُرسل لحسابات «مالك المشروع» مع نسخة لحسابات Admin، مرة واحدة لكل مرحلة. يُفحص تلقائياً عند فتح أي حساب إداري للمنصة مرة يومياً.
4. اختياري — فحص يومي مضمون حتى لو لم يفتح أحد المنصة: أضف في Edge Functions ← Secrets القيمة `CRON_SECRET` (كلمة سرية من اختيارك)، ثم شغّل في SQL Editor (بعد تفعيل الإضافتين pg_cron و pg_net):
```sql
select cron.schedule('solvix-sub-reminder', '0 6 * * *', $$
  select net.http_post(url := 'https://izheuautphutjlxnfckb.supabase.co/functions/v1/solvix-mail',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','ضع CRON_SECRET هنا'),
    body := '{"kind":"sub_reminder"}'::jsonb) $$);
```
5. «طلب تجديد» (للمالك ومدير المشروع): من «الإعدادات ← الاشتراك والاستخدام» أو من شريط التنبيه؛ يصل بريد لكل حسابات Admin، طلب واحد كل 12 ساعة.

## مدير النظام (Admin) والاشتراك والصلاحيات (NV28)
1. شغّل `solvix_setup.sql`. أقدم حساب «مالك مشروع» (حساب من أعدّ Solvix) يصبح **Admin** تلقائياً إذا لم يوجد Admin. في مشروع جديد: أول حساب يُنشأ هو Admin.
   لجعل حساب آخر Admin يدوياً: `update public.nv_staff set role = 'sysadmin' where email = 'البريد';`
2. من «الإعدادات ← إدارة النظام (Admin)» (يظهر لـ Admin فقط): بيانات الاشتراك (الجهة، الباقة، البداية، الانتهاء، أيام السماح)، التمديد السريع، الحدود (المدارس، مشرفو الميدان، حسابات الإدارة، الأصول)، حسابات Admin، وصلاحيات كل مستخدم ومشرف ميدان.
3. بعد تاريخ الانتهاء + أيام السماح يصبح النظام **للقراءة فقط** لكل المستخدمين ومشرفي الميدان (تفرضه قاعدة البيانات)، ولا يُحذف شيء؛ Admin غير مقيّد. التمديد يعيد كل شيء فوراً.
4. مالك المشروع لا يرى حسابات Admin ولا يستطيع تعديل الاشتراك أو الصلاحيات.

## مواقع المدارس ومراجعة الصور (NV26)
1. شغّل `solvix_setup.sql` بعد كل تحديث (يضيف إحداثيات المدارس، والمسافة، وحقول المراجعة).
2. أضف إحداثيات كل مدرسة من «تعديل مدرسة» (انسخها من خرائط Google)، أو في ملف استيراد المدارس بعمودي `Latitude` و `Longitude`. بدونها تُقاس المسافة من متوسط مواقع الأصول المسجلة في المدرسة.
3. المسافة المسموحة وخيار المنع في «الإعدادات العامة ← التحقق من موقع التصوير» (الافتراضي 300 متر، تنبيه فقط).
4. قراءة لوحة البيانات تحمّل Tesseract.js وبيانات اللغة الإنجليزية من jsdelivr عند أول استخدام (قرابة 7 م.ب)، ثم يحفظها المتصفح.

## التطوير
- **الكود:** في `src/parts/`. البناء بالأمر `cd src && python3 build.py`، ويكتب `index.html`.
- **الاختبارات:**
  - `tests/offline_test.js` و`tests/cloud_test.js`: Playwright، والثاني مع خادم Supabase وهمي. يحتاجان `python3 -m http.server 8766` في جذر المستودع.
  - `tests/rls.sql`: صلاحيات قاعدة البيانات على PostgreSQL مع `tests/supabase_stub.sql`.
- **النشر:** GitHub Pages من الفرع `main`، المجلد الجذر.

## تفعيل إرسال البريد عند إنهاء جرد مدرسة (NV18)
الصفحة لا ترسل بريداً بنفسها؛ ترسله دالة `supabase/functions/solvix-mail` على Supabase عبر خدمة **Resend**.
1. أنشئ حساباً مجانياً على https://resend.com ، وأضف نطاقك (Domain) وأكّده، أو استخدم `onboarding@resend.dev` للتجربة (يرسل لبريدك فقط).
2. من Resend ← API Keys أنشئ مفتاحاً.
3. في Supabase (مشروع Solvix) ← **Edge Functions** ← **Deploy a new function** ← **Via Editor**، سمِّها `solvix-mail` والصق محتوى `supabase/functions/solvix-mail/index.ts` ← Deploy.
4. Edge Functions ← **Secrets**: أضف `RESEND_API_KEY` = المفتاح، و `MAIL_FROM` = مثل `Solvix <reports@your-domain.com>`.
5. في Solvix ← الإعدادات ← «بريد المستلمين» اكتب العناوين، ثم اضغط «إرسال رسالة تجريبية».
المستلمون: بريد مشرف الميدان + «بريد المستلمين». المرفق: Excel فيه «البيانات» و«صور الأصول» (صورة + QR + رقم الأصل).

## استعادة كلمة المرور (NV17)
في Supabase ← Authentication ← **URL Configuration**: اجعل Site URL = `https://rakizorafm.github.io/Solvix/` وأضفه في Redirect URLs.

## بيانات تجريبية لتجربة المنصة
1. بعد تشغيل `solvix_setup.sql` و«تحميل القوائم الجاهزة»، شغّل `solvix_demo.sql` في SQL Editor.
2. الحسابات (كلمة المرور لكلها `Solvix@2026`):
   - `owner@solvix-demo.test` مالك المشروع · `manager@solvix-demo.test` مدير المشروع · `coordinator@solvix-demo.test` منسق المشروع
   - `field1@solvix-demo.test` · `field2@solvix-demo.test` · `field3@solvix-demo.test` مشرفو ميدان
3. 6 مدارس «DEMO-SCH-01…06» (3 مكتملة، 1 قيد الجرد، 1 لم تبدأ، 1 غير نشطة) و39 سجل جرد من دليل الأصول.
4. للحذف بعد التجربة: `solvix_demo_reset.sql` (لا يمس البيانات الحقيقية).
