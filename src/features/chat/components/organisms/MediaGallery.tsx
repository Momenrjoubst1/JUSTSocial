import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Volume2, Grid3X3, Camera, Mic, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/context/ThemeContext';
import { downloadAndDecryptMedia } from '../../services/cryptoMedia';
import { DecryptedMediaLightbox, MediaItem } from './DecryptedMediaLightbox';
import { decryptHybridMessage } from '../../services/crypto';
import { useAuthContext } from '@/context/AuthContext';
import { useE2EE } from '../../hooks/useE2EE';

interface MediaGalleryProps {
    conversationId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface RawMediaRow {
    id: string;
    message_id: string;
    storage_path: string;
    mime_type: string;
    file_size: number;
    created_at: string;
    encrypted_content?: string;
}

const PAGE_SIZE = 30;

export const MediaGallery: React.FC<MediaGalleryProps> = ({ conversationId, isOpen, onClose }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user } = useAuthContext();
    const { privateKey } = useE2EE();
    
    const [items, setItems] = useState<MediaItem[]>([]);
    const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'image' | 'audio'>('all');

    // Lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const fetchMedia = useCallback(async (cursorDate?: string | null) => {
        if (isLoading || !conversationId) return;
        setIsLoading(true);

        try {
            let query = supabase
                .from('media_attachments')
                .select(`
                    id,
                    message_id,
                    storage_path,
                    mime_type,
                    file_size,
                    created_at,
                    messages!inner(encrypted_content, conversation_id, sender_id)
                `)
                .eq('messages.conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (filter === 'image') query = query.like('mime_type', 'image/%');
            if (filter === 'audio') query = query.like('mime_type', 'audio/%');
            if (cursorDate) query = query.lt('created_at', cursorDate);

            const { data, error } = await query;

            if (error) {
                console.error('MediaGallery fetch error:', error);
                setIsLoading(false);
                return;
            }

            if (!data || data.length === 0) {
                setHasMore(false);
                setIsLoading(false);
                return;
            }

            const mapped: MediaItem[] = data.map((row: any) => {
                return {
                    id: row.id,
                    storagePath: row.storage_path,
                    keyB64: '',
                    ivB64: '',
                    mimeType: row.mime_type,
                    createdAt: row.created_at,
                    _encryptedContent: (row as any).messages?.encrypted_content,
                    _senderId: (row as any).messages?.sender_id || '',
                };
            });

            const resolvedItems: MediaItem[] = [];
            for (const item of mapped) {
                const enc = (item as any)._encryptedContent;
                const senderId = (item as any)._senderId;
                if (!enc || !privateKey || !user) {
                    continue;
                }

                try {
                    // Try decrypting with the real sender_id first
                    let decrypted = await decryptHybridMessage(privateKey, user.id, senderId, enc);
                    
                    // If decryption failed, try the other way (sender vs receiver key)
                    if (decrypted.includes('فشل فك التشفير') || decrypted.includes('Decryption Failed')) {
                        decrypted = await decryptHybridMessage(privateKey, user.id, user.id, enc);
                    }

                    if (decrypted.startsWith('E2EE_MEDIA:v1:')) {
                        const parts = decrypted.replace('E2EE_MEDIA:v1:', '').split('|');
                        const metaPart = parts[0];
                        const [keyB64, ivB64] = metaPart.split(':');
                        resolvedItems.push({
                            ...item,
                            keyB64,
                            ivB64,
                        });
                    }
                } catch {
                    // If first attempt fails, try with user.id as senderId (fallback)
                    try {
                        const decrypted = await decryptHybridMessage(privateKey, user.id, user.id, enc);
                        if (decrypted.startsWith('E2EE_MEDIA:v1:')) {
                            const parts = decrypted.replace('E2EE_MEDIA:v1:', '').split('|');
                            const metaPart = parts[0];
                            const [keyB64, ivB64] = metaPart.split(':');
                            resolvedItems.push({
                                ...item,
                                keyB64,
                                ivB64,
                            });
                        }
                    } catch {
                        // Both attempts failed — skip this item
                    }
                }
            }

            setItems(prev => cursorDate ? [...prev, ...resolvedItems] : resolvedItems);
            setCursor(data[data.length - 1].created_at);
            setHasMore(data.length === PAGE_SIZE);
        } catch (err) {
            console.error('MediaGallery error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, filter, isLoading, privateKey, user]);

    // Reset on filter change or open
    useEffect(() => {
        if (!isOpen) return;
        setItems([]);
        setCursor(null);
        setHasMore(true);
        fetchMedia(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, filter]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!isOpen) return;

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                fetchMedia(cursor);
            }
        }, { threshold: 0.5 });

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [isOpen, hasMore, isLoading, cursor, fetchMedia]);

