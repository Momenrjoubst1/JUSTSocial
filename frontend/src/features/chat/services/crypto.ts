const ALGORITHM = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

export const APP_ENCRYPTION_VERSION = 'v2';

// ═══ In-memory LRU Decryption Cache (main-thread fallback) ═══
const _decryptCache = new Map<string, { text: string; expiry: number }>();
const _CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const _MAX_CACHE = 500;

// Auto-cleanup every 60s
if (typeof window !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of _decryptCache) {
            if (val.expiry < now) _decryptCache.delete(key);
        }
    }, 60_000);
}

export type GeneratedKeyPair = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  rawPrivateKeyB64: string;
};

export async function generateKeyPair(): Promise<GeneratedKeyPair> {
    try {

        const keyPair = await window.crypto.subtle.generateKey(
            ALGORITHM,
            true, // temporarily true to see if we can do something? No, we must split logic. Actually generateKey takes single boolean for both.
            ["encrypt", "decrypt"]
        );
        // Since Web Crypto generateKey sets the same extractable flag to both public and private keys,
        // we generate with true, then export and re-import the private key with extractable: false.
        const rawPriv = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const lockedPrivKey = await window.crypto.subtle.importKey(
            "pkcs8",
            rawPriv,
            ALGORITHM,
            false, // 🔥 EXTRACTABLE: FALSE 
            ["decrypt"]
        );
        return {
            publicKey: keyPair.publicKey,
            privateKey: lockedPrivKey,
            rawPrivateKeyB64: arrayBufferToBase64(rawPriv) // Temporarily available for PBKDF2 encryption during initial generation
        };

    } catch (error) {
      console.error('[crypto.ts] [generateKeyPair]:', error);
      throw error;
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    // 🛡️ [Security Architect] Strict Buffer Copy to prevent memory interference
    const bytes = new Uint8Array(buffer.slice(0)); 
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
    const binary = window.atob(base64);
    const len = binary.length;
    // 🛡️ [Memory Isolation] Ensure we are working on a dedicated Buffer space
    const bytes = new Uint8Array(new ArrayBuffer(len));
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    try {

        const exported = await window.crypto.subtle.exportKey("spki", key);
        return arrayBufferToBase64(exported);

    } catch (error) {
      console.error('[crypto.ts] [exportPublicKey]:', error);
      throw error;
    }
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    try {

        if (!key.extractable) {
            throw new Error("SECURITY BLOCK: Attempted to export an unextractable private key. This is disabled to prevent XSS.");
        }
        const exported = await window.crypto.subtle.exportKey("pkcs8", key);
        return arrayBufferToBase64(exported);

    } catch (error) {
      console.error('[crypto.ts] [exportPrivateKey]:', error);
      throw error;
    }
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
    try {

        const buffer = base64ToArrayBuffer(base64);
        return await window.crypto.subtle.importKey(
            "spki",
            buffer,
            ALGORITHM,
            true,
            ["encrypt"]
        );

    } catch (error) {
      console.error('[crypto.ts] [importPublicKey]:', error);
      throw error;
    }
}

export async function importPrivateKey(base64: string, extractable: boolean = false): Promise<CryptoKey> {
    try {

        const buffer = base64ToArrayBuffer(base64);
        return await window.crypto.subtle.importKey(
            "pkcs8",
            buffer,
            ALGORITHM,
            extractable,
            ["decrypt"]
        );

    } catch (error) {
      console.error('[crypto.ts] [importPrivateKey]:', error);
      throw error;
    }
}

async function generateAESKey(): Promise<CryptoKey> {
    try {

        return await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

    } catch (error) {
      console.error('[crypto.ts] [generateAESKey]:', error);
      throw error;
    }
}

export async function encryptHybridMessage(
    receiverPubKeyBase64: string | null,
    senderPubKeyBase64: string | null,
    message: string
): Promise<string> {
    if (!receiverPubKeyBase64 || !senderPubKeyBase64) {
        return message; // fallback to plaintext if missing keys
    }

    try {
        const aesKey = await generateAESKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(message);
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encoded
        );

        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
        const receiverPubKey = await importPublicKey(receiverPubKeyBase64);
        const senderPubKey = await importPublicKey(senderPubKeyBase64);

        const encryptedAesKeyForReceiver = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            receiverPubKey,
            rawAesKey
        );
        const encryptedAesKeyForSender = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            senderPubKey,
            rawAesKey
        );

        // 🛡️ [Cryptography Audit] Strict Base64 Encoding for all artifacts
        const ivB64 = arrayBufferToBase64(iv.buffer);
        const encAesSenderB64 = arrayBufferToBase64(encryptedAesKeyForSender);
        const encAesReceiverB64 = arrayBufferToBase64(encryptedAesKeyForReceiver);
        const cipherB64 = arrayBufferToBase64(ciphertextBuffer);

        const finalPayload = `E2EE:v2:${ivB64}:${encAesSenderB64}:${encAesReceiverB64}:${cipherB64}`;
        
        console.log(`[E2EE Audit] Pre-Send Fingerprint: Length=${finalPayload.length}, CipherLen=${cipherB64.length}`);
        
        return finalPayload;
    } catch (e) {
        console.error("Encryption failed:", e);
        return message; 
    }
}

