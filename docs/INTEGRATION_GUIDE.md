# 🤖 AI Agent Integration with SkillSwap Video Chat

دليل دمج الوكيل الذكي مع منصة تبادل المهارات

---

## 🎯 ما تم إنشاؤه

```
📁 skill-swap-website-inte/
├── 🐍 livekit-agent.py              # الوكيل الذكي الرئيسي
├── 📄 server/agent-api.ts           # API للتحكم بالوكيل  
├── 📄 server/livekit-token.ts       # تحديث مع endpoints الوكيل
├── 🎨 src/pages/videochat/
│   ├── core/useAIAgent.ts           # Hook React للتحكم
│   └── features/ai-agent/
│       └── index.tsx                 # مكون الزر
└── 📖 AGENT_SETUP.md               # الفرك هنا
```

---

## 🚀 خطوات التفعيل

### 1️⃣ **تثبيت المكتبات**

```bash
# في المشروع الرئيسي
pip install livekit-agents livekit-agents-google-deepgram livekit-agents-openai groq python-dotenv livekit
```

### 2️⃣ **تحديث `.env`**

أضف هذه المتغيرات:

```env
# Agent
LIVEKIT_URL=wss://hn-0itmvhpt.livekit.cloud
LIVEKIT_API_KEY=APIM6MQ87UPG5Cg
LIVEKIT_API_SECRET=8ffbffRbPvLfFoNTEc65EdJoywjfzfPreEpNA8fhyPbXB
GROQ_API_KEY=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
DEEPGRAM_API_KEY=7bc5b29ed4f568b2a462cfb544b49e7a066d065d
OPENAI_API_KEY=sk-proj-...
AGENT_NAME=وكيل ذكي
ROOM_NAME=test-room
```

### 3️⃣ **استخدام Hook في VideoChatPage**

في `src/pages/videochat/VideoChatPage.tsx`:

```tsx
import { useAIAgent } from "./core/useAIAgent";
import AIAgentControl from "./features/ai-agent";

function VideoChatInner({ onExit, userEmail = "" }: VideoChatPageProps) {
  // ... existing code ...
  
  const { agentActive, agentLoading, agentError, startAgent, stopAgent } = useAIAgent();
  const { videoChat } = useVideoChat({...});

  return (
    <div className="video-chat-container">
      {/* ... existing video elements ... */}
      
      {/* Add Agent Control Button */}
      <div className="absolute top-4 right-4 z-50">
        <AIAgentControl
          roomName={videoChat.remotePeerIdentity ? "agent-room" : "default"}
          agentActive={agentActive}
          agentLoading={agentLoading}
          agentError={agentError}
          onStart={startAgent}
          onStop={stopAgent}
        />
      </div>
      
      {/* ... rest of UI ... */}
    </div>
  );
}
```

### 4️⃣ **تفعيل Endpoints في Backend**

الـ endpoints تم إضافتها تلقائياً في `server/livekit-token.ts`:

- `POST /api/agent/start` — بدء الوكيل
- `POST /api/agent/stop` — إيقاف الوكيل

---

## 💬 كيفية الاستخدام

### من الفيديو شات (نقر الزر):
```
👁️ في الموقع:
1. اضغط زر "تفعيل الوكيل" 🤖
2. الوكيل سيدخل الغرفة ويستمع
3. تحدث بالعربية مع الوكيل!
4. اضغط "إيقاف الوكيل" عندما تنتهي
```

### من Terminal (للاختبار):
```bash
python livekit-agent.py room-name
```

---

## 📋 قائمة التحقق المترجمة

- [ ] ✅ تم تثبيت المكتبات
- [ ] ✅ تم إضافة `.env`
- [ ] ✅ تم إضافة Hook في VideoChatPage
- [ ] ✅ تم استيراد AIAgentControl
- [ ] ✅ تم تشغيل `npm run dev`
- [ ] ✅ اختبر الزر في الموقع

---

## 🐛 استكشاف الأخطاء

### ❌ "Agent already running"
الوكيل يعمل بالفعل في الغرفة. أوقفه أولاً.

### ❌ "Failed to start agent"
- تأكد من وجود `livekit-agent.py` في جذر المشروع
- تحقق من Python بـ `python --version`
- تأكد من مفاتيح في `.env`

### ❌ "No such file or directory"
التأكد من مسار الملف (`livekit-agent.py` يجب أن يكون في جذر المشروع)

### ❌ لا يرد الوكيل
- تحقق من الـ logs في Terminal
- تأكد من Groq API Key صحيح
- تحقق من LiveKit URL

---

## 📊 البنية الكاملة

```
Request Flow:
┌─────────────────────────────────────────────────────────────┐
│ User clicks "تفعيل الوكيل" in Browser                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ POST /api/agent/start
┌─────────────────────────────────────────────────────────────┐
│ Backend (Node.js)                                            │
│ - Calls: exec('python livekit-agent.py "room-name"')       │
│ - Tracks process in memory Map                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Python Agent (livekit-agent.py)                              │
│ - Uses: livekit-agents SDK                                  │
│ - Connects to LiveKit Room                                  │
│ - Uses Groq LLM + Deepgram STT + TTS                        │
│ - Listens & responds in real-time                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 الميزات الحالية

✅ **Multimodal**: يسمع ويتحدث  
✅ **Arabic Ready**: دعم العربية الكامل  
✅ **Fast LLM**: Groq السريع جداً  
✅ **Live in Rooms**: يعمل مباشرة مع LiveKit  
✅ **Easy Control**: زر واحد في الموقع  

---

## 🚀 الخطوات التالية (اختياري)

- [ ] أضف نماذج رؤية (Vision) للتحليل  
- [ ] أضف تاريخ محادثات (Conversation History)  
- [ ] أضف إحصائيات التفاعل  
- [ ] أضف خيارات شخصية للوكيل  

---

**الآن الوكيل جاهز للعمل مع موقعك! 🎊**

هل تريد توضيح أي جزء أم تريد خطوات استكمال الدمج؟
