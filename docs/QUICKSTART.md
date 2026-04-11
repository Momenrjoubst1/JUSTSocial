# 🎯 SkillSwap LiveKit Quick Start

## ⚡ Quick Setup (5 minutes)

### 1. Get API Keys
- **LiveKit:** https://cloud.livekit.io → Copy API Key, Secret, URL
- **Groq:** https://console.groq.com/keys → Copy API key
- **Supabase:** https://supabase.com/dashboard → Copy URL & anon key

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local and fill in your API keys
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Test
- Open http://localhost:5173
- Backend runs on http://localhost:3001
- Look for "Looking for someone..." status

---

## 📋 What Got Changed

| What | From | To | Status |
|------|------|-----|--------|
| Connection | PeerJS P2P | LiveKit SFU | ✅ |
| Backend | None | Express Token Server | ✅ |
| All Features | Preserved | Working | ✅ |
| UI/Design | Unchanged | 100% Same | ✅ |
| Data Format | Same | Identical | ✅ |

---

## 🧪 Testing Features

```
✅ Video Chat        ✅ Chess Game         ✅ Whiteboard
✅ Text Chat         ✅ Code Editor        ✅ Watch Mode (YouTube)
✅ AI Copilot        ✅ Screen Sharing    ✅ Video Dragging
```

---

## 📁 Files Changed

```
NEW:
  ├── server/livekit-token.ts      (Token API)
  ├── .env.example                  (Config template)
  └── LIVEKIT_MIGRATION_GUIDE.md   (Full docs)

MODIFIED:
  ├── src/pages/videochat/VideoChatPage.tsx (Rewritten for LiveKit)
  └── package.json                  (Added dependencies)
```

---

## 🚀 Development Commands

```bash
npm run dev              # Start client + server
npm run dev:client     # Client only (5173)
npm run dev:server     # Server only (3001)
npm run build          # Production build
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Token API fails | Check server running: `npm run server` |
| No video | Check camera permissions, LiveKit keys |
| No audio | Toggle camera off/on or restart |
| Memory issues | Restart browser or skip connection |

---

## 📚 Full Documentation

See **LIVEKIT_MIGRATION_GUIDE.md** for complete details.

---

## ✨ Key Benefits

- ✅ **More Stable** - Server-mediated SFU instead of P2P
- ✅ **Better Quality** - Optimized bitrate per user
- ✅ **Same Experience** - 100% feature parity
- ✅ **Scalable** - Ready for group calls
- ✅ **Professional** - LiveKit enterprise support

---

**Ready to go!** 🎉 Start with `npm run dev`
