# 🧪 دليل اختبار AI Agent - Testing Guide

## 📋 نظرة عامة

هذا الدليل يشرح كيفية اختبار الـ AI Agent بشكل كامل للتأكد من أنه يعمل فعلياً.

---

## 🎯 ما يقدمه الـ Agent

### الميزات الأساسية
1. **🎤 التعرف على الصوت (STT)**
   - يستمع لصوتك عبر الميكروفون
   - يحول الكلام إلى نص (عربي)
   - يرسل النص للـ LLM

2. **🤖 الذكاء الاصطناعي (LLM)**
   - يفهم السؤال بالعربية
   - يولد رد ذكي ومناسب
   - يحتفظ بسياق المحادثة (آخر 10 رسائل)

3. **📤 البث المباشر (Streaming)**
   - يرسل الرد كلمة بكلمة (real-time)
   - تجربة سلسة مثل ChatGPT

4. **💬 الدردشة النصية**
   - يمكنك إرسال رسائل نصية مباشرة
   - بدون الحاجة للصوت

---

## 🔑 المتطلبات (API Keys)

### 1. LiveKit (إلزامي)
```env
LIVEKIT_URL=wss://your-server.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxx
```

**كيف تحصل عليها:**
1. اذهب إلى https://cloud.livekit.io
2. سجل حساب مجاني
3. أنشئ مشروع جديد
4. انسخ الـ URL, API Key, API Secret

### 2. OpenRouter (إلزامي - للـ LLM)
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
GLM_MODEL=meta-llama/llama-3.3-70b-instruct
```

**كيف تحصل عليها:**
1. اذهب إلى https://openrouter.ai
2. سجل حساب
3. اذهب إلى Keys
4. أنشئ API Key جديد
5. أضف رصيد ($5 كافي للاختبار)

**موديلات مقترحة:**
- `meta-llama/llama-3.3-70b-instruct` - الأفضل (سريع + ذكي)
- `meta-llama/llama-3.1-8b-instruct` - أسرع (أرخص)
- `google/gemini-2.0-flash-exp:free` - مجاني!

### 3. Azure Speech (إلزامي - للـ STT)
```env
AZURE_SPEECH_KEY=xxxxxxxxxxxxx
AZURE_SPEECH_REGION=eastus
```

**كيف تحصل عليها:**
1. اذهب إلى https://portal.azure.com
2. أنشئ حساب مجاني (يعطيك $200 رصيد)
3. ابحث عن "Speech Services"
4. أنشئ Speech resource
5. انسخ Key و Region

---

## 🛠️ الإعداد (Setup)

### 1. تثبيت Python
```bash
# تحقق من الإصدار (يجب أن يكون >= 3.10)
python --version

# إذا لم يكن مثبت، حمّله من:
# https://www.python.org/downloads/
```

### 2. تثبيت التبعيات
```bash
cd backend/agents
pip install -r requirements.txt
```

**إذا واجهت مشاكل:**
```bash
# استخدم virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# أو
venv\Scripts\activate  # Windows

# ثم ثبت
pip install -r requirements.txt
```

### 3. إعداد المتغيرات
أنشئ ملف `.env.local` في جذر المشروع:

```env
# LiveKit
LIVEKIT_URL=wss://your-server.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxx

# OpenRouter (LLM)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
GLM_MODEL=meta-llama/llama-3.3-70b-instruct

# Azure Speech (STT)
AZURE_SPEECH_KEY=xxxxxxxxxxxxx
AZURE_SPEECH_REGION=eastus
```

---

## 🧪 الاختبار

### المستوى 1: اختبار المفاتيح (Keys Test)

#### اختبار LiveKit
```bash
# من جذر المشروع
python -c "
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

url = os.getenv('LIVEKIT_URL')
key = os.getenv('LIVEKIT_API_KEY')
secret = os.getenv('LIVEKIT_API_SECRET')

print('✅ LiveKit URL:', url if url else '❌ Missing')
print('✅ API Key:', key[:10] + '...' if key else '❌ Missing')
print('✅ API Secret:', secret[:10] + '...' if secret else '❌ Missing')
"
```

**النتيجة المتوقعة:**
```
✅ LiveKit URL: wss://your-server.livekit.cloud
✅ API Key: APIxxxxxxx...
✅ API Secret: xxxxxxxxx...
```

#### اختبار OpenRouter
```bash
python -c "
import os
import requests
from dotenv import load_dotenv
load_dotenv('.env.local')

api_key = os.getenv('OPENROUTER_API_KEY')
if not api_key:
    print('❌ OPENROUTER_API_KEY missing')
    exit(1)

# Test API
response = requests.get(
    'https://openrouter.ai/api/v1/models',
    headers={'Authorization': f'Bearer {api_key}'}
)

if response.status_code == 200:
    print('✅ OpenRouter API Key is valid!')
    print(f'✅ Available models: {len(response.json()[\"data\"])}')