    // Load thumbnails lazily
    const loadThumbnail = useCallback(async (item: MediaItem) => {
        if (thumbnails.has(item.id) || !item.keyB64) return;
        try {
            const url = await downloadAndDecryptMedia(item.storagePath, item.keyB64, item.ivB64, item.mimeType);
            setThumbnails(prev => new Map(prev).set(item.id, url));
        } catch {
            // Silent fail for thumbnails
        }
    }, [thumbnails]);

    const imageCount = items.filter(i => i.mimeType?.startsWith('image/')).length;
    const audioCount = items.filter(i => i.mimeType?.startsWith('audio/')).length;

    const filters = [
        { key: 'all' as const, label: 'All', icon: <Grid3X3 size={14} />, count: items.length },
        { key: 'image' as const, label: 'Photos', icon: <Camera size={14} />, count: imageCount },
        { key: 'audio' as const, label: 'Audio', icon: <Mic size={14} />, count: audioCount },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className={`absolute inset-0 z-[200] flex flex-col overflow-hidden ${
                        isDark 
                            ? 'bg-[#0c0d11]/95 backdrop-blur-3xl' 
                            : 'bg-white/90 backdrop-blur-3xl'
                    }`}
                >
                    {/* ─── Premium Header ─── */}
                    <div className={`shrink-0 border-b ${
                        isDark ? 'border-white/[0.06]' : 'border-gray-200/60'
                    }`}>
                        <div className="h-[72px] flex items-center justify-between px-5">
                            <div className="flex items-center gap-3">
                                <motion.button 
                                    onClick={onClose} 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`p-2.5 rounded-2xl transition-all ${
                                        isDark 
                                            ? 'hover:bg-white/10 bg-white/[0.04] border border-white/[0.06]' 
                                            : 'hover:bg-gray-100 bg-gray-50 border border-gray-200/60'
                                    }`}
                                >
                                    <X size={18} />
                                </motion.button>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                                        <Sparkles size={15} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
                                        Shared Media
                                    </h3>
                                    <p className={`text-[11px] font-medium ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                        End-to-end encrypted
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ─── Filter Tabs (iOS pill style) ─── */}
                        <div className="px-5 pb-4">
                            <div className={`flex items-center gap-1 p-1 rounded-2xl ${
                                isDark ? 'bg-white/[0.04]' : 'bg-gray-100/80'
                            }`}>
                                {filters.map(f => (
                                    <motion.button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        whileTap={{ scale: 0.97 }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                                            filter === f.key
                                                ? (isDark 
                                                    ? 'bg-white/10 text-white shadow-sm shadow-white/5' 
                                                    : 'bg-white text-gray-900 shadow-sm')
                                                : (isDark 
                                                    ? 'text-white/35 hover:text-white/60' 
                                                    : 'text-gray-400 hover:text-gray-600')
                                        }`}
                                    >
                                        {f.icon}
                                        {f.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── Content Grid ─── */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                        {/* Empty State */}
                        {items.length === 0 && !isLoading && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full gap-4 select-none"
                            >
                                <div className="relative">
                                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-15 ${
                                        isDark ? 'bg-blue-400' : 'bg-blue-500'
                                    }`} style={{ transform: 'scale(1.8)' }} />
                                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                                        isDark 
                                            ? 'bg-white/[0.04] border border-white/[0.08]' 
                                            : 'bg-gray-100 border border-gray-200'
                                    }`}>
                                        <ImageIcon size={32} strokeWidth={1.5} className={isDark ? 'text-white/20' : 'text-gray-300'} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        No shared media yet
                                    </p>
                                    <p className={`text-xs max-w-[200px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                                        Photos and audio shared in this chat will appear here
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Media Grid */}
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
                            <AnimatePresence>
                                {items.map((item, idx) => (
                                    <MediaThumbnail
                                        key={item.id}
                                        item={item}
                                        index={idx}
                                        thumbnailUrl={thumbnails.get(item.id)}
                                        onVisible={() => loadThumbnail(item)}
                                        onClick={() => {
                                            setLightboxIndex(idx);
                                            setLightboxOpen(true);
                                        }}
                                        isDark={isDark}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Sentinel for infinite scroll */}
                        {hasMore && <div ref={sentinelRef} className="h-16 flex items-center justify-center">
                            {isLoading && (
                                <div className="flex gap-2">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-300'}`}
                                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>}
                    </div>

