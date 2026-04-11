# تحليل مشاكل الموقع - تحديث 2026-04-10

هذا التقرير يعتمد على فحص حي للمشروع الآن (وليس على التقارير القديمة فقط).

## نطاق الفحص
- فحص المحرر/TypeScript diagnostics.
- تشغيل الاختبارات: `npx vitest run --reporter=verbose`.
- تشغيل البناء الإنتاجي: `npm run build`.
- مراجعة الملفات المرتبطة بالأخطاء مباشرة.

## ملخص سريع
- الاختبارات: 4 ملفات اختبارات فاشلة، و 66 اختبار ناجح.
- البناء: ناجح، مع تحذيرات أداء/تجزئة.
- TypeScript: لا أخطاء منع بناء، لكن يوجد تحذير deprecation مهم في الإعدادات.

---

## المشاكل الأهم (مرتبة بالأولوية)

## 1) فشل 4 Suites في الاختبارات بسبب Mock ناقص للـ logger
- الشدة: عالية
- الدليل:
  - `server/tests/setup.ts:63` يقوم بعمل mock لـ `../utils/logger` ويُرجع `logger` فقط.
  - `server/middleware/auth.middleware.ts:5` يستخدم `createLogger`.
  - `server/utils/logger.ts:5` يصدّر `createLogger` فعلا.
  - نتيجة الاختبار: Vitest خطأ مباشر: No "createLogger" export is defined on the "../utils/logger" mock.
- الأثر:
  - كسر اختبارات middleware والتكامل، وإخفاء مشاكل حقيقية خلف خطأ mocking.
  - الملفات الفاشلة حاليا:
    - `server/tests/middleware/auth.middleware.test.ts`
    - `server/tests/integration/ban-instant.test.ts`
    - `server/tests/integration/ice.routes.test.ts`
    - `server/tests/integration/moderation.routes.test.ts`

## 2) مشكلة Rate Limiter مع IPv6 (تحذير أمني/وظيفي)
- الشدة: عالية
- الدليل:
  - `server/middleware/rate-limiters.ts:129`
  - keyGenerator الحالي: `(req as any).user?.id ?? req.ip ?? 'unknown'`
  - أثناء الاختبارات ظهر ValidationError من express-rate-limit: `ERR_ERL_KEY_GEN_IPV6`.
- الأثر:
  - احتمال bypass جزئي للـ rate-limit لبعض عناوين IPv6.
  - ضوضاء/فشل في اختبارات التكامل، ومخاطرة في السلوك تحت الضغط.

## 3) تحذير TypeScript deprecation في إعدادات المشروع
- الشدة: متوسطة
- الدليل:
  - `tsconfig.json:24` يحتوي `baseUrl`.
  - `tsconfig.json:25` يحتوي `ignoreDeprecations: "5.0"`.
  - Diagnostic الحالي يطلب الرفع إلى `"6.0"` لتفادي توقف السلوك في TypeScript 7.
- الأثر:
  - ليس فشل بناء حاليا، لكنه دين تقني سيظهر بقوة عند ترقية TypeScript.

## 4) تحذير تجزئة غير فعالة في الشات (dynamic + static import لنفس الموديول)
- الشدة: متوسطة
- الدليل:
  - static import في `src/features/chat/hooks/useOfflineSync.ts:3`.
  - dynamic imports في:
    - `src/features/chat/components/molecules/ChatInput.tsx:55`
    - `src/features/chat/components/molecules/ChatInput.tsx:70`
    - `src/features/chat/components/molecules/ChatInput.tsx:245`
    - `src/features/chat/hooks/useSendMessage.ts:215`
    - `src/features/chat/hooks/useSendMessage.ts:242`
  - build warning: module لن ينتقل إلى chunk منفصل.
- الأثر:
  - فقدان جزء من فائدة lazy-loading.
  - تحميل أكبر من اللازم في مسارات الشات.

## 5) أحجام chunks كبيرة في البناء الإنتاجي
- الشدة: متوسطة
- الدليل (من build الأخير):
  - `dist/assets/vendor-3d-D_zK5Wry.js` ~ 1,196 KB
  - `dist/assets/vendor-ui-motion-D4iZSyBs.js` ~ 732 KB
  - تحذير Vite: Some chunks are larger than 600 kB after minification.
- الأثر:
  - تحميل أولي أبطأ خصوصا على شبكات الجوال.
  - ارتفاع TTI/LCP في الصفحات الثقيلة.

---

## نتيجة الفحص بالأرقام
- Tests: 4 failed suites, 5 passed files, 66 passed tests.
- Build: PASS (Exit 0) مع تحذيرات أداء.
- Type diagnostics: تحذير إعدادات واحد (deprecation) ظاهر حاليا.

## أولويات التنفيذ المقترحة
1. إصلاح mock الـ logger في `server/tests/setup.ts` ليشمل `createLogger`.
2. تعديل keyGenerator في `server/middleware/rate-limiters.ts` ليتوافق مع إرشاد IPv6 الخاص بـ express-rate-limit.
3. تحديث `ignoreDeprecations` أو خطة migration لـ TypeScript 7 في `tsconfig.json`.
4. توحيد استراتيجية استيراد `draftQueueService` (إما static أو dynamic حسب قرار الأداء).
5. تحسين chunking (manualChunks + مزيد من lazy loading لكتل 3D/UI الثقيلة).
