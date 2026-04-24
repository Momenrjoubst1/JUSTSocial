# Localization Audit — Untranslated UI Strings

> **Generated**: 2026-04-22
> **Scope**: Strings outside the localization engineer's owned file scope that still contain hardcoded user-visible text.

## Status

The i18next + react-i18next localization system has been integrated. The following areas **have been migrated** to translation keys:

| Scope | Status |
|---|---|
| `frontend/src/i18n/**` | [done] Namespace-based i18next system in place |
| `frontend/src/context/LanguageContext.tsx` | [done] Compat wrapper over i18next |
| `frontend/src/providers/AppProviders.tsx` | [done] No user-visible strings |
| `frontend/src/main.tsx` | [done] i18n initialization added |
| `frontend/src/App.tsx` | [done] UI localized; `JUST Social` brand string intentionally unchanged |
| `frontend/src/pages/videochat/**` | [done] User-visible strings migrated including whiteboard and overlays |
| `frontend/src/features/chat/**` | [done] Chat UI, modals, media gallery, onboarding, and security widgets migrated |

---

## Remaining Untranslated Areas (Outside Owned Scope)

### 1. Landing Page (`frontend/src/pages/landing/`, `frontend/src/features/landing/`)
- **Files**: `LandingPage.tsx`, `HeroSection.tsx`, `HowItWorks.tsx`, and other section components
- **Current state**: Uses legacy `useLanguage().t()` with flat keys (e.g. `landing.signIn`)
- **Action needed**: Migrate from `t("landing.signIn")` to `useTranslation("landing")` + `t("signIn")`
- **Namespace to create**: `landing`

### 2. Settings Page (`frontend/src/pages/settings/SettingsPage.tsx`)
- **Current state**: Uses legacy `useLanguage().t()` with flat keys (e.g. `settings.title`)
- **Action needed**: Migrate to `useTranslation("settings")` namespace
- **Namespace to create**: `settings`

### 3. Profile Menu (`frontend/src/components/ui/shared/ProfileMenu/ProfileMenu.tsx`)
- **Current state**: Uses legacy `useLanguage().t()` with flat keys (e.g. `profileMenu.signOut`)
- **Action needed**: Migrate to proper namespace
- **Namespace to create**: `profileMenu` or fold into `app`

### 4. Sign In / Sign Up Pages (`frontend/src/pages/signin/`, `frontend/src/pages/signup/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 5. Profile Page (`frontend/src/pages/profile/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 6. Messages Page (`frontend/src/pages/messages/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 7. Admin Dashboard (`frontend/src/pages/admin/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 8. Banned Page (`frontend/src/pages/banned/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 9. AI Assistant (`frontend/src/features/ai-assistant/`)
- **Current state**: Unknown — likely contains hardcoded English strings
- **Action needed**: Audit and migrate

### 10. Shared UI Components (`frontend/src/components/`)
- **Files**: `ErrorBoundary.tsx`, `PageErrorFallback.tsx`, `WelcomeOverlay.tsx`
- **Current state**: Hardcoded English strings (e.g. "Something went wrong", "Welcome back")
- **Action needed**: Migrate to `errors` or `common` namespace

### 11. Feature-level speech translation (`frontend/src/pages/videochat/hooks/useLocalTranslation.ts`)
- **Note**: The `SUPPORTED_LANGUAGES` in this file (`ar`, `en`, `es`) are **live speech translation target languages**, NOT website UI languages. These must NOT be altered.
- **Status**: No action needed — this is feature-level, not UI locale.

---

## Migration Guide for Other Engineers

To migrate a file to the new i18next system:

```tsx
// Before (legacy)
import { useLanguage } from "@/context/LanguageContext";
const { t } = useLanguage();
// t("landing.signIn") → "Sign In"

// After (i18next)
import { useTranslation } from "react-i18next";
const { t } = useTranslation("landing");
// t("signIn") → "Sign In"
```

### Steps:
1. Create JSON namespace files in `frontend/src/i18n/locales/en/<namespace>.json` and `ar/<namespace>.json`
2. Register the namespace in `frontend/src/i18n/i18next.ts` (add import + add to resources)
3. Replace `useLanguage().t("namespace.key")` with `useTranslation("namespace").t("key")`
4. For non-component code (hooks, utils), use `i18n.t("namespace:key")` directly

### Interpolation:
```tsx
// Before
`Reason: ${reason}`

// After (in JSON)
"suspended.reason": "Reason: {{reason}}"
// In code
t("suspended.reason", { reason: "spam" })
```
