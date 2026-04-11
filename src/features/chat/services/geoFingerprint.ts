/**
 * 🌍 geoFingerprint.ts
 * Advanced Geographic Fingerprinting Service for SkillSwap.
 * Uses lightweight IP-based geolocation to verify session stability.
 */

export interface GeoData {
    ip: string;
    city: string;
    region: string;
    country: string;
    loc: string; // "lat,long"
    org: string;
}

const GEO_STORAGE_KEY = 'skillswap_geo_fingerprint';
const GEO_TRUSTED_KEY = 'skillswap_geo_trusted';

/**
 * Fetch approximate location data using a public API.
 */
export async function fetchCurrentGeo(): Promise<GeoData | null> {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            // Fallback to a secondary API or assume success if first fails (Offline robustness)
            return null;
        }
        const data = await response.json();
        return {
            ip: data.ip || '0.0.0.0',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            loc: `${data.latitude || 0},${data.longitude || 0}`,
            org: data.org || 'Unknown'
        };
    } catch (error) {
        return null;
    }
}

/**
 * Internal method to mark current location as trusted (Bypass for VPN/MFA)
 */
export function trustCurrentLocation() {
    localStorage.setItem(GEO_TRUSTED_KEY, 'true');
}

/**
 * Generates a non-reversible hash for the geographic fingerprint.
 */
async function hashGeo(geo: GeoData): Promise<string> {
    const rawString = `${geo.country}|${geo.region}|${geo.org}`;
    const msgUint8 = new TextEncoder().encode(rawString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores the geo fingerprint securely in localStorage.
 */
export async function saveGeoFingerprint(geo: GeoData) {
    const hash = await hashGeo(geo);
    const data = {
        hash,
        timestamp: Date.now(),
        lastSeen: geo.city
    };
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(GEO_TRUSTED_KEY, 'false'); // Reset trust on new stable location
}

/**
 * Verifies the current geo fingerprint against the stored one.
 */
export async function verifyGeoStability(currentGeo: GeoData): Promise<{ stable: boolean; lastCity?: string }> {
    // 1. Check if user manually trusted this session (MFA/VPN Bypass)
    const isTrusted = localStorage.getItem(GEO_TRUSTED_KEY) === 'true';
    if (isTrusted) return { stable: true };

    const storedRaw = localStorage.getItem(GEO_STORAGE_KEY);
    if (!storedRaw) return { stable: true }; // First time registration

    const currentHash = await hashGeo(currentGeo);
    const stored = JSON.parse(storedRaw);

    // If the country or region/org hash differs, it's a significant change
    if (stored.hash !== currentHash) {
        return { stable: false, lastCity: stored.lastSeen };
    }

    return { stable: true };
}
