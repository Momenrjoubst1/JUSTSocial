# 🚀 ابدأ هنا - START HERE

## ⚡ تشغيل سريع في 3 خطوات

### 1️⃣ اختبر المفاتيح
```bash
python agent/test_keys.py
```

**يجب أن ترى:**
```
✅ All tests passed! Agent is ready to run.
```

**إذا فشل الاختبار:**
- افتح `.env.local` وتأكد من جميع المفاتيح
- راجع `agent/TESTING_GUIDE.md` للمساعدة

---

### 2️⃣ شغّل الـ Agent
```bash
python agent/livekit_text_agent.py test-room-123
```

**يجب أن ترى:**
```
[INFO] ✅ Agent session started successfully!
[INFO] 🔵 Sending initial greeting...
```

**إذا ظهرت أخطاء:**
- تحقق من الـ logs
- راجع `agent/TESTING_GUIDE.md` قسم "استكشاف الأخطاء"

---

### 3️⃣ اختبر من الموقع

#### Terminal 1: Backend
```bash
npm run server
```

#### Terminal 2: Frontend
```bash
npm run dev:client
```

#### المتصفح
```
http://localhost:5173
```

1. ابدأ Video Chat
2. اضغط "تفعيل Sigma"
3. تكلم: "مرحباً، كيف حالك؟"
4. انتظر الرد!

---

## 📚 الملفات المهمة

| الملف | الوصف |
|-------|-------|
| `test_keys.py` | اختبار المفاتيح |
| `TESTING_GUIDE.md` | دليل الاختبار الشامل |
| `ARABIC_GUIDE.md` | دليل بالعربية |
| `README.md` | التوثيق الكامل |
| `QUICKSTART.md` | البدء السريع |

---

## 🆘 مشاكل شائعة

### "Module not found"
```bash
pip install -r agent/requirements.txt
```

### "Invalid API key"
```bash
# تحقق من .env.local
cat .env.local | grep API_KEY
```

### "Connection refused"
```bash
# تحقق من LIVEKIT_URL
cat .env.local | grep LIVEKIT_URL
```

---

## ✅ Checklist

- [ ] Python >= 3.10 مثبت
- [ ] المكتبات مثبتة (`pip install -r requirements.txt`)
- [ ] `.env.local` موجود وممتلئ
- [ ] `test_keys.py` نجح
- [ ] الـ Agent يبدأ بدون أخطاء

---

**جاهز؟ ابدأ الآن! 🚀**