export async function decryptHybridMessage(
    privateKey: CryptoKey | string | null,
    currentUserId: string,
    senderId: string,
    payload: string
): Promise<string> {
    if (!payload || typeof payload !== 'string') return payload || '';

    // Handle legacy v1 and new v2
    if (!payload.startsWith("E2EE:v1:") && !payload.startsWith("E2EE:v2:")) {
        return payload; 
    }

    // ═══ LRU Cache Check ═══
    const cacheKey = `${currentUserId}:${payload.substring(0, 64)}:${payload.length}`;
    const cached = _decryptCache.get(cacheKey);
    if (cached) {
        if (cached.expiry > Date.now()) {
            // Update LRU position (Least Recently Used)
            _decryptCache.delete(cacheKey);
            _decryptCache.set(cacheKey, cached);
            return cached.text;
        } else {
            // Expired, remove it
            _decryptCache.delete(cacheKey);
        }
    }

    const isV2 = payload.startsWith("E2EE:v2:");

    if (!privateKey) {
        return "🔒 [Encrypted Message - Private key missing]";
    }

    try {
        const parts = payload.split(':');
        if (parts.length !== 6) {
            const errorText = "🔒 [بيانات تالفة - Data Corrupted]";
            _decryptCache.set(cacheKey, { text: errorText, expiry: Date.now() + _CACHE_TTL });
            return errorText;
        }

        const [, , ivB64, encAesKeySenderB64, encAesKeyReceiverB64, cipherB64] = parts;
        const targetEncAesB64 = (currentUserId === senderId) ? encAesKeySenderB64 : encAesKeyReceiverB64;

        let activePrivKey: CryptoKey;
        if (typeof privateKey === 'string') {
             activePrivKey = await importPrivateKey(privateKey, false);
        } else {
             activePrivKey = privateKey;
        }
        
        // 1. Decrypt AES Key using RSA-OAEP
        const rawAesBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            activePrivKey,
            base64ToArrayBuffer(targetEncAesB64)
        );

        // 2. Import decrypted AES key
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawAesBuffer,
            { name: "AES-GCM", length: 256 },
            true,
            ["decrypt"]
        );

        // 3. Decrypt Ciphertext using AES-GCM
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(ivB64)) },
            aesKey,
            base64ToArrayBuffer(cipherB64)
        );

        const text = new TextDecoder().decode(decryptedBuffer);

        // ═══ Store in LRU Cache ═══
        if (_decryptCache.size >= _MAX_CACHE) {
            const firstKey = _decryptCache.keys().next().value;
            if (firstKey) _decryptCache.delete(firstKey);
        }
        _decryptCache.set(cacheKey, { text, expiry: Date.now() + _CACHE_TTL });

        return text;
    } catch (e) {
        // تم إخفاء رسالة الخطأ المزعجة في شاشة الـ console لأنها طبيعية أثناء التطوير (مفاتيح قديمة لا تتطابق مع الحالية)
        const errorText = "🔒 [فشل فك التشفير - Decryption Failed]";
        _decryptCache.set(cacheKey, { text: errorText, expiry: Date.now() + _CACHE_TTL });
        return errorText;
    }
}

// ════════════════════════════════════════════════════════════
// KEY FINGERPRINTING
// ════════════════════════════════════════════════════════════

export async function getPublicKeyFingerprint(base64Key: string): Promise<string> {
    try {

        const buffer = base64ToArrayBuffer(base64Key);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Format nicely like: a1b2 c3d4 e5f6 ...
        return hex.toUpperCase().match(/.{1,4}/g)?.join(' ') || hex;

    } catch (error) {
      console.error('[crypto.ts] [getPublicKeyFingerprint]:', error);
      return '';
    }
}

