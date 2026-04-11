import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import data from '@emoji-mart/data';
import { Search } from 'lucide-react';
import { getEmojiImageUrl, emojiToUnified } from '@/utils/emoji.utils';
import '@/styles/emoji-picker.css';

const DEFAULT_RECENT = ['joy','heart','sparkles','fire','smile','sob','sweat_smile','pray','thumbsup','100','clap','eyes','partying_face','rofl','skull','sunglasses','pleading_face','smirk','wink','heart_eyes','kissing_heart','thinking_face','shrug','facepalm','rocket','tada'];

// Map the 9 categories exactly as requested by user's layout structure
const TABS = [
  { id: 'recent', icon: '🕐', title: 'Recent' },
  { id: 'people', icon: '😀', title: 'Smileys & People' },
  { id: 'nature', icon: '👋', title: 'Animals & Nature' },
  { id: 'foods', icon: '🐶', title: 'Food & Drink' },
  { id: 'activity', icon: '🍕', title: 'Activity' },
  { id: 'places', icon: '✈️', title: 'Travel & Places' },
  { id: 'objects', icon: '💡', title: 'Objects' },
  { id: 'symbols', icon: '❤️', title: 'Symbols' },
  { id: 'flags', icon: '🏳️', title: 'Flags' }
];

const TABS_ICONS = ['🕐', '😀', '👋', '🐶', '🍕', '✈️', '💡', '❤️', '🏳️'];
TABS.forEach((t, i) => t.icon = TABS_ICONS[i] || t.icon);

const SKIN_TONES = [
  { id: 1, color: '#FFCC44' },
  { id: 2, color: '#FFDFBD' },
  { id: 3, color: '#F3C19A' },
  { id: 4, color: '#C68642' },
  { id: 5, color: '#8D5524' },
  { id: 6, color: '#5C3317' }
];

const SLIDE_WIDTH = 560;

