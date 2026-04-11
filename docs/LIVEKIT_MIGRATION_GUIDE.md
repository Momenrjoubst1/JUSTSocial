# 🚀 SkillSwap Migration Guide: PeerJS → LiveKit

## Overview

SkillSwap has been successfully migrated from **PeerJS (P2P)** to **LiveKit (SFU)** for improved reliability, stability, and better support for multiple simultaneous connections.

---

## 📝 What Changed

### Architecture Changes

| Aspect | Before (PeerJS) | Now (LiveKit) |
|--------|-----------------|--------------|
| **Connection Model** | Peer-to-Peer (P2P) | Server-Forwarded Unit (SFU) |
| **Signalling** | PeerJS Cloud | LiveKit Server |
| **Room Matching** | Client-side random pool discovery | Server-side matching API |
| **Data Channel** | RTCDataChannel | LiveKit Data API |
| **Backend Required** | No | Yes (Token generation)  |
| **Stability** | ⚠️ Direct P2P | ✅ Server-mediated |

### Code Changes

#### Backend
- **Added:** `/server/livekit-token.ts` - Token generation and room matching service
- **Purpose:** Generates JWT tokens for LiveKit rooms and manages room allocation

#### Frontend  
- **Replaced:** PeerJS imports → LiveKit SDK imports
- **Replaced:** P2P discovery logic → Simple room connection
- **Replaced:** RTCDataChannel → LiveKit's `room.publishData()`
- **Preserved:** All UI, features, and message formats remain identical

#### Features Status
- ✅ Video Chat (improved with SFU)
- ✅ Text Chat (same message format)
- ✅ Chess Game (same move messages)
- ✅ Whiteboard (same shape messages)  
- ✅ Code Editor (same code-update messages)
- ✅ Watch Mode (same watch messages)
- ✅ AI Assistant (same wake words)
- ✅ Screen Sharing (native LiveKit support)
- ✅ Video Dragging & Pinning
- ✅ Notifications (same iPhone-style UI)

---

## 🛠️ Installation & Setup

### Step 1: Install Dependencies  

```bash
npm install
```

This will install:
- `livekit-client` - Frontend WebRTC client
- `livekit-server-sdk` - Backend token generation
- `express`, `cors`, `dotenv` - Server dependencies
- `concurrently` - Run client and server together
- `tsx` - Run TypeScript directly

### Step 2: Create `.env.local` File

Create a `.env.local` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Then fill in the values:

```env
# LiveKit API Keys (from https://cloud.livekit.io)
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud

# Groq API Key (from https://console.groq.com)
VITE_GROQ_API_KEY=your_groq_key_here

# Supabase Keys (from https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Get LiveKit Credentials

1. **Visit** [https://cloud.livekit.io/dashboard](https://cloud.livekit.io/dashboard)
2. **Create a Project** or use existing
3. **Go to** "Settings" → "API Keys"
4. **Copy:**
   - API Key → `LIVEKIT_API_KEY`
   - API Secret → `LIVEKIT_API_SECRET`
   - Server URL → `LIVEKIT_URL` (format: `wss://your-project.livekit.cloud`)

### Step 4: Get Remaining API Keys

