import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ImageOff, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { decryptHybridMessage } from '../../services/crypto';
import { useAuthContext } from '@/context/AuthContext';
import { useE2EE } from '../../hooks/useE2EE';
// ✅ مسار الاستيراد الصحيح للـ Lightbox
import { ImageLightbox } from '@/components/ui/ImageLightbox';

export interface DecryptedImageProps {
    url: string;
    senderId: string;
    onLoad?: () => void;
}

const imageCache = new Map<string, string>();

export const DecryptedImage = ({ url, senderId, onLoad }: DecryptedImageProps) => {
    const { t } = useTranslation('chat');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    const [inView, setInView] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const { user } = useAuthContext();
    const { privateKey } = useE2EE();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" } // Pre-load slightly before scrolling into view
        );
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;
        let isMounted = true;

        const loadAndDecrypt = async () => {
            if (!url || !user || !privateKey) return;
            
            // Bypass decryption if it's already an optimistic data URI
            if (url.startsWith('data:image')) {
                if (isMounted) {
                    setImageSrc(url);
                    setIsLoading(false);
                    if (onLoad) onLoad();
                }
                return;
            }

            // Check Cache
            if (imageCache.has(url)) {
                if (isMounted) {
                    setImageSrc(imageCache.get(url)!);
                    setIsLoading(false);
                    if (onLoad) onLoad();
                }
                return;
            }

            try {
                setIsLoading(true);
                setError(false);

                // ─── NEW: Handle E2EE_MEDIA:v1 Storage format ───
                if (url.startsWith('E2EE_MEDIA:v1:')) {
                    const parts = url.replace('E2EE_MEDIA:v1:', '').split('|');
                    const metaPart = parts[0]; // keyB64:ivB64:storagePath
                    const [keyB64, ivB64, ...pathParts] = metaPart.split(':');
                    const storagePath = pathParts.join(':');

                    const { downloadAndDecryptMedia } = await import('../../services/cryptoMedia');
                    const objectUrl = await downloadAndDecryptMedia(storagePath, keyB64, ivB64, 'image/jpeg');

                    if (!isMounted) {
                        URL.revokeObjectURL(objectUrl);
                        return;
                    }

                    imageCache.set(url, objectUrl);
                    setImageSrc(objectUrl);
                    setIsLoading(false);
                    if (onLoad) onLoad();
                    return;
                }

                // ─── LEGACY: Fetch encrypted base64 from URL ───
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);

                let encryptedPayload = await response.text();
                encryptedPayload = encryptedPayload.replace(/^["']|["']$/g, '').trim();

                const realSenderId = senderId === 'me' ? user.id : senderId;

                const decryptedBase64 = await decryptHybridMessage(
                    privateKey,
                    user.id,
                    realSenderId,
                    encryptedPayload
                );

                if (decryptedBase64.startsWith('🔒') || decryptedBase64 === encryptedPayload) {
                    if (decryptedBase64.startsWith('data:image')) {
                        // Recover gracefully
                    } else {
                        console.error('Decryption Output Check Failed:', decryptedBase64.substring(0, 50));
                        throw new Error('Inner decryption failed or produced invalid format');
                    }
                }

                const b64parts = decryptedBase64.split(';base64,');
                const contentType = (b64parts[0]?.split(':')[1]) || 'image/png';
                const raw = window.atob(b64parts[1]);
                const uInt8Array = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }
                const blob = new Blob([uInt8Array], { type: contentType });
                const objectUrlToSet = URL.createObjectURL(blob);

                if (!isMounted) {
                    URL.revokeObjectURL(objectUrlToSet);
                    return;
                }

                imageCache.set(url, objectUrlToSet);

                if (isMounted) {
                    setImageSrc(objectUrlToSet);
                    setIsLoading(false);
                    if (onLoad) onLoad();
                }
            } catch (err) {
                console.error('DecryptedImage Error details:', err);
                if (isMounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadAndDecrypt();

        return () => {
            isMounted = false;
        };
    }, [url, senderId, user, privateKey, inView]);

    if (!inView || isLoading) {
        return (
            <div ref={containerRef} className="w-full min-w-[200px] aspect-square flex flex-col items-center justify-center rounded-2xl border border-white/5 overflow-hidden relative animate-pulse">
                {/* Skeleton shimmer background */}
                <div className="absolute inset-0 bg-black/5 dark:bg-white/5" />
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
                    animation: 'shimmer 1.8s ease-in-out infinite',
                }} />
                {/* Centered image placeholder icon */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="opacity-[0.12] relative z-10">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 16l4.293-4.293a1 1 0 011.414 0L12 15l2.793-2.793a1 1 0 011.414 0L21 17" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span className="text-[10px] uppercase tracking-widest opacity-[0.15] font-bold mt-2 relative z-10">{t('decrypting')}</span>
                <style>{`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div ref={containerRef} className="w-full min-w-[200px] aspect-square flex flex-col items-center justify-center bg-red-500/5 rounded-2xl border border-red-500/10">
                <ImageOff size={24} className="text-red-500 opacity-40 mb-2" />
                <span className="text-[10px] uppercase tracking-widest text-red-500/60 font-bold">{t('failedDecryptImage')}</span>
            </div>
        );
    }

    return (
        <div ref={containerRef}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowLightbox(true)}
                className="relative group overflow-hidden rounded-2xl shadow-xl border border-white/10 bg-black/5 cursor-pointer max-w-[280px]"
            >
                <img
                    src={imageSrc!}
                    alt={t('decryptedMediaAlt')}
                    className="w-full h-auto max-h-[300px] object-cover block select-none pointer-events-none"
                    onLoad={onLoad}
                />

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = imageSrc!;
                            link.download = `secure_image_${Date.now()}.jpg`;
                            link.click();
                        }}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                        title={t('downloadDecryptedImage')}
                    >
                        <Download size={20} />
                    </button>
                </div>
            </motion.div>

            <ImageLightbox
                isOpen={showLightbox}
                onClose={() => setShowLightbox(false)}
                src={imageSrc ?? ''}
            />
        </div>
    );
};
