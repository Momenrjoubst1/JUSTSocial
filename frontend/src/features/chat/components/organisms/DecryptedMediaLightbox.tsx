import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, ImageOff, Mic, Shield } from 'lucide-react';
import { downloadAndDecryptMedia } from '../../services/cryptoMedia';
import { useTranslation } from 'react-i18next';

export interface MediaItem {
    id: string;
    storagePath: string;
    keyB64: string;
    ivB64: string;
    mimeType: string;
    createdAt: string;
}

interface DecryptedMediaLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    items: MediaItem[];
    startIndex: number;
}

export const DecryptedMediaLightbox: React.FC<DecryptedMediaLightboxProps> = ({ isOpen, onClose, items, startIndex }) => {
    const { t, i18n } = useTranslation('chat');
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const current = items[currentIndex];

    useEffect(() => {
        setCurrentIndex(startIndex);
    }, [startIndex]);

    useEffect(() => {
        if (!isOpen || !current) return;
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError(false);
            setObjectUrl(null);

            try {
                const url = await downloadAndDecryptMedia(current.storagePath, current.keyB64, current.ivB64, current.mimeType);
                if (!cancelled) {
                    setObjectUrl(url);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Lightbox decrypt error:', err);
                if (!cancelled) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        load();
        return () => { cancelled = true; };
    }, [isOpen, current]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(i => i - 1);
            if (e.key === 'ArrowRight' && currentIndex < items.length - 1) setCurrentIndex(i => i + 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, currentIndex, items.length, onClose]);

    const isImage = current?.mimeType?.startsWith('image/');
    const isAudio = current?.mimeType?.startsWith('audio/');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-2xl"
                    onClick={onClose}
                >
                    {/* ─── Top Bar (glassmorphic) ─── */}
                    <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-20"
                         onClick={e => e.stopPropagation()}>
                        {/* Close */}
                        <motion.button 
                            onClick={onClose} 
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </motion.button>

                        <div className="flex items-center gap-2">
                            {/* E2EE badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40 text-[10px] font-bold">
                                <Shield size={10} />
                                {t('encrypted')}
                            </div>

                            {/* Download */}
                            {!isLoading && !error && objectUrl && (
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const link = document.createElement('a');
                                        link.href = objectUrl;
                                        link.download = `secure_media_${Date.now()}.${isAudio ? 'webm' : 'jpg'}`;
                                        link.click();
                                    }}
                                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition-all"
                                    title={t('download')}
                                >
                                    <Download size={20} />
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* ─── Nav Left ─── */}
                    {currentIndex > 0 && (
                        <motion.button
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.1, x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i - 1); }}
                            className="absolute left-4 md:left-8 p-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition-all z-10"
                        >
                            <ChevronLeft size={26} />
                        </motion.button>
                    )}

                    {/* ─── Nav Right ─── */}
                    {currentIndex < items.length - 1 && (
                        <motion.button
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.1, x: 2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i + 1); }}
                            className="absolute right-4 md:right-8 p-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition-all z-10"
                        >
                            <ChevronRight size={26} />
                        </motion.button>
                    )}

                    {/* ─── Content ─── */}
                    <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {/* Loading State */}
                        {isLoading && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-5"
                            >
                                <div className="w-72 h-52 rounded-3xl bg-white/[0.04] border border-white/[0.06] relative overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.03) 50%, transparent 75%)',
                                        animation: 'shimmer 1.8s ease-in-out infinite',
                                    }} />
                                    {/* Spinning decryption indicator */}
                                    <div className="relative">
                                        <motion.div 
                                            className="w-12 h-12 rounded-full border-2 border-white/10 border-t-blue-400/50"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                        />
                                        <Shield size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20" />
                                    </div>
                                </div>
                                <p className="text-white/30 text-xs font-medium">{t('decryptingMedia')}</p>
                                <style>{`
                                    @keyframes shimmer {
                                        0% { transform: translateX(-100%); }
                                        100% { transform: translateX(100%); }
                                    }
                                `}</style>
                            </motion.div>
                        )}

                        {/* Error State */}
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/[0.04] border border-red-500/20"
                            >
                                <div className="p-4 rounded-full bg-red-500/10">
                                    <ImageOff size={32} className="text-red-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-red-400 text-sm font-bold mb-1">{t('decryptionFailedTitle')}</p>
                                    <p className="text-white/30 text-xs">{t('decryptionFailedDescription')}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Image */}
                        {!isLoading && !error && objectUrl && isImage && (
                            <motion.img
                                key={currentIndex}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                src={objectUrl}
                                alt={t('decryptedMediaAlt')}
                                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                            />
                        )}

                        {/* Audio Player */}
                        {!isLoading && !error && objectUrl && isAudio && (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35 }}
                                className="bg-white/[0.06] backdrop-blur-3xl p-10 rounded-3xl flex flex-col items-center gap-6 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                            >
                                {/* Audio icon with animated ring */}
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-blue-400/20"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <div className="p-5 rounded-full bg-blue-500/15 border border-blue-400/10">
                                        <Mic size={32} className="text-blue-400" />
                                    </div>
                                </div>
                                
                                {/* Audio waveform visualization */}
                                <div className="flex items-end gap-[3px] h-6">
                                    {[4, 8, 6, 12, 7, 10, 5, 9, 6, 11, 4, 8, 5, 7, 3].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-[3px] rounded-full bg-blue-400/40"
                                            style={{ height: h }}
                                            animate={{ height: [h, h * 1.6, h] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.06 }}
                                        />
                                    ))}
                                </div>

                                <audio controls src={objectUrl} className="w-80 rounded-lg" />
                                
                                <p className="text-white/25 text-[10px] font-bold tracking-wider uppercase">
                                    {t('encryptedVoiceMessage')}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* ─── Bottom Bar ─── */}
                    {items.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20"
                             onClick={e => e.stopPropagation()}>
                            {/* Counter pill */}
                            <div className="px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.08] text-white/60 text-xs font-bold">
                                {currentIndex + 1} / {items.length}
                            </div>
                            
                            {/* Date */}
                            {current && (
                                <div className="px-3 py-2 rounded-full bg-white/[0.05] text-white/30 text-[10px] font-medium">
                                    {new Date(current.createdAt).toLocaleDateString(i18n.language, { 
                                        month: 'short', day: 'numeric', year: 'numeric' 
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
