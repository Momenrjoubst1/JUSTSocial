import { get, set, del } from 'idb-keyval';

/**
 * High-Security Key Storage utilizing IndexedDB.
 * 
 * Why IndexedDB instead of localStorage?
 * 1. localStorage only stores strings. To store a key, you must export it to base64.
 * 2. If a key is exported to base64, an XSS attacker can read localStorage and steal it.
 * 3. IndexedDB can natively store `CryptoKey` objects via the Structured Clone Algorithm.
 * 4. By generating a CryptoKey with `extractable: false` and saving it to IndexedDB, 
 *    the browser engine stores it securely. When retrieved, it remains a `CryptoKey` object 
 *    that JS can use to decrypt messages, but NO JavaScript (not even XSS) can extract 
 *    the raw key bytes.
 */

export async function savePrivateKey(userId: string, key: CryptoKey) {
    if (!key) throw new Error("Cannot save null key");
    await set(`e2ee_priv_${userId}`, key);
}

export async function getPrivateKey(userId: string): Promise<CryptoKey | undefined> {
    return await get<CryptoKey>(`e2ee_priv_${userId}`);
}

export async function deletePrivateKey(userId: string) {
    await del(`e2ee_priv_${userId}`);
}

/*
 * ==========================================
 * Security Validation Scenarios (Unit Tests)
 * ==========================================
 * 
 * // Scenario 1: Secure Generation & Storage
 * const { privateKey } = await generateKeyPair(); // Key is natively extractable: false
 * await savePrivateKey('user_123', privateKey);
 * 
 * // Scenario 2: Secure Retrieval & XSS Defense
 * const activeKey = await getPrivateKey('user_123');
 * console.log(activeKey.extractable); // Must be 'false'
 * 
 * // XSS Attacker trying to steal the key
 * try {
 *    const raw = await crypto.subtle.exportKey('pkcs8', activeKey);
 *    // Attack Success
 * } catch (error) {
 *    // Attack Failed: DOMException "key is not extractable" is thrown instantly. (Expected Behavior)
 * }
 * 
 * // Scenario 3: Cleanup on Panics
 * await deletePrivateKey('user_123');
 */
