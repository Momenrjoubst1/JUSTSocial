/**
 * i18n barrel — re-exports everything downstream code needs.
 *
 * Legacy consumers that import { translations, DEFAULT_LANGUAGE, … } from "@/i18n"
 * continue to work unchanged.
 *
 * New consumers should import i18n instance or use react-i18next hooks directly.
 */

// Initialise i18next (side-effect import — must be first)
import "@/i18n/i18next";

// Re-export the configured i18next instance
export { default as i18n } from "@/i18n/i18next";

// Re-export legacy flat dictionaries (for backward compat wrapper)
import { ar } from "@/i18n/locales/ar";
import { en } from "@/i18n/locales/en";
import type { AppLanguage, TranslationDictionary } from "@/i18n/types";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const satisfies readonly AppLanguage[];

export const translations: Record<AppLanguage, TranslationDictionary> = {
  en,
  ar,
};

export function isSupportedLanguage(value: string | null): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function getDocumentDirection(language: AppLanguage): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}