                    <DecryptedMediaLightbox
                        isOpen={lightboxOpen}
                        onClose={() => setLightboxOpen(false)}
                        items={items}
                        startIndex={lightboxIndex}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── Premium Thumbnail Sub-Component ───
interface MediaThumbnailProps {
    item: MediaItem;
    index: number;
    thumbnailUrl?: string;
    onVisible: () => void;
    onClick: () => void;
    isDark: boolean;
}

const MediaThumbnail: React.FC<MediaThumbnailProps> = ({ item, index, thumbnailUrl, onVisible, onClick, isDark }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                onVisible();
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [onVisible]);

    const isAudio = item.mimeType?.startsWith('audio/');

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.9 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
            onClick={onClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`aspect-square rounded-2xl overflow-hidden cursor-pointer relative group transition-all border ${
                isDark 
                    ? 'bg-white/[0.03] border-white/[0.06] hover:border-blue-500/30' 
                    : 'bg-gray-50 border-gray-200/60 hover:border-blue-500/30'
            }`}
        >
            {/* Skeleton loader */}
            {!visible && (
                <div className={`absolute inset-0 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                    <div className="absolute inset-0" style={{
                        background: isDark 
                            ? 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.02) 50%, transparent 70%)'
                            : 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                        animation: 'shimmer 1.8s ease-in-out infinite',
                    }} />
                </div>
            )}

            {/* Image thumbnail */}
            {visible && thumbnailUrl && !isAudio && (
                <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                />
            )}

            {/* Audio thumbnail */}
            {visible && isAudio && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className={`p-3 rounded-full ${
                        isDark ? 'bg-blue-500/15' : 'bg-blue-50'
                    }`}>
                        <Mic size={18} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-white/25' : 'text-gray-400'
                    }`}>Audio</span>
                    
                    {/* Audio waveform visualization */}
                    <div className="flex items-end gap-[2px] h-3">
                        {[3, 6, 4, 8, 5, 7, 3, 6, 4, 5].map((h, i) => (
                            <motion.div
                                key={i}
                                className={`w-[2px] rounded-full ${isDark ? 'bg-blue-400/30' : 'bg-blue-400/40'}`}
                                style={{ height: h }}
                                animate={{ height: [h, h * 1.5, h] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Loading shimmer for images waiting for decryption */}
            {visible && !thumbnailUrl && !isAudio && (
                <div className="absolute inset-0 overflow-hidden">
                    <div className={`absolute inset-0 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-100'}`} />
                    <div className="absolute inset-0" style={{
                        background: isDark 
                            ? 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.03) 50%, transparent 75%)'
                            : 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)',
                        animation: 'shimmer 1.8s ease-in-out infinite',
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className={`w-6 h-6 rounded-full border-2 border-t-transparent ${
                                isDark ? 'border-white/10' : 'border-gray-300'
                            }`}
                        />
                    </div>
                </div>
            )}

            {/* Hover overlay with gradient */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                isDark 
                    ? 'bg-gradient-to-t from-black/40 via-transparent to-transparent' 
                    : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'
            }`} />

            {/* Date badge on hover */}
            {visible && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[9px] font-bold text-white/80 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            )}
        </motion.div>
    );
};
