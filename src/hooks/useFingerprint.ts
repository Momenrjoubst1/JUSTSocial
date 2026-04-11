/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useFingerprint — Device fingerprinting via FingerprintJS
 *
 * Generates a unique device identifier that persists across:
 *  - Account switches
 *  - VPN usage
 *  - Incognito mode (mostly)
 *
 * Used by the moderation system to identify and block banned devices.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedFingerprint: string | null = null;

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(cachedFingerprint);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (cachedFingerprint) {
      setFingerprint(cachedFingerprint);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;

    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        cachedFingerprint = result.visitorId;
        setFingerprint(result.visitorId);
      })
      .catch((err) => {
        console.error("FingerprintJS error:", err);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, []);

  return fingerprint;
}

/**
 * Get fingerprint imperatively (non-hook, for server calls)
 */
export async function getFingerprint(): Promise<string | null> {
  if (cachedFingerprint) return cachedFingerprint;
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return result.visitorId;
  } catch {
    return null;
  }
}
