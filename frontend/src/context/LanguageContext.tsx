/**
 * LanguageContext — backward-compatible wrapper around i18next.
 *
 * Existing consumers that call `const { language, setLanguage, t } = useLanguage()`
 * continue to work unchanged.  Under the hood every call now delegates to i18next
 * so that the entire app shares a single source of truth for the active locale.
 *
 * The `t` function exposed here looks up keys in the **legacy flat namespace**
 * first, which contains every key from the old en.ts / ar.ts dictionaries.
 * New code should prefer `useTranslation()` from react-i18next directly.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18next";
import type { AppLanguage } from "@/i18n/types";
import type { TranslationValue } from "@/i18n/types";

export type { AppLanguage } from "@/i18n/types";

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => TranslationValue;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n: instance } = useTranslation();

  // Keep html attributes in sync (belt-and-suspenders — i18next.ts also does this)
  useEffect(() => {
    document.documentElement.lang = instance.language;
    document.documentElement.dir = instance.language === "ar" ? "rtl" : "ltr";
  }, [instance.language]);

  const value = useMemo<LanguageContextType>(() => {
    const currentLang = (instance.language ?? "en") as AppLanguage;

    return {
      language: currentLang,

      setLanguage: (nextLanguage: AppLanguage) => {
        void instance.changeLanguage(nextLanguage);
      },

      /**
       * Legacy translation function.
       * Looks up in the "legacy" namespace first (flat dictionary keys like
       * "videochat.connected"), then falls back to the key itself.
       */
      t: (key: string): TranslationValue => {
        // Try the legacy namespace (old flat dictionaries)
        const legacyResult = instance.t(key, { ns: "legacy" });
        if (legacyResult !== key) {
          return legacyResult;
        }
        // Then try normal i18next resolution for namespaced keys like
        // "settings:tabs.security" or "auth:signin.title".
        const i18nResult = instance.t(key);
        if (i18nResult !== key) {
          return i18nResult;
        }
        // Final fallback: return the key as-is (same behavior as before)
        return key;
      },
    };
  }, [instance, instance.language]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