export interface EmojiPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ isOpen, onClose, onEmojiSelect }: EmojiPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [skinTone, setSkinTone] = useState(1);
    
    // Preview hover state — use ref to avoid re-renders on mouse move
    const [previewEmoji, setPreviewEmoji] = useState<any>(null);
    const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Animation state wrapper for unmounting
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    // Track state
    const trackRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const currentTranslateX = useRef(0);
    const dragOffset = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            if (searchInputRef.current) setTimeout(() => searchInputRef.current?.focus(), 50);
        } else if (shouldRender) {
            setIsClosing(true);
            const t = setTimeout(() => {
                setShouldRender(false);
                setSearchQuery('');
                setDebouncedQuery('');
            }, 140);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // Build the grid data structure
    const categoriesData = useMemo(() => {
        const catMap = new Map();
        
        let recentIds = [] as string[];
        try {
            const saved = localStorage.getItem('skillswap_recent_emojis');
            if (saved) {
                recentIds = JSON.parse(saved);
            }
        } catch(e) {}
        if (!recentIds.length) recentIds = DEFAULT_RECENT;

        // Populate recent
        const recentEmojis = recentIds.map(id => (data as any).emojis[id]).filter(Boolean);
        catMap.set('recent', recentEmojis);

        // Populate others from emoji-mart data
        (data as any).categories.forEach((cat: any) => {
            const catEmojis = cat.emojis.map((id: string) => (data as any).emojis[id]).filter(Boolean);
            catMap.set(cat.id, catEmojis);
        });

        return TABS.map(tab => ({
            id: tab.id,
            title: tab.title,
            emojis: catMap.get(tab.id) || []
        }));
    }, []);

    // ── Debounced search ────────────────────────────────────────────────────────
    const handleSearchInput = useCallback((val: string) => {
        setSearchQuery(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setDebouncedQuery(val), 200);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, []);

    // Search results processing — now uses debounced query with result cap
    const searchResults = useMemo(() => {
        if (!debouncedQuery.trim()) return null;
        const query = debouncedQuery.toLowerCase();
        
        const results: any[] = [];
        const seen = new Set<string>();
        
        for (const emoji of Object.values((data as any).emojis) as any[]) {
            if (seen.has(emoji.id)) continue;
            
            const match = emoji.id.includes(query) || 
                          emoji.name?.toLowerCase().includes(query) || 
                          emoji.keywords?.some((k: string) => k.toLowerCase().includes(query));
            if (match) {
                results.push(emoji);
                seen.add(emoji.id);
                if (results.length >= 100) break; // cap at 100 results
            }
        }
        
        return results;
    }, [debouncedQuery]);

    // Handle touch/mouse events for sliding
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || searchQuery) return;
            if (e.key === 'ArrowRight') {
                setActiveTab(p => Math.min(TABS.length - 1, p + 1));
            } else if (e.key === 'ArrowLeft') {
                setActiveTab(p => Math.max(0, p - 1));
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchQuery, onClose]);

    const getSkinVariation = useCallback((emojiObj: any) => {
        if (!emojiObj || !emojiObj.skins) return null;
        if (skinTone === 1) return emojiObj.skins[0];
        return emojiObj.skins.find((s: any) => s.skin === skinTone) || emojiObj.skins[0];
    }, [skinTone]);

    const handleEmojiClick = useCallback((emojiObj: any) => {
        const variation = getSkinVariation(emojiObj);
        if (variation && variation.native) {
            onEmojiSelect(variation.native);
            
            // Add to recent
            try {
                let saved = localStorage.getItem('skillswap_recent_emojis');
                let recentIds = saved ? JSON.parse(saved) : DEFAULT_RECENT;
                recentIds = [emojiObj.id, ...recentIds.filter((id: string) => id !== emojiObj.id)].slice(0, 36);
                localStorage.setItem('skillswap_recent_emojis', JSON.stringify(recentIds));
            } catch(e) {}
        }
    }, [getSkinVariation, onEmojiSelect]);

    // ── Debounced preview (avoids re-render on every mouse move) ─────────────
    const handlePreviewEnter = useCallback((emoji: any) => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        setPreviewEmoji(emoji);
    }, []);

    const handlePreviewLeave = useCallback(() => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = setTimeout(() => setPreviewEmoji(null), 100);
    }, []);

    // Drag behavior
    const handleDragStart = (clientX: number) => {
        setIsDragging(true);
        startX.current = clientX;
        currentTranslateX.current = -activeTab * SLIDE_WIDTH;
        dragOffset.current = 0;
        if (trackRef.current) {
            trackRef.current.classList.remove('is-animating');
        }
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging) return;
        
        let delta = clientX - startX.current;
        let newTranslate = currentTranslateX.current + delta;
        
        // Clamp with resistance
        const maxTranslate = 0;
        const minTranslate = -(TABS.length - 1) * SLIDE_WIDTH;
        
        if (newTranslate > maxTranslate) {
            newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.2;
        } else if (newTranslate < minTranslate) {
            newTranslate = minTranslate + (newTranslate - minTranslate) * 0.2;
        }
        
        dragOffset.current = delta;
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${newTranslate}px)`;
        }
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        
        let nextTab = activeTab;
        if (dragOffset.current < -60 && activeTab < TABS.length - 1) {
            nextTab = activeTab + 1;
        } else if (dragOffset.current > 60 && activeTab > 0) {
            nextTab = activeTab - 1;
        }
        
        setActiveTab(nextTab);
        snapTo(nextTab);
    };

    const snapTo = (index: number) => {
        if (trackRef.current) {
            trackRef.current.classList.add('is-animating');
            trackRef.current.style.transform = `translateX(-${index * SLIDE_WIDTH}px)`;
        }
    };

    // Sync tab changes
    useEffect(() => {
        if (!isDragging) snapTo(activeTab);
    }, [activeTab]);

    if (!shouldRender) return null;

    // ── Virtualized slide rendering ─────────────────────────────────────────────
    // Only render current slide + 1 neighbor on each side (3 of 9 total)
    const isSlideVisible = (idx: number) => {
        return Math.abs(idx - activeTab) <= 1;
    };

    const renderEmojiGrid = (emojis: any[]) => (
        <div className="emoji-picker-grid">
            {emojis.map((e, idx) => {
                const skin = getSkinVariation(e);
                if (!skin) return null;
                
                return (
                    <button
                        key={`${e.id}-${idx}`}
                        type="button"
                        className="emoji-picker-cell"
                        onMouseEnter={() => handlePreviewEnter(e)}
                        onMouseLeave={handlePreviewLeave}
                        onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            handleEmojiClick(e);
                        }}
                        title={e.name}
                    >
                        <img 
                            src={getEmojiImageUrl(skin.unified)} 
                            alt={skin.native}
                            draggable={false}
                            loading="lazy"
                        />
                    </button>
                );
            })}
        </div>
    );

    const activePreview = previewEmoji || categoriesData[activeTab]?.emojis[0];
    const previewSkin = activePreview ? getSkinVariation(activePreview) : null;

    return (
        <div 
            className={`emoji-picker-container ${isOpen && !isClosing ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}
            onClick={e => e.stopPropagation()}
        >
            {/* SECTION 1 - Search bar */}
            <div className="emoji-picker-search">
                <div className="emoji-picker-search-input-wrapper">
                    <Search size={16} className="text-white/40" />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        placeholder="Search emoji..." 
                        className="emoji-picker-search-input"
                    />
                </div>
            </div>

            {!searchResults ? (
                <>
                    {/* SECTION 2 - Category tabs */}
                    <div className="emoji-picker-tabs">
                        {TABS.map((tab, idx) => (
                            <button 
                                key={tab.id}
                                type="button"
                                className={`emoji-picker-tab ${activeTab === idx ? 'is-active' : ''}`}
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    setActiveTab(idx);
                                }}
                            >
                                <img 
                                    src={getEmojiImageUrl(emojiToUnified(tab.icon))} 
                                    alt={tab.icon} 
                                    style={{ width: '22px', height: '22px', pointerEvents: 'none', objectFit: 'contain' }}
                                />
                                {activeTab === idx && <div className="emoji-picker-tab-indicator" />}
                            </button>
                        ))}
                    </div>

                    {/* SECTION 3 - Horizontal slide carousel (VIRTUALIZED) */}
                    <div 
                        className="emoji-picker-carousel"
                        onMouseDown={e => handleDragStart(e.clientX)}
                        onMouseMove={e => handleDragMove(e.clientX)}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
                        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
                        onTouchEnd={handleDragEnd}
                    >
                        <div ref={trackRef} className="emoji-picker-track is-animating">
                            {categoriesData.map((cat, idx) => (
                                <div key={cat.id} className="emoji-picker-slide custom-scrollbar overflow-y-auto">
                                    {isSlideVisible(idx) ? (
                                        <>
                                            <div className="emoji-picker-slide-label">{cat.title}</div>
                                            {renderEmojiGrid(cat.emojis)}
                                        </>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 4 - Dot navigation */}
                    <div className="emoji-picker-dots">
                        {TABS.map((tab, idx) => (
                            <button 
                                key={tab.id} 
                                type="button"
                                className={`emoji-picker-dot ${activeTab === idx ? 'is-active' : ''}`}
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    setActiveTab(idx);
                                }}
                                aria-label={`Go to ${tab.title}`}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="emoji-picker-search-results custom-scrollbar">
                    <div className="emoji-picker-slide-label">Search results</div>
                    {searchResults.length > 0 ? (
                        renderEmojiGrid(searchResults)
                    ) : (
                        <div className="emoji-picker-no-results">No emoji found</div>
                    )}
                </div>
            )}

            {/* SECTION 5 - Footer preview bar */}
            <div className="emoji-picker-footer">
                <div className="emoji-picker-preview-img">
                    {previewSkin && (
                        <img 
                            src={getEmojiImageUrl(previewSkin.unified)} 
                            alt={previewSkin.native} 
                        />
                    )}
                </div>
                <div className="emoji-picker-preview-info">
                    <div className="emoji-picker-preview-name">{activePreview?.name || 'Emoji'}</div>
                    <div className="emoji-picker-preview-shortcode">{activePreview?.id ? `:${activePreview.id}:` : ''}</div>
                </div>
                <div className="emoji-picker-skin-tones">
                    {SKIN_TONES.map(tone => (
                        <button 
                            key={tone.id}
                            type="button"
                            className={`emoji-picker-skin-dot ${skinTone === tone.id ? 'is-active' : ''}`}
                            style={{ backgroundColor: tone.color }}
                            onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setSkinTone(tone.id);
                            }}
                            aria-label={`Skin tone ${tone.id}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
