# AI Assistant Setup Guide

## نظرة عامة

تم دمج مساعد AI متقدم في المشروع باستخدام مكتبة `@assistant-ui/react` مع واجهة مستخدم من Shadcn.

## المميزات

- ✅ واجهة مستخدم حديثة وسلسة (Shadcn UI)
- ✅ دعم Markdown و Syntax Highlighting
- ✅ Thread Management (إدارة المحادثات)
- ✅ Model Selector (اختيار النموذج)
- ✅ Streaming Responses (ردود فورية)
- ✅ Attachments Support (دعم المرفقات)
- ✅ Quote & Edit Messages (اقتباس وتعديل الرسائل)
- ✅ Slash Commands (أوامر سريعة)
- ✅ Mentions Support (الإشارات)

## البنية

```
frontend/src/features/ai-assistant/
├── AssistantApp.tsx          # المكون الرئيسي
├── shadcn/
│   └── Shadcn.tsx           # واجهة المستخدم الكاملة
├── ui/
│   ├── FloatingAssistant.tsx # زر الفتح العائم
│   ├── runtime.ts           # إعدادات الاتصال بالـ Backend
│   └── ...                  # مكونات UI أخرى
└── index.ts
```

## كيفية الاستخدام

### 1. الوصول للمساعد

- انقر على زر الـ Bot العائم في أسفل يمين الشاشة
- أو اذهب مباشرة إلى `/assistant`

### 2. إرسال رسالة

- اكتب رسالتك في صندوق الإدخال
- اضغط Enter أو زر الإرسال
- سيتم عرض الرد بشكل فوري (streaming)

### 3. الأوامر المتقدمة

#### Slash Commands (/)
- `/summarize` - تلخيص المحادثة
- `/translate` - ترجمة النص
- `/search` - البحث في الويب
- `/help` - عرض الأوامر المتاحة

#### Mentions (@)
- `@` - للإشارة إلى أدوات أو سياق معين

### 4. اختيار النموذج

- انقر على Model Selector في الأعلى
- اختر النموذج المناسب من القائمة
- النموذج الافتراضي: `anthropic/claude-3.5-haiku`

## الإعدادات المطلوبة

### Backend (.env.local)

```env
# OpenRouter API (مطلوب)
OPENROUTER_API_KEY=your_key_here

# إعدادات اختيارية
FRONTEND_URL=http://localhost:5173
OPENROUTER_APP_NAME=JUST Social AI Assistant
ASSISTANT_DEFAULT_MODEL=anthropic/claude-3.5-haiku
```

### Frontend (.env.local)

```env
# Backend URL (اختياري - الافتراضي: http://localhost:3002)
VITE_BACKEND_URL=http://localhost:3002
```

## API Endpoint

### POST /api/chat

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "مرحباً"
    }
  ],
  "model": "anthropic/claude-3.5-haiku",
  "system": "أنت مساعد ذكي..."
}
```

**Response:**
- Streaming response باستخدام AI SDK Data Stream

## التخصيص

### تغيير الاقتراحات الترحيبية

عدّل `WELCOME_SUGGESTIONS` في `AssistantApp.tsx`:

```typescript
const WELCOME_SUGGESTIONS = [
  {
    title: "عنوان الاقتراح",
    label: "وصف قصير",
    prompt: "النص الكامل للرسالة",
  },
];
```

### تغيير النموذج الافتراضي

عدّل `DEFAULT_MODEL_ID` في `constants.ts`:

```typescript
export const DEFAULT_MODEL_ID = "anthropic/claude-3.5-haiku";
```

### إضافة نماذج جديدة

عدّل `docsModelOptions()` في `model-options.tsx`.

## استكشاف الأخطاء

### المساعد لا يستجيب

1. تحقق من `OPENROUTER_API_KEY` في `.env.local`
2. تأكد من تشغيل الـ Backend على `http://localhost:3002`
3. افتح Console وتحقق من الأخطاء

### خطأ CORS

تأكد من إضافة `http://localhost:5173` في إعدادات CORS في `backend/src/index.ts`.

### Streaming لا يعمل

تحقق من أن الـ Backend يستخدم `result.pipeDataStreamToResponse(res)` بشكل صحيح.

## الموارد

- [assistant-ui Documentation](https://github.com/assistant-ui/assistant-ui)
- [OpenRouter Models](https://openrouter.ai/models)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
