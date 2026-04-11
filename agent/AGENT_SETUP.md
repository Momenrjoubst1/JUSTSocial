# LiveKit AI Agent Installation for SkillSwap

## 📦 المكتبات المطلوبة

```bash
pip install livekit-agents livekit-agents-google-deepgram livekit-agents-openai groq python-dotenv livekit
```

## 🔧 الإعداد

### 1. أضف المتغيرات إلى `.env`:

```env
# Agent Config
LIVEKIT_URL=wss://your-livekit-cloud.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
ROOM_NAME=test-room
AGENT_NAME=وكيل ذكي
```

### 2. ضع ملف `livekit-agent.py` في جذر المشروع

### 3. أضف endpoints في `server/livekit-token.ts`:

```typescript
import agentAPI from './agent-api.js';

app.post('/api/agent/start', agentAPI.startAgent);
app.post('/api/agent/stop', agentAPI.stopAgent);
```

## 🚀 التشغيل

### من Terminal:
```bash
python livekit-agent.py room-name
```

### من الموقع (زر في الفيديو شات):
```javascript
const response = await fetch('/api/agent/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomName: 'my-room' })
});
```

## 📝 الميزات

✅ **Multimodal**: صوت + نص  
✅ **Arabic Support**: دعم العربية الكامل  
✅ **Groq LLM**: ذكاء اصطناعي سريع  
✅ **Voice Activity Detection**: اكتشاف الكلام  
✅ **Interruption Handling**: دعم المقاطعة الطبيعية

## 🔍 استكشاف الأخطاء

- **خطأ "module not found"**: `pip install livekit-agents`
- **خطأ Groq**: تحقق من GROQ_API_KEY في .env
- **خطأ LiveKit**: تأكد من LIVEKIT_URL والمفاتيح

## 📊 المراقبة

```bash
# شاهد سجلات الوكيل
python livekit-agent.py room-name 2>&1 | tee agent.log
```

---

الآن الوكيل جاهز للعمل مع موقعك! 🎉
