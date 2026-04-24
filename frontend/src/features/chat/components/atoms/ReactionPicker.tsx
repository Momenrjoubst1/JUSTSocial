import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X } from 'lucide-react';
import { EmojiText } from '@/components/ui/EmojiText';
import { useTranslation } from 'react-i18next';
import data from '@emoji-mart/data';
import { getEmojiImageUrl, emojiToUnified } from '@/utils/emoji.utils';

interface ReactionPickerProps {
    show: boolean;
    onSelect: (emoji: string) => void;
    onClose: () => void;
    isDark: boolean;
    isMe: boolean;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

/* ── Lightweight full-picker that reuses our own Apple emoji system ── */
function InlineFullPicker({ 
    isDark, 
    onSelect 
}: { 
    isDark: boolean; 
    onSelect: (emoji: string) => void; 
}) {
    const { t } = useTranslation('chat');
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => { searchRef.current?.focus(); }, []);

    // Debounced search
    const handleSearchChange = useCallback((val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(val), 200);
    }, []);

    const categories = useMemo(() => {
        const cats = (data as any).categories as { id: string; emojis: string[] }[];
        return cats.map(cat => ({
            id: cat.id,
            emojis: cat.emojis.map((id: string) => (data as any).emojis[id]).filter(Boolean)
        }));
    }, []);

    const searchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        const q = debouncedSearch.toLowerCase();
        const results: any[] = [];
        const seen = new Set<string>();
        for (const emoji of Object.values((data as any).emojis) as any[]) {
            if (seen.has(emoji.id)) continue;
            if (emoji.id.includes(q) || emoji.name?.toLowerCase().includes(q) || emoji.keywords?.some((k: string) => k.includes(q))) {
                results.push(emoji);
                seen.add(emoji.id);
                if (results.length >= 80) break; // cap results
            }
        }
        return results;
    }, [debouncedSearch]);

    const CAT_ICONS = ['😀', '👋', '🐶', '🍕', '⚽', '✈️', '💡', '❤️', '🏳️'];

    const renderGrid = (emojis: any[]) => (
        <div className="grid grid-cols-8 gap-0.5">
            {emojis.map((e, i) => {
                const skin = e.skins?.[0];
                if (!skin) return null;
                return (
                    <button
                        key={`${e.id}-${i}`}
                        type="button"
                        onClick={() => onSelect(skin.native)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                        <img 
                            src={getEmojiImageUrl(skin.unified)} 
                            alt={skin.native} 
                            loading="lazy"
                            className="w-6 h-6 object-contain pointer-events-none"
                        />
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className={`w-[320px] h-[400px] rounded-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200'}`}>
            {/* Search */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <div className={`flex-1 flex items-center gap-2 rounded-xl px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <Search size={14} className="opacity-40 flex-shrink-0" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder={t('searchEmoji')}
                        className="bg-transparent border-none outline-none text-sm flex-1 min-w-0"
                    />
                    {search && (
                        <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="opacity-40 hover:opacity-80">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Category tabs (hidden during search) */}
            {!searchResults && (
                <div className={`flex items-center justify-around px-2 py-1 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    {categories.map((cat, i) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(i)}
                            className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-all ${activeCategory === i ? (isDark ? 'bg-white/10' : 'bg-black/5') : ''}`}
                        >
                            <img src={getEmojiImageUrl(emojiToUnified(CAT_ICONS[i] || '😀'))} alt="" className="w-[18px] h-[18px] object-contain" />
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                {searchResults ? (
                    searchResults.length > 0 ? renderGrid(searchResults) : (
                        <div className="h-full flex items-center justify-center text-sm opacity-40">{t('noEmojiFound')}</div>
                    )
                ) : (
                    renderGrid(categories[activeCategory]?.emojis || [])
                )}
            </div>
        </div>
    );
}

export function ReactionPicker({ show, onSelect, onClose, isDark, isMe }: ReactionPickerProps) {
    const [showFullPicker, setShowFullPicker] = useState(false);

    useEffect(() => {
        if (!showFullPicker) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [showFullPicker]);

    return (
        <>
            <AnimatePresence>
                {show && (
                    <motion.div
                        key="reaction-overlay-bg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90]" 
                        onClick={() => {
                            if (showFullPicker) {
                                setShowFullPicker(false);
                            } else {
                                onClose();
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Full Emoji Picker Modal */}
            <AnimatePresence>
                {show && showFullPicker && (
                    <motion.div
                        key="full-picker-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`absolute bottom-full mb-4 z-[110] shadow-2xl rounded-2xl overflow-hidden ${isMe ? 'right-0' : 'left-0'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <InlineFullPicker
                            isDark={isDark}
                            onSelect={(emoji) => {
                                onSelect(emoji);
                                setShowFullPicker(false);
                                onClose();
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Reaction Bar */}
            <AnimatePresence>
                {show && !showFullPicker && (
                    <motion.div
                        key="quick-reaction-bar"
                        initial={{ opacity: 0, scale: 0.8, y: 10, x: isMe ? -20 : 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className={`absolute bottom-full mb-2 z-[100] flex items-center gap-1 p-1.5 rounded-full shadow-2xl border backdrop-blur-xl will-change-transform ${
                            isDark 
                                ? 'bg-[#1c1c1e]/90 border-white/10 shadow-black/60' 
                                : 'bg-white/90 border-gray-100 shadow-gray-200/40'
                        } ${isMe ? 'right-0' : 'left-0'}`}
                    >
                        {REACTIONS.map((emoji, index) => (
                            <motion.button
                                key={emoji}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.04 }}
                                whileHover={{ scale: 1.25, y: -4 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    onSelect(emoji);
                                    onClose();
                                }}
                                className="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors"
                            >
                                <EmojiText text={emoji} size={22} disableMagnify={true} />
                            </motion.button>
                        ))}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowFullPicker(true);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full ml-1 transition-colors ${
                                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                            }`}
                        >
                            <Plus size={16} className="opacity-60" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
