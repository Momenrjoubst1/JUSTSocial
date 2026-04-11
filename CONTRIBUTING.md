# Contributing to SkillSwap

> Thank you for your interest in contributing! This guide will help you understand the project structure and conventions.

## 🏗️ Architecture Overview

Please read [ARCHITECTURE.md](./ARCHITECTURE.md) first for full system context.

SkillSwap follows **Feature-Sliced Design (FSD)** combined with **Atomic Design** for UI components.

## 📁 Adding a New Feature

### 1. Create the Feature Directory

```
src/features/your-feature/
├── components/
│   ├── atoms/          # Smallest UI units (buttons, badges)
│   ├── molecules/      # Composites (cards, form groups)
│   └── organisms/      # Full sections (panels, modals)
├── hooks/              # React hooks specific to this feature
├── services/           # API calls, business logic
├── store/              # Zustand store slice (if needed)
├── types/              # TypeScript interfaces
├── utils/              # Feature-specific utilities
└── index.ts            # Public API (re-exports)
```

### 2. Rules for Feature Isolation

- ✅ Features CAN import from `@/components`, `@/hooks`, `@/lib`, `@/utils`, `@/context`
- ✅ Features CAN import from their own sub-directories
- ❌ Features MUST NOT import directly from other features
- ❌ Features MUST NOT import from `@/pages`

If two features need to share logic, lift it to `@/hooks` or `@/utils`.

### 3. Lazy Loading

All page-level features must be lazy-loaded in `App.tsx`:

```tsx
const YourFeaturePage = lazy(() => import("@/pages/your-feature/YourFeaturePage"));
```

## 🔒 Working with E2EE

### Critical Security Rules

1. **NEVER** log decrypted message content to console in production
2. **NEVER** store decrypted messages in plaintext anywhere persistent
3. **ALWAYS** use `extractable: false` when importing private keys
4. **ALWAYS** use the `CryptoWorkerManager` for batch decryption to avoid UI freezes

### Adding a New Encrypted Data Type

1. Encrypt using the existing `encryptHybridMessage()` from `features/chat/services/crypto.ts`
2. The payload format is: `E2EE:v2:{iv}:{encKeySender}:{encKeyReceiver}:{ciphertext}`
3. For media: use `uploadEncryptedMedia()` from `features/chat/services/cryptoMedia.ts`
4. Never include encryption keys in URLs or query parameters

### Decryption Flow

```
User opens chat → useChat loads messages → 
  CryptoWorkerManager.decryptBatch() → 
    Worker thread decrypts (with LRU cache) → 
      Results posted back → UI renders decrypted text
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Testing Real-time Features

1. Open two browser windows (or use incognito)
2. Log in with different accounts
3. Start a conversation and verify:
   - Messages appear instantly on both sides
   - Typing indicators work
   - Read receipts update
   - Reactions sync in real-time

### Testing Offline Sync

1. Send a message normally (verify delivery)
2. Disconnect network (DevTools → Network → Offline)
3. Send a message (should queue locally with "pending" status)
4. Reconnect network
5. Verify the message is sent and status changes to "delivered"

## 💅 Code Style

### TypeScript
- Use strict types — avoid `any` unless absolutely necessary (document why)
- Export interfaces from `types/` directories
- Use `satisfies` operator for compile-time type checking where applicable

### React
- Use functional components with hooks
- Memoize expensive components with `React.memo`
- Use `useCallback` and `useMemo` for expensive computations  
- Clean up effects properly (abort controllers, event listeners, timeouts)

### CSS
- Use Tailwind CSS utility classes
- Follow the dark/light theme pattern: `bg-black/10 dark:bg-white/10`
- Support `prefers-reduced-motion` for animations

## 🔄 Git Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature`
2. Make changes following the conventions above
3. Test locally with `npm run dev`
4. Ensure no TypeScript errors: `npx tsc --noEmit`
5. Submit a pull request with a clear description

## 📝 Commit Message Format

```
type(scope): description

# Examples:
feat(chat): add link preview detection
fix(crypto): handle corrupted E2EE payloads  
perf(worker): batch decryption with LRU cache
docs(arch): update architecture diagram
```