else:
    print(f'❌ OpenRouter API Key invalid: {response.status_code}')
"
```

**النتيجة المتوقعة:**
```
✅ OpenRouter API Key is valid!
✅ Available models: 150+
```

#### اختبار Azure Speech
```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

key = os.getenv('AZURE_SPEECH_KEY')
region = os.getenv('AZURE_SPEECH_REGION')

print('✅ Azure Speech Key:', key[:10] + '...' if key else '❌ Missing')
print('✅ Azure Region:', region if region else '❌ Missing')

# Test connection
if key and region:
    import requests
    url = f'https://{region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken'
    headers = {'Ocp-Apim-Subscription-Key': key}
    response = requests.post(url, headers=headers)
    
    if response.status_code == 200:
        print('✅ Azure Speech credentials are valid!')
    else:
        print(f'❌ Azure Speech credentials invalid: {response.status_code}')
"
```

**النتيجة المتوقعة:**
```
✅ Azure Speech Key: xxxxxxxxx...
✅ Azure Region: eastus
✅ Azure Speech credentials are valid!
```

---

### المستوى 2: اختبار الـ Agent (Agent Test)

#### تشغيل الـ Agent
```bash
# من جذر المشروع
python backend/agents/livekit_text_agent.py test-room-123
```

**النتيجة المتوقعة:**
```
[2024-01-XX 10:00:00] INFO - 🔵 Starting agent session...
[2024-01-XX 10:00:01] INFO - ✅ Agent session started successfully!
[2024-01-XX 10:00:01] INFO - 🔵 Sending initial greeting...
[2024-01-XX 10:00:03] INFO - 📤 Queue: processing 'رحب بي بالعربية...' (0 remaining)
[2024-01-XX 10:00:03] INFO - 🧠 Processing reply for: رحب بي بالعربية...
[2024-01-XX 10:00:05] INFO - ✅ Streamed reply complete (45 chars, 2000ms).
[2024-01-XX 10:00:05] INFO - ✅ Queue: done processing, ready for next.
```

**إذا رأيت هذه الرسائل، الـ Agent يعمل! ✅**

#### الأخطاء الشائعة

**خطأ: "Invalid API key"**
```
❌ Error: Invalid API key for OpenRouter
```
**الحل:** تحقق من `OPENROUTER_API_KEY` في `.env.local`

**خطأ: "Connection refused"**
```
❌ Error: Connection refused to LiveKit server
```
**الحل:** تحقق من `LIVEKIT_URL` وأنه يبدأ بـ `wss://`

**خطأ: "Module not found"**
```
❌ ModuleNotFoundError: No module named 'livekit'
```
**الحل:** 
```bash
pip install -r backend/agents/requirements.txt
```

---

### المستوى 3: اختبار من Frontend

#### 1. شغّل الـ Backend
```bash
# Terminal 1
npm run server
```

#### 2. شغّل الـ Frontend
```bash
# Terminal 2
npm run dev:client
```

#### 3. افتح المتصفح
```
http://localhost:5173
```

#### 4. ابدأ Video Chat
1. اضغط على "Start Video Chat"
2. اسمح بالوصول للكاميرا والميكروفون
3. انتظر الاتصال بالغرفة

#### 5. فعّل الـ Agent
1. ابحث عن زر "تفعيل Sigma" أو "AI Agent"
2. اضغط عليه
3. انتظر 2-3 ثواني

**النتيجة المتوقعة:**
- ✅ يظهر مؤشر "Agent Active"
- ✅ ترى رسالة ترحيب بالعربية
- ✅ يمكنك التحدث والـ Agent يرد

#### 6. اختبر الصوت
قل بصوت واضح:
```
"مرحباً، كيف حالك؟"
```

**النتيجة المتوقعة:**
1. ترى النص الذي قلته يظهر (STT)
2. ينتظر الـ Agent ثانية
3. يبدأ الرد يظهر كلمة بكلمة
4. الرد يكون بالعربية ومناسب

#### 7. اختبر الدردشة النصية
إذا كان هناك chat box:
```
اكتب: "ما هي عاصمة مصر؟"
```

**النتيجة المتوقعة:**
- ✅ الـ Agent يرد: "عاصمة مصر هي القاهرة."

---

## 🔍 فحص الـ Logs

### Backend Logs
```bash
# في terminal الـ backend
# ابحث عن:
✅ Agent started for room: session-xxx
```

### Agent Logs
```bash
# في terminal الـ agent
# ابحث عن:
📡 [FINAL] STT Transcript: 'مرحباً'
🧠 Processing reply for: مرحباً
✅ Streamed reply complete
```

### Browser Console
```javascript
// افتح Developer Tools (F12)
// ابحث عن:
[Agent Data] ai_token: {text: "مرحباً", ...}
[Agent Data] ai_done: {stream_id: "abc123"}
```

---

## 📊 معايير النجاح

### ✅ الـ Agent يعمل بشكل صحيح إذا:

