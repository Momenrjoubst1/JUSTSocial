/**
 * 🚨 panicService.ts
 * "Panic Wipe" (Self-Destruct) service for SkillSwap.
 * Instantly purges all sensitive cryptographic and session data.
 */

import { signOut } from "@/lib/supabaseClient";

export async function executePanicWipe() {
    try {
        // 1. Clear E2EE Keys
        const e2eeKeys = Object.keys(localStorage).filter(key => 
            key.includes('e2ee') || key.includes('crypto') || key.includes('private_key')
        );
        e2eeKeys.forEach(key => localStorage.removeItem(key));

        // 2. Clear Geo Fingerprints
        localStorage.removeItem('skillswap_geo_fingerprint');

        // 3. Clear Chat & Session Preferences
        const sessionKeys = Object.keys(localStorage).filter(key => 
            key.includes('appState') || key.includes('chat_settings') || key.includes('last_chat')
        );
        sessionKeys.forEach(key => localStorage.removeItem(key));

        // 4. Clear Auth Provider info
        localStorage.removeItem('auth_provider');

        // 5. Sign out from Supabase (Backend session termination)
        await signOut().catch(() => {}); // Swallow errors if network is down
    } finally {
        // 6. Force reload/redirect even if internet is down
        window.location.href = '/?panic=true';
    }
}
