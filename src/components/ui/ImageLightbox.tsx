import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    src: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ isOpen, onClose, src }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoaded(false);
        }
    }, [isOpen, src]);

    useEffect(() => {
        if (!isOpen) return;

        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = originalStyle;
            window.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, onClose]);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8 cursor-pointer will-change-[opacity,backdrop-filter]"
                    onClick={onClose}
                >
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[10001] shadow-lg"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <X size={24} />
                    </motion.button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="relative w-full h-full flex items-center justify-center p-4 md:p-12 will-change-transform"
                        onClick={(e) => e.stopPropagation()}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.16}
                        onDragEnd={(_, info: PanInfo) => {
                            const offsetY = info.offset.y ?? 0;
                            if (Math.abs(offsetY) > 100) {
                                onClose();
                            }
                        }}
                        whileDrag={{ opacity: 0.95, scale: 0.998 }}
                    >
                        <div className="relative flex items-center justify-center w-full h-full max-w-[95vw] max-h-[85vh]">
                            {!isLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-48 h-36 rounded-2xl bg-white/[0.06] animate-pulse relative overflow-hidden">
                                        <div className="absolute inset-0" style={{
                                            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
                                            animation: 'shimmer 1.8s ease-in-out infinite',
                                        }} />
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] text-white">
                                            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                                            <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                                            <path d="M3 16l4.293-4.293a1 1 0 011.414 0L12 15l2.793-2.793a1 1 0 011.414 0L21 17" stroke="currentColor" strokeWidth="1.5"/>
                                        </svg>
                                        <style>{`
                                            @keyframes shimmer {
                                                0% { transform: translateX(-100%); }
                                                100% { transform: translateX(100%); }
                                            }
                                        `}</style>
                                    </div>
                                </div>
                            )}
                            <img
                                src={src}
                                loading="lazy"
                                onLoad={() => setIsLoaded(true)}
                                onError={() => setIsLoaded(true)}
                                className="max-w-full max-h-full rounded-[24px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] object-contain border border-white/5 select-none cursor-pointer"
                                alt="Preview"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};