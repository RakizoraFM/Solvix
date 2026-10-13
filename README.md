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
