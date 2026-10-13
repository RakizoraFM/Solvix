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
