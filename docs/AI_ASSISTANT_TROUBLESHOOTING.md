# AI Assistant - Troubleshooting Guide

## Quick Test

### 1. Test OpenRouter API Key

```bash
cd backend
node test-openrouter.js
```

Expected output:
```
✅ OPENROUTER_API_KEY found: sk-or-v1-...
🔍 Testing OpenRouter API...
✅ OpenRouter API Response:
Model: anthropic/claude-3.5-haiku
Message: Hello from OpenRouter!
✅ API Key is working correctly!
```

### 2. Check Environment Variables

```bash
# In backend directory
node -e "console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Found' : '❌ Missing')"
```

### 3. Test Backend Endpoint

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "anthropic/claude-3.5-haiku"
  }'
```

## Common Issues

### Issue 1: "Missing OPENROUTER_API_KEY"

**Solution:**
1. Check `.env.local` in root directory
2. Verify the key starts with `sk-or-v1-`
3. Restart backend server

### Issue 2: Model not working

**Solution:**
Check available models in `frontend/src/features/ai-assistant/constants.ts`:
- `anthropic/claude-3.5-haiku` (default)
- `openai/gpt-4o-mini`
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.3-70b-instruct`
- `qwen/qwen-2.5-72b-instruct`

### Issue 3: CORS Error

**Solution:**
Backend already configured for `http://localhost:5173`. If using different port, update `FRONTEND_URL` in `.env.local`.

### Issue 4: Streaming not working

**Solution:**
1. Check browser console for errors
2. Check backend logs for `[Chat API]` messages
3. Verify `ai` package version in `backend/package.json`

## Environment Variables

Required in `.env.local`:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional (with defaults)
FRONTEND_URL=http://localhost:5173
OPENROUTER_APP_NAME=JUST Social AI Assistant
ASSISTANT_DEFAULT_MODEL=anthropic/claude-3.5-haiku
```

## Debugging

### Enable verbose logging

Backend logs will show:
```
[Chat API] Request received: { model: '...', messageCount: 1, ... }
[Chat API] Using model: anthropic/claude-3.5-haiku
[Chat API] Streaming response started
```

### Check frontend network tab

1. Open DevTools → Network
2. Send a message
3. Look for POST to `/api/chat`
4. Check request payload and response

## Getting Help

If issues persist:
1. Check backend console for `[Chat API]` logs
2. Check frontend console for errors
3. Verify `.env.local` is in root directory
4. Restart both frontend and backend
