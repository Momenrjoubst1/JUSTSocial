# خطة إعادة ترتيب المشروع

هذه الفكرة صحيحة: الأفضل أن يصبح الجذر واضحاً وفيه مجلدان رئيسيان فقط هما `frontend/` و `backend/`، مع بقاء عدد قليل جداً من الملفات الإدارية في الجذر مثل `.gitignore` و `README.md`.

ملاحظة مهمة: لا يُنصح أن يكون الجذر فيه "فقط" هذان المجلدان حرفياً، لأن ملفات الإدارة والتشغيل الأساسية يجب أن تبقى في الجذر أو تُعاد هيكلتها لاحقاً. الهدف العملي الصحيح هو: جذر نظيف جداً + مجلد `frontend` + مجلد `backend`.

## الهدف النهائي

```text
project-root/
  frontend/
    src/
    public/
    index.html
    package.json
    tsconfig.json
    vite.config.ts
    vitest.config.ts
    tailwind.config.js

  backend/
    src/
      config/
      middleware/
      routes/
      services/
      types/
      utils/
      validators/
    tests/
    supabase/
      functions/
      migrations/
    agents/
    scripts/
    database/
    experiments/

  .gitignore
  .env.example
  README.md
```

## توزيع الملفات الحالية

- `src/` ينتقل إلى `frontend/src/`
- `public/` ينتقل إلى `frontend/public/`
- `index.html` ينتقل إلى `frontend/index.html`
- `vite.config.ts` ينتقل إلى `frontend/vite.config.ts`
- `vitest.config.ts` ينتقل إلى `frontend/vitest.config.ts`
- `tailwind.config.js` ينتقل إلى `frontend/tailwind.config.js`
- `tsconfig.json` ينتقل إلى `frontend/tsconfig.json` ثم يُضاف لاحقاً `backend/tsconfig.json`
- `server/` يتحول إلى `backend/src/`
- `server/tests/` يفضّل فصله إلى `backend/tests/`
- `supabase/` ينتقل إلى `backend/supabase/`
- `agent/` ينتقل إلى `backend/agents/`
- `scripts/` ينتقل إلى `backend/scripts/` إذا كان خاصاً بالخدمات أو الداتا
- `database_setup.sql` و `database_setup_full.sql` ينتقلان إلى `backend/database/`
- `shared/` ينتقل إلى `backend/src/shared/` إذا كان مشتركاً بين الطرفين، أو إلى `frontend/src/shared/` إذا كان استخدامه فرونت فقط. حالياً الأفضل اعتباره `backend/src/shared/` مع alias واضح للطرفين
- `scratch/` ينتقل إلى `backend/experiments/` أو يُحذف إذا كان تجريبياً فقط
- `github-models-gpt-4o/` و `github-models-phi4/` ينتقلان إلى `backend/experiments/ai-models/`
- `app/` و `untitled/` يصنفان أولاً: إذا كانا خارج نطاق المشروع الفعلي يُنقلان إلى `archive/` داخل `backend/experiments/` أو يُخرجان من الريبو

## ما لا يُنقل كجزء من الهيكلة الدائمة

- `node_modules/`
- `dist/`
- `coverage/`
- `build.log`
- `bundle-analysis.html`
- الملفات المؤقتة مثل `temp.css` و `temp_overlay.tsx` وملفات `do_patch*.cjs` و `phase*.cjs` و `patch_routes*.js` و `refactor_imports.js`

هذه إما مخرجات build أو أدوات مؤقتة أو ملفات تنظيف، ويجب إما حذفها من الريبو أو نقلها إلى مجلد مؤقت واضح مثل `backend/experiments/temp/` إذا ما زال لها استخدام فعلي.

## ترتيب التنفيذ المقترح

1. تنظيف الجذر قبل النقل.
2. إنشاء `frontend/` و `backend/` فقط بدون نقل أي ملف حساس مباشرة.
3. نقل الفرونت أولاً لأنه أوضح: `src` و `public` وملفات Vite و Tailwind و HTML.
4. تعديل المسارات في `vite.config.ts` و `tsconfig.json` و `package.json` لتعمل من داخل `frontend/`.
5. نقل الباك: `server` ثم `supabase` ثم `agent` ثم `scripts`.
6. فصل اختبارات الباك إلى `backend/tests/`.
7. تحديد مكان `shared/` النهائي ثم إصلاح alias مثل `@shared/*`.
8. نقل ملفات SQL وملفات التجارب والمشاريع الجانبية إلى `backend/database/` و `backend/experiments/`.
9. تشغيل المشروع بعد كل مرحلة، وليس بعد كل النقل دفعة واحدة.
10. تحديث `.gitignore` و `README.md` وأوامر التشغيل.

## قواعد التنفيذ

- لا يتم النقل الجماعي دفعة واحدة.
- كل مرحلة يجب أن تنتهي بتشغيل ناجح.
- أي مجلد غير واضح وظيفته لا يُدمج مباشرة داخل `frontend` أو `backend` قبل تصنيفه.
- إذا كان المجلد مشروعاً مستقلاً أو تجربة منفصلة، لا يُخلط مع التطبيق الأساسي.
- أي alias قديم مثل `@/*` و `@shared/*` يجب مراجعته مباشرة بعد النقل.

## أوامر التشغيل المستهدفة بعد الهيكلة

يفضل أن يصبح التشغيل بهذا الشكل:

```text
frontend: npm run dev
backend: npm run dev
```

أو من الجذر:

```text
npm run dev:frontend
npm run dev:backend
npm run dev
```

وهذا يعني عملياً أننا سنحتاج غالباً إلى فصل `package.json` الحالي إلى:

- `frontend/package.json`
- `backend/package.json`

أو الإبقاء على `package.json` جذري مؤقتاً فقط لإدارة التشغيل الموحد في مرحلة الانتقال.

## ملاحظات خاصة على هذا المشروع

- المشروع الآن ليس مجرد فرونت + Express فقط، بل فيه أيضاً `supabase` و `agent` وتجارب AI ومجلدات جانبية؛ لذلك إعادة الترتيب يجب أن تعتبر الباك أوسع من مجرد `server/`
- وجود `.env.local` و `.env.example` و `.env` يحتاج إعادة توزيع لاحق بين `frontend/.env*` و `backend/.env*`
- مجلد `shared/` نقطة حساسة لأنه قد يتحول إلى عنق زجاجة إذا لم يُحدد من يملكه وكيف يُستهلك
- مجلد `app/` يبدو منفصلاً عن تطبيق React/Express الحالي ويجب مراجعته قبل دمجه

## القرار العملي

امشِ على هذه القاعدة:

- `frontend` لكل ما يُبنى ويُعرض في المتصفح
- `backend` لكل API و Supabase و agents و SQL و scripts و integrations
- أي شيء غير ذلك يُصنف أولاً قبل نقله

## المرحلة التالية المقترحة

الخطوة الصحيحة التالية هي تنفيذ **المرحلة 1 فقط**:

- إنشاء `frontend/` و `backend/`
- نقل ملفات الفرونت الأساسية
- تحديث إعدادات Vite و TypeScript و scripts
- تشغيل الفرونت والتأكد أن المسارات سليمة

بعدها نبدأ المرحلة 2 الخاصة بالباك.