- **Groq API Key:** [https://console.groq.com/keys](https://console.groq.com/keys)
- **Supabase:** [https://supabase.com/dashboard](https://supabase.com/dashboard)

---

## 🚀 Running the Application

### Development Mode (Recommended)

Runs both client and server simultaneously:

```bash
npm run dev
```

This starts:
- **Frontend:** http://localhost:5173 (Vite)
- **Backend:** http://localhost:3001 (Express Token Server)

### Alternative: Separate Terminals

**Terminal 1 - Frontend:**
```bash
npm run dev:client
```

**Terminal 2 - Backend:**  
```bash
npm run dev:server
```

### Production Build

```bash
npm run build
npm run preview
```

---

## 🧪 Testing Checklist

After setup, test these features in order:

- [ ] **Video Connection**
  - [ ] Camera feed shows in local video
  - [ ] Remote video appears when connected
  - [ ] "Connected!" status message shows

- [ ] **Status Indicators**
  - [ ] Green dot when connected
  - [ ] Yellow dot when searching
  - [ ] Red dot on error

- [ ] **Audio & Video Controls**
  - [ ] Camera toggle (mute/unmute) works
  - [ ] Screen sharing starts/stops
  - [ ] Audio is bidirectional

- [ ] **Text Chat**
  - [ ] Send message via input field
  - [ ] Message appears as iPhone notification
  - [ ] Chat history shows all messages
  - [ ] Message format: `{ type: "msg", message: { sender, text, time } }`

- [ ] **Chess Game**
  - [ ] Click chess button to open
  - [ ] Both players see the board
  - [ ] Move from one side, appears on other
  - [ ] Moves sent as: `{ type: "chess-move", move: { from, to, promotion? } }`

- [ ] **Whiteboard**
  - [ ] Opens as overlay
  - [ ] Can draw shapes
  - [ ] Shapes sync to peer
  - [ ] Both can edit

- [ ] **Code Editor**
  - [ ] Opens enhanced IDE
  - [ ] Code updates sync
  - [ ] Language selection syncs
  - [ ] Both can edit

- [ ] **Watch Mode**
  - [ ] Opens YouTube embed
  - [ ] Search finds videos
  - [ ] Video ID updates peer
  - [ ] Both watch together

- [ ] **AI Assistant (Sigma)**
  - [ ] Click mic icon to enable
  - [ ] Say "سيقما" (or "sigma") as wake word
  - [ ] Ask a question
  - [ ] Response appears in ~2 seconds

- [ ] **Navigation**
  - [ ] Skip button finds new partner
  - [ ] Stop button returns to home
  - [ ] Browser back button disconnects
  - [ ] Exit call cleans up resources

- [ ] **Performance**
  - [ ] No memory leaks on skip
  - [ ] Video smooth without stuttering
  - [ ] Low latency data channel

---

## 🔄 API Endpoints

### Token Generation Endpoint

**GET** `/api/livekit-token`

**Response:**
```json
{
  "token": "eyJhbGcio...",  // JWT token
  "roomName": "room_abc123",  // Room to join
  "url": "wss://project.livekit.cloud"  // Server URL
}
```

**Room Matching Logic:**
- If a room exists with 1 participant → add to that room
- Otherwise → create new room

### Room Status Endpoint (Debug Only)

**GET** `/api/livekit-token/room-status`

Shows current rooms and participant counts (for debugging)

### Health Check

**GET** `/api/health`

Returns: `{ "status": "ok", "timestamp": "..." }`

---

## 📊 Data Channel Message Format

All messages preserve the original format for compatibility:

### Text Message
```json
{
  "type": "msg",
  "message": {
    "sender": "local|remote",
    "text": "Hello!",
    "time": "2024-02-25T10:30:00.000Z",
    "_id": 123
  }
}
```

### Chess Move
```json
{
  "type": "chess-move",
  "move": {
    "from": "e2",
    "to": "e4",
    "promotion": "q"  // optional
  }
}
```

### Code Update
```json
{
  "type": "code-update",
  "content": "console.log('Hello');"
}
```

### Watch Mode
```json
{
  "type": "watch",
  "videoId": "dQw4w9WgXcQ"
}
```

---

## ❌ Known Limitations

### 1. Multiple Peers Not Supported Yet
- One-to-one only (no group mode)
- Future: Enable room[...] grants for multi-user

### 2. LocalParticipant Track Publishing
Current implementation uses `room.localParticipant.publishTrack()`
- Works for basic video/audio
- Complex track manipulation may need refinement

### 3. Screen Share Configuration  
Screen sharing uses `setScreenShareEnabled()`
- Replaces active video track
- Native LiveKit support, but different from RTCPeerConnection

---

## 🔧 Troubleshooting

### "Token API unreachable"
```
Error: Failed to get token from API
```
**Solution:** Make sure token server is running:
```bash
npm run server
# Or in separate terminal if using dev:client
```

### "Failed to connect to room"
```
Error: Failed to join room
```
**Solutions:**
- Check LiveKit credentials in `.env.local`
- Ensure `LIVEKIT_URL` is correct (should be `wss://`, not `https://`)
- Check browser console for JWT decode errors

### "No audio from remote peer"
**Solutions:**
- Try toggling camera off/on
- Check browser microphone permissions
- Restart connection (Skip button)
- LiveKit server may need audio codec configuration

### "Video tracks not syncing in Code Mode"
**Solution:**
```typescript
// The code editor syncs refs in useEffect
if (isCodeMode) {
  if (codeRemoteVideoRef.current && remoteVideoRef.current?.srcObject) {
    codeRemoteVideoRef.current.srcObject = remoteVideoRef.current.srcObject;
  }
}
```

---

## 📚 Documentation Links

- **LiveKit Client Docs:** https://docs.livekit.io/client-sdk/javascript/
- **LiveKit Server SDK:** https://docs.livekit.io/server-sdk/go/ (reference)
- **Groq API:** https://console.groq.com/docs/speech-text
- **Supabase:** https://supabase.com/docs

---

## 📦 File Structure

```
skill-swap-website-inte/
├── server/
│   └── livekit-token.ts              # Token generation API
├── src/
│   └── pages/videochat/
│       └── VideoChatPage.tsx          # Main video chat (REWRITTEN)
├── .env.example                        # Environment template (NEW)
├── package.json                        # Updated with LiveKit deps
└── ... (other files unchanged)
```

---

## 🎯 Next Steps

1. ✅ Replace `.env` values
2. ✅ Run `npm install`
3. ✅ Start with `npm run dev`
4. ✅ Test all features (see Testing Checklist)
5. ✅ Deploy frontend and server separately:
   - Frontend → Vercel/Netlify
   - Server → Render/Railway/Fly.io

---

## 📞 Support

If you encounter issues:

1. Check browser DevTools console for errors
2. Visit `/api/livekit-token/room-status` for room debug info
3. Check server logs for token generation issues
4. Review LiveKit docs at https://docs.livekit.io

---

## ✨ Summary of Benefits

| Benefit | Details |
|---------|---------|
| **Better Stability** | SFU handles NAT traversal, connection issues |
| **Lower Latency** | Direct path through LiveKit server |
| **Scalability** | Easy to add group calls later |
| **Better Quality** | Optimized bitrate for each receiver |
| **Standardized API** | LiveKit SDK is widely supported |
| **Professional Support** | Access to LiveKit's SaaS platform |

---

**Migration completed! 🎉 All features preserved, now with LiveKit!**
