import { supabase } from '@/lib/supabaseClient';

// In-memory cache for fast UI retrieval
const mediaCache = new Map<string, string>();

export async function uploadEncryptedMedia(file: File, conversationId: string) {
    // 1. Generate AES-GCM Key & IV
    const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Encrypt File
    const arrayBuffer = await file.arrayBuffer();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        arrayBuffer
    );

    // 3. Upload to Supabase Storage
    const fileName = `${crypto.randomUUID()}`;
    const storagePath = `${conversationId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(storagePath, new Blob([encryptedBuffer], { type: 'application/octet-stream' }));

    if (uploadError) throw uploadError;

    // 4. Export keys for storage in message
    const rawKey = await window.crypto.subtle.exportKey("raw", key);
    
    const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    const ivB64 = btoa(String.fromCharCode(...iv));

    return { storagePath, keyB64, ivB64, mimeType: file.type || 'application/octet-stream', size: file.size };
}

export async function downloadAndDecryptMedia(storagePath: string, keyB64: string, ivB64: string, mimeType: string = 'image/jpeg'): Promise<string> {
    if (mediaCache.has(storagePath)) {
        return mediaCache.get(storagePath)!;
    }

    // 1. Download
    const { data: blob, error } = await supabase.storage.from('chat_media').download(storagePath);
    if (error || !blob) throw error || new Error('Download failed');

    // 2. Decrypt
    const encryptedBuffer = await blob.arrayBuffer();
    const rawKey = new Uint8Array(atob(keyB64).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));

    const key = await window.crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedBuffer
        );

        const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
        const objUrl = URL.createObjectURL(decryptedBlob);
        
        mediaCache.set(storagePath, objUrl);
        return objUrl;
    } catch (err) {
        console.error("Media Decryption Failed:", err);
        throw err;
    }
}
