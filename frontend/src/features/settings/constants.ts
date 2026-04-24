import type { AppLanguage } from "@/context/LanguageContext";

export const LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  labelKey: string;
  fallbackLabel: string;
}> = [
  { value: "en", labelKey: "settings.english", fallbackLabel: "English" },
  { value: "ar", labelKey: "settings.arabic", fallbackLabel: "Arabic" },
];
