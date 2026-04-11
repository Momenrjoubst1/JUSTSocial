import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';
import { generateKeyPair, exportPublicKey, encryptPrivateKeyWithPassword, decryptPrivateKeyWithPassword, APP_ENCRYPTION_VERSION, importPrivateKey } from '@/features/chat/services/crypto';
import { savePrivateKey, getPrivateKey, deletePrivateKey } from '@/features/chat/services/keyStorage';

interface E2EEContextType {
    keysReady: boolean;
    privateKey: CryptoKey | string | null;
    publicKey: string | null;
    getRecipientPublicKey: (recipientId: string) => Promise<string | null>;
    unlockKeys: (password: string) => Promise<boolean>;
}

const E2EEContext = createContext<E2EEContextType | undefined>(undefined);

export function E2EEProvider({ children }: { children: ReactNode }) {
    const { user } = useAuthContext();
    const [keysReady, setKeysReady] = useState(false);
    const [privateKey, setPrivateKey] = useState<CryptoKey | string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        if (!user) {
            setKeysReady(false);
            setPrivateKey(null);
            setPublicKey(null);
            return;
        }

        const initializeKeys = async () => {
            try {
                // 🛠️ [Data Migration Logic] 
                const storedVersion = localStorage.getItem('app_encryption_version');
                if (storedVersion !== APP_ENCRYPTION_VERSION) {
                    console.log(`[E2EE Migration] Upgrading to ${APP_ENCRYPTION_VERSION}. Clearing legacy keys...`);
                    Object.keys(localStorage).forEach(key => {
                        if (key.includes('chat_priv_key_') || key.includes('chat_pub_key_')) {
                            localStorage.removeItem(key);
                        }
                    });
                    await deletePrivateKey(user.id);
                    localStorage.setItem('app_encryption_version', APP_ENCRYPTION_VERSION);
                }

                // 🔐 [Security Architect] Storage Isolation via IndexedDB Extractable: false
                const localPrivKeyMap = await getPrivateKey(user.id);
                const localPubKey = localStorage.getItem(`chat_pub_key_${user.id}`);

                if (localPrivKeyMap && localPubKey) {
                    if (!isMounted) return;
                    setPrivateKey(localPrivKeyMap);
                    setPublicKey(localPubKey);
                    setKeysReady(true);
                    return;
                }

                // If not in local storage, check cloud backup
                const tempPassword = sessionStorage.getItem('temp_e2ee_pass');

                const { data: encryptedKeyData } = await supabase
                    .from('encrypted_private_keys')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (encryptedKeyData) {
                    if (!tempPassword) {
                        console.log("[E2EE Sync] Cloud key found. Waiting for manual unlock.");
                        if (isMounted) setKeysReady(true); 
                        return;
                    }

                    try {
                        const restoredPrivKey = await decryptPrivateKeyWithPassword(
                            encryptedKeyData.encrypted_key,
                            encryptedKeyData.salt,
                            encryptedKeyData.iv,
                            tempPassword
                        );

                        const { data: pubData } = await supabase
                            .from('user_public_keys')
                            .select('public_key')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        if (pubData) {
                            const privKeyObj = await importPrivateKey(restoredPrivKey, false);
                            await savePrivateKey(user.id, privKeyObj);
                            localStorage.setItem(`chat_pub_key_${user.id}`, pubData.public_key);
                            if (!isMounted) return;
                            setPrivateKey(privKeyObj);
                            setPublicKey(pubData.public_key);
                            setKeysReady(true);
                            return;
                        }
                    } catch (e) {
                        console.error("[E2EE Sync] Password in session failed to decrypt cloud key.");
                    }
                }

                // 🚀 Default: Generate New Key Pair (Only if no cloud backup exists)
                console.log("[E2EE Sync] No keys found anywhere. Generating fresh natively locked pair.");
                const keyPair = await generateKeyPair();
                const newPubKey = await exportPublicKey(keyPair.publicKey);

                // Store CryptoKey securely in IndexedDB
                await savePrivateKey(user.id, keyPair.privateKey);
                // Public key is safe in localStorage
                localStorage.setItem(`chat_pub_key_${user.id}`, newPubKey);

                // Try to Backup automatically if there's a temp pass. Wait, the old code didn't do auto backup here, it just saved it locally.
                if (isMounted) {
                    setPrivateKey(keyPair.privateKey);
                    setPublicKey(newPubKey);
                }

                await supabase.from('user_public_keys').upsert({
                    user_id: user.id,
                    public_key: newPubKey
                }, { onConflict: 'user_id' });

                if (isMounted) setKeysReady(true);
            } catch (err) {
                console.error("[E2EE Sync] Critical Initialization Error:", err);
            }
        };

        const handleReInit = async () => {
             console.warn("[E2EE Trigger] Forced Re-initialization triggered.");
             await deletePrivateKey(user.id);
             localStorage.removeItem(`chat_pub_key_${user.id}`);
             initializeKeys();
        };

        window.addEventListener('e2ee-force-reinit', handleReInit);
        initializeKeys();
        
        return () => { 
            isMounted = false; 
            window.removeEventListener('e2ee-force-reinit', handleReInit);
        };
    }, [user]);

    const getRecipientPublicKey = async (recipientId: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('user_public_keys')
            .select('public_key')
            .eq('user_id', recipientId)
            .single();

        if (error || !data) return null;
        return data.public_key;
    };

    const unlockKeys = async (password: string): Promise<boolean> => {
        try {
            // Check for Panic PIN
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
            const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

            if (user?.user_metadata?.panic_pin_hash === hashHex) {
                await deletePrivateKey(user.id);
                localStorage.removeItem(`chat_pub_key_${user.id}`);
                sessionStorage.removeItem('temp_e2ee_pass');
                await supabase.from('encrypted_private_keys').delete().eq('user_id', user.id);
                
                // Activate fake UI
                sessionStorage.setItem('panic_mode', 'true');
                window.dispatchEvent(new Event('panic-mode-activated'));
                return false;
            }

            const { data: encryptedKeyData } = await supabase
                .from('encrypted_private_keys')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!encryptedKeyData) return false;

            const restoredPrivKey = await decryptPrivateKeyWithPassword(
                encryptedKeyData.encrypted_key,
                encryptedKeyData.salt,
                encryptedKeyData.iv,
                password
            );

            const { data: pubData } = await supabase
                .from('user_public_keys')
                .select('public_key')
                .eq('user_id', user.id)
                .maybeSingle();

            if (pubData) {
                const privKeyObj = await importPrivateKey(restoredPrivKey, false);
                await savePrivateKey(user.id, privKeyObj);
                localStorage.setItem(`chat_pub_key_${user.id}`, pubData.public_key);
                sessionStorage.setItem('temp_e2ee_pass', password);

                setPrivateKey(privKeyObj);
                setPublicKey(pubData.public_key);
                setKeysReady(true);
                return true;
            }
        } catch (e) {
            console.error("Failed to unlock keys:", e);
        }
        return false;
    };

    return (
        <E2EEContext.Provider value={{ keysReady, privateKey, publicKey, getRecipientPublicKey, unlockKeys }}>
            {children}
        </E2EEContext.Provider>
    );
}

export function useE2EE() {
    const context = useContext(E2EEContext);
    if (context === undefined) {
        throw new Error('useE2EE must be used within an E2EEProvider');
    }
    return context;
}
