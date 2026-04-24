import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import i18n from "@/i18n/i18next";

const SUPPORTED_LOCALES = ["ar-SA", "en-US", "es-ES"] as const;
const SUPPORTED_LANGUAGES = ["ar", "en", "es"] as const;
const MAX_TRANSLATION_LINES = 3;

export type TranslationLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LocalTranslationLine {
  id: string;
  sourceLanguage: TranslationLanguage | null;
  translations: Array<{
    language: TranslationLanguage;
    text: string;
  }>;
}

interface UseLocalTranslationOptions {
  isRoomActive?: boolean;
}

function toLanguageCode(locale: string | undefined): TranslationLanguage | null {
  if (!locale) {
    return null;
  }

  const normalized = locale.toLowerCase();
  if (normalized.startsWith("ar")) {
    return "ar";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }
  if (normalized.startsWith("es")) {
    return "es";
  }

  return null;
}

function createLineId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 9)}`;
}

function stopRecognizer(recognizer: SpeechSDK.TranslationRecognizer): Promise<void> {
  return new Promise((resolve) => {
    recognizer.stopContinuousRecognitionAsync(
      () => resolve(),
      () => resolve(),
    );
  });
}

export function useLocalTranslation(options: UseLocalTranslationOptions = {}) {
  const { isRoomActive = true } = options;
  const recognizerRef = useRef<SpeechSDK.TranslationRecognizer | null>(null);

  const [isEnabled, setIsEnabled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lines, setLines] = useState<LocalTranslationLine[]>([]);

  const speechKey = useMemo(() => import.meta.env.VITE_AZURE_SPEECH_KEY?.trim() ?? "", []);
  const speechRegion = useMemo(() => import.meta.env.VITE_AZURE_SPEECH_REGION?.trim() || "uaenorth", []);
  const isConfigured = speechKey.length > 0;

  const stopTranslation = useCallback(async () => {
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;

    if (!recognizer) {
      setIsEnabled(false);
      setLines([]);
      return;
    }

    setIsBusy(true);
    try {
      await stopRecognizer(recognizer);
    } finally {
      recognizer.close();
      setIsEnabled(false);
      setIsBusy(false);
      setLines([]);
    }
  }, []);

  const startTranslation = useCallback(async () => {
    if (recognizerRef.current || isBusy) {
      return;
    }

    if (!isConfigured) {
      setErrorMessage(i18n.t("videochat:azureSpeechKeyMissing"));
      return;
    }

    setErrorMessage(null);
    setIsBusy(true);

    try {
      const translationConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(speechKey, speechRegion);
      translationConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous");

      for (const language of SUPPORTED_LANGUAGES) {
        translationConfig.addTargetLanguage(language);
      }

      const autoDetectConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages([...SUPPORTED_LOCALES]);
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      
      // Override TS error to use the constructor that initializes translation with language detection properly.
      const recognizer = (SpeechSDK.TranslationRecognizer as any).FromConfig(
        translationConfig,
        autoDetectConfig,
        audioConfig,
      ) as SpeechSDK.TranslationRecognizer;

      recognizer.recognized = (_sender, event) => {
        if (event.result.reason !== SpeechSDK.ResultReason.TranslatedSpeech) {
          return;
        }

        const sourceLanguageResult = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(event.result);
        const sourceLanguage = toLanguageCode(sourceLanguageResult.language);

        const translations = SUPPORTED_LANGUAGES
          .filter((language) => language !== sourceLanguage)
          .map((language) => ({
            language,
            text: (event.result.translations.get(language) ?? "").trim(),
          }))
          .filter((entry) => entry.text.length > 0);

        if (translations.length === 0) {
          return;
        }

        setLines((prev) => [
          ...prev,
          {
            id: createLineId(),
            sourceLanguage,
            translations,
          },
        ].slice(-MAX_TRANSLATION_LINES));
      };

      recognizer.canceled = (_sender, event) => {
        if (event.reason === SpeechSDK.CancellationReason.Error) {
          if (event.errorDetails) {
            console.error("Azure Speech translation canceled:", event.errorDetails);
          }
          setErrorMessage(i18n.t("videochat:translationCanceled"));
        }

        if (recognizerRef.current === recognizer) {
          recognizerRef.current = null;
        }

        recognizer.close();
        setIsEnabled(false);
      };

      recognizer.sessionStopped = () => {
        if (recognizerRef.current === recognizer) {
          recognizerRef.current = null;
        }

        recognizer.close();
        setIsEnabled(false);
      };

      await new Promise<void>((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(
          () => resolve(),
          (error) => reject(new Error(String(error))),
        );
      });

      recognizerRef.current = recognizer;
      setIsEnabled(true);
    } catch (error) {
      setIsEnabled(false);
      if (error instanceof Error) {
        console.error("Failed to start live translation:", error.message);
      }
      setErrorMessage(i18n.t("videochat:translationFailed"));
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, isConfigured, speechKey, speechRegion]);

  const toggleTranslation = useCallback(() => {
    if (isEnabled) {
      void stopTranslation();
      return;
    }

    void startTranslation();
  }, [isEnabled, startTranslation, stopTranslation]);

  useEffect(() => {
    if (!isRoomActive && recognizerRef.current) {
      void stopTranslation();
    }
  }, [isRoomActive, stopTranslation]);

  useEffect(() => {
    return () => {
      const recognizer = recognizerRef.current;
      recognizerRef.current = null;
      if (!recognizer) {
        return;
      }

      recognizer.stopContinuousRecognitionAsync(
        () => recognizer.close(),
        () => recognizer.close(),
      );
    };
  }, []);

  return {
    isEnabled,
    isBusy,
    isConfigured,
    errorMessage,
    lines,
    toggleTranslation,
  };
}