1. **الاتصال**
   - ✅ يتصل بـ LiveKit بدون أخطاء
   - ✅ يظهر في الغرفة كـ participant

2. **التعرف على الصوت**
   - ✅ يسمع صوتك
   - ✅ يحول الكلام إلى نص
   - ✅ النص يظهر في الـ UI

3. **الذكاء الاصطناعي**
   - ✅ يفهم السؤال
   - ✅ يولد رد مناسب
   - ✅ الرد بالعربية

4. **البث المباشر**
   - ✅ الرد يظهر كلمة بكلمة
   - ✅ لا يوجد تأخير كبير (< 3 ثواني)

5. **الذاكرة**
   - ✅ يتذكر المحادثة السابقة
   - ✅ يمكنك الإشارة لشيء قلته سابقاً

---

## 🎯 أمثلة للاختبار

### اختبار الفهم
```
أنت: "ما هي عاصمة فرنسا؟"
Agent: "عاصمة فرنسا هي باريس."

أنت: "وماذا عن إيطاليا؟"
Agent: "عاصمة إيطاليا هي روما."
```

### اختبار الذاكرة
```
أنت: "اسمي أحمد"
Agent: "تشرفت بمعرفتك يا أحمد!"

أنت: "ما اسمي؟"
Agent: "اسمك أحمد."
```

### اختبار اللهجة العامية
```
أنت: "شلونك؟" (عراقي)
Agent: "الحمد لله، أنا بخير! كيف حالك؟"

أنت: "إزيك؟" (مصري)
Agent: "تمام الحمد لله! إزيك أنت؟"
```

### اختبار البرمجة
```
أنت: "اكتب لي كود Python لطباعة Hello World"
Agent: "بالتأكيد! إليك الكود:
print('Hello World')"
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا يسمع صوتي
**الأسباب المحتملة:**
1. الميكروفون مغلق في المتصفح
2. Azure Speech credentials خاطئة
3. الـ VAD (Voice Activity Detection) حساس جداً

**الحل:**
```bash
# تحقق من الميكروفون
# في المتصفح: Settings > Privacy > Microphone

# تحقق من Azure credentials
python -c "
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
print(os.getenv('AZURE_SPEECH_KEY'))
"
```

### المشكلة: الردود بطيئة
**الأسباب المحتملة:**
1. الموديل ثقيل
2. الشبكة بطيئة
3. OpenRouter مشغول

**الحل:**
```env
# استخدم موديل أسرع
GLM_MODEL=meta-llama/llama-3.1-8b-instruct

# أو موديل مجاني
GLM_MODEL=google/gemini-2.0-flash-exp:free
```

### المشكلة: الـ Agent يتوقف فجأة
**الأسباب المحتملة:**
1. نفد رصيد OpenRouter
2. Azure Speech quota انتهى
3. LiveKit connection dropped

**الحل:**
```bash
# تحقق من الرصيد
# OpenRouter: https://openrouter.ai/credits
# Azure: https://portal.azure.com

# تحقق من الـ logs
tail -f agent.log
```

---

## 💰 التكاليف المتوقعة

### OpenRouter (LLM)
- **llama-3.3-70b**: ~$0.001 لكل رسالة
- **llama-3.1-8b**: ~$0.0001 لكل رسالة
- **gemini-2.0-flash**: مجاني!

**مثال:** 100 رسالة = $0.10 - $1.00

### Azure Speech (STT)
- **Free Tier**: 5 ساعات/شهر مجاناً
- **Paid**: $1 لكل ساعة

**مثال:** 10 ساعات اختبار = مجاني

### LiveKit
- **Free Tier**: 50 GB/شهر مجاناً
- **Paid**: $0.10 لكل GB

**مثال:** اختبار عادي = مجاني

**إجمالي تكلفة الاختبار: $0 - $5 شهرياً**

---

## ✅ Checklist النهائي

قبل الإنتاج، تأكد من:

- [ ] جميع API Keys صحيحة
- [ ] الـ Agent يبدأ بدون أخطاء
- [ ] التعرف على الصوت يعمل
- [ ] الردود سريعة (< 3 ثواني)
- [ ] الذاكرة تعمل (يتذكر المحادثة)
- [ ] لا توجد memory leaks
- [ ] الـ logs واضحة
- [ ] Error handling يعمل
- [ ] Graceful shutdown يعمل

---

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع الـ logs بعناية
2. تحقق من جميع API Keys
3. جرب موديل مختلف
4. تحقق من الشبكة
5. أعد تشغيل الـ Agent

**الملفات المفيدة:**
- `docs/agents/START_HERE.md` - التوثيق الحالي السريع
- `tools/agents/test_keys.py` - اختبار المفاتيح
- `AI_AGENT_MIGRATION_GUIDE.md` - دليل الانتقال

---

**آخر تحديث:** 2024-01-XX  
**الحالة:** ✅ جاهز للاختبار
