# 🚀 SkillSwap Pre-Flight Checklist (Production Release)

> This checklist ensures all performance, security, and architectural improvements are validated before making the product public.

## 1. 🌍 Environment Variables Validation
- [ ] **Vite Client (`.env.production`)**
  - [ ] `VITE_SUPABASE_URL` matches the production project.
  - [ ] `VITE_SUPABASE_ANON_KEY` is present.
  - [ ] `VITE_LIVEKIT_URL` points to the production LiveKit cloud URL (starting with `wss://`).
  - [ ] `VITE_SENTRY_DSN` is configured to catch client-side React errors.
- [ ] **Express Server (`.env`)**
  - [ ] `NODE_ENV=production`.
  - [ ] `SUPABASE_SERVICE_KEY` is set (NEVER expose to the client).
  - [ ] `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are present.
  - [ ] `REDIS_URL` is correct and pointing to production Redis.
  - [ ] `ALLOWED_ORIGINS` strictly contains the exact production domain (no `*`).

## 2. 🔐 Security & E2EE Verification
- [ ] Send a test message and intercept network requests: verify payload is formatted as `E2EE:v2...` and completely encrypted.
- [ ] Attempt an XSS injection in the chat: test if `<script>alert(1)</script>` is handled safely by the React DOM.
- [ ] Open DevTools -> Application -> IndexedDB: verify `e2ee_priv_<userid>` exists and is a non-extractable `CryptoKey` object.
- [ ] Verify Supabase Edge Function (`fetch-link-preview`) properly blocks localhost/internal IP addresses to prevent SSRF vulnerabilities.

## 3. ⏱️ Performance & Build Audit
- [ ] Run `npm run build` and ensure the exit code is `0`.
- [ ] Verify `vendor-3d` and `vendor-livekit` manual chunks are correctly generated and larger than 300KB each (proves they split off successfully).
- [ ] Network Tab Audit: Ensure initial load (Landing Page) only fetches `index.js`, `vendor-react.js`, and `vendor-ui-motion.js`. Three.js/LiveKit should NOT load until `/chat` is accessed.
- [ ] React Profiler: Scroll rapidly through an active chat with 50+ messages to confirm the UI holds stable at 60 FPS (validating Crypto Worker and LRU Cache).

## 4. 📞 Video Chat & WebRTC Health Check
- [ ] Test a peer-to-peer connection through the main signaling flow.
- [ ] Verify `ErrorBoundary` Cleanup: Force an error in the VideoChat UI (e.g., via React DevTools). Verify that the camera light turns OFF, confirming that LiveKit connection and media streams are properly garbage-collected upon component unmount.
- [ ] Validate Data Channels: Ensure textual messages sent via VideoChat (LiveKit Data Channels) trigger Moderation API properly without lagging the video frames.

## 5. 🛠️ Supabase BaaS Limits Verification
- [ ] **Auth:** Rate limits on email signups are suited for launch day traffic.
- [ ] **Database:** RLS (Row Level Security) policies are enabled on ALL tables. Run `supabase db lint` to confirm.
- [ ] **Real-Time:** Check `pgbouncer` or IPv4 connection strings. Ensure the project isn't hitting max concurrent connection limits.
- [ ] **Storage:** Confirm `chat_media` bucket is NOT public and requires RLS to read.

## 6. 🚦 Quick Test Scenario (The Golden Path)
1. Register a new user.
2. Sign in and configure Profile / Avatar.
3. Open a DM -> Send a link (verify Edge Function preview card appears) -> Send a text message (verify E2EE wrapper).
4. Click randomly into `/chat` (Video Chat) -> Allow Camera -> Verify connection.
5. Exit Video Chat. Ensure camera indicator on OS turns off.

**Sign-off:** _______ (Operations Lead)
