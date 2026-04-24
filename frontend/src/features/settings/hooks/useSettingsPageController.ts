import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, type AppLanguage } from "@/context/LanguageContext";
import { useTheme, type AppTheme } from "@/context/ThemeContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTitle } from "@/context/TitleContext";
import { useE2EE, getPublicKeyFingerprint } from "@/features/chat";
import { supabase } from "@/lib/supabaseClient";

type SettingsTab = "security" | "panic" | "preferences";

export function useSettingsPageController() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthContext();
  const { publicKey } = useE2EE();
  const { setBaseTitle } = useTitle();

  const [isBackedUp, setIsBackedUp] = useState(false);
  const [panicPin, setPanicPin] = useState("");
  const [confirmPanicPin, setConfirmPanicPin] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [panicError, setPanicError] = useState("");
  const [panicSuccess, setPanicSuccess] = useState("");
  const [isSavingPanic, setIsSavingPanic] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("security");

  useEffect(() => {
    setBaseTitle(String(t("settings:pageTitle")));
  }, [setBaseTitle, t]);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    getPublicKeyFingerprint(publicKey).then(setFingerprint);
  }, [publicKey]);

  useEffect(() => {
    if (!user) {
      return;
    }

    supabase
      .from("encrypted_private_keys")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsBackedUp(Boolean(data)));
  }, [user]);

  const goBack = () => {
    navigate(-1);
  };

  const selectLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
  };

  const selectTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
  };

  const handleSavePanicPin = async () => {
    if (!panicPin) {
      setPanicError(String(t("settings:panic.errors.enterPin")));
      return;
    }

    if (panicPin !== confirmPanicPin) {
      setPanicError(String(t("settings:panic.errors.pinsMismatch")));
      return;
    }

    if (panicPin.length < 4) {
      setPanicError(String(t("settings:panic.errors.pinMinLength")));
      return;
    }

    setIsSavingPanic(true);
    setPanicError("");
    setPanicSuccess("");

    try {
      const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(panicPin),
      );
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      const { error } = await supabase.auth.updateUser({
        data: {
          panic_pin_hash: hashHex,
          emergency_contact: emergencyContact || null,
        },
      });

      if (error) {
        throw error;
      }

      setPanicSuccess(String(t("settings:panic.successSaved")));
      setPanicPin("");
      setConfirmPanicPin("");
    } catch (error: any) {
      setPanicError(
        error.message || String(t("settings:panic.errors.saveFailed")),
      );
    } finally {
      setIsSavingPanic(false);
    }
  };

  return {
    activeTab,
    confirmPanicPin,
    emergencyContact,
    fingerprint,
    goBack,
    handleSavePanicPin,
    isBackedUp,
    isSavingPanic,
    language,
    panicError,
    panicPin,
    panicSuccess,
    selectLanguage,
    selectTheme,
    setActiveTab,
    setConfirmPanicPin,
    setEmergencyContact,
    setPanicPin,
    t,
    theme,
  };
}