// ════════════════════════════════════════════════════════════
// KEY BACKUP SYSTEM (PBKDF2)
// ════════════════════════════════════════════════════════════

async function getPBKDF2Key(password: string, salt: Uint8Array): Promise<CryptoKey> {
    try {

        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt as any,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );

    } catch (error) {
      console.error('[crypto.ts] [getPBKDF2Key]:', error);
      throw error;
    }
}

export async function encryptPrivateKeyWithPassword(
    privateKey: string,
    password: string
): Promise<{ encryptedB64: string; saltB64: string; ivB64: string }> {
    try {

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const derivedKey = await getPBKDF2Key(password, salt);

        const enc = new TextEncoder();
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            derivedKey,
            enc.encode(privateKey)
        );

        return {
            encryptedB64: arrayBufferToBase64(ciphertext),
            saltB64: arrayBufferToBase64(salt.buffer),
            ivB64: arrayBufferToBase64(iv.buffer)
        };

    } catch (error) {
      console.error('[crypto.ts] [encryptPrivateKeyWithPassword]:', error);
      throw error;
    }
}

export async function decryptPrivateKeyWithPassword(
    encryptedB64: string,
    saltB64: string,
    ivB64: string,
    password: string
): Promise<string> {
    try {

        const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
        const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
        const encryptedData = base64ToArrayBuffer(encryptedB64);

        const derivedKey = await getPBKDF2Key(password, salt);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            derivedKey,
            encryptedData
        );

        return new TextDecoder().decode(decrypted);

    } catch (error) {
      console.error('[crypto.ts] [decryptPrivateKeyWithPassword]:', error);
      throw error;
    }
}

// ════════════════════════════════════════════════════════════
// SUPABASE BACKUP SYNC
// ════════════════════════════════════════════════════════════
import { supabase } from '@/lib/supabaseClient';

export async function syncKeyBackupToSupabase(
    userId: string,
    encryptedB64: string,
    saltB64: string,
    ivB64: string
) {
    try {

        const { data, error } = await supabase
            .from('user_key_backups')
            .upsert({
                user_id: userId,
                encrypted_private_key: encryptedB64,
                salt_b64: saltB64,
                iv_b64: ivB64,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error("Failed to sync key backup to Supabase:", error);
            throw error;
        }
        
        return data;

    } catch (error) {
      console.error('[crypto.ts] [syncKeyBackupToSupabase]:', error);
      throw error;
    }
}

export async function fetchKeyBackupFromSupabase(userId: string) {
    try {

        const { data, error } = await supabase
            .from('user_key_backups')
            .select('encrypted_private_key, salt_b64, iv_b64')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error("Failed to fetch key backup from Supabase:", error);
            throw error;
        }
        
        return data;

    } catch (error) {
      console.error('[crypto.ts] [fetchKeyBackupFromSupabase]:', error);
      return null;
    }
}

// ════════════════════════════════════════════════════════════
// GEO-SECURE CALL SYSTEM
// ════════════════════════════════════════════════════════════

export async function getGeoHash(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error("Geolocation not supported"));
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {

                                // Round to 1 decimal place (~11km range accuracy for range matching)
                                const lat = position.coords.latitude.toFixed(1);
                                const lon = position.coords.longitude.toFixed(1);
                                const locationString = `${lat},${lon}`;
                                const buffer = new TextEncoder().encode(locationString);
                                const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                resolve(hex);
                            
                } catch (error) {
                  console.error('[crypto.ts] [anonymous_function]:', error);
                }
            },
            (error) => {
                reject(error);
            },
            { maximumAge: 0, enableHighAccuracy: true }
        );
    });
}

export async function encryptCallSignal(data: any, geoHash: string): Promise<string> {
    try {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(geoHash),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        const salt = new Uint8Array(16); // Static salt for ephemeral signals
        const key = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt as any, iterations: 1000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
        );
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(JSON.stringify(data))
        );
        return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function decryptCallSignal(payload: string, geoHash: string): Promise<any> {
    try {
        const parts = payload.split(':');
        if (parts.length !== 2) throw new Error("Invalid payload format");
        const [ivB64, cipherB64] = parts;
        const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
        const ciphertext = base64ToArrayBuffer(cipherB64);
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(geoHash),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        const salt = new Uint8Array(16);
        const key = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt as any, iterations: 1000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        throw new Error("Geo-Secure verification failed");
    }
}

