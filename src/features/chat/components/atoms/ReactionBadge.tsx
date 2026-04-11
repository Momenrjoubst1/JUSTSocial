import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { EmojiText } from '@/components/ui/EmojiText';
import { useAuthContext } from '@/context/AuthContext';
import { useChatContext } from '@/features/chat/ChatProvider';

interface ReactionBadgeProps {
    reactions?: Record<string, string>;
    reactionType?: string | null; // Backward compatibility
    reactionBy?: string | null;   // Backward compatibility
    isMe: boolean;
}

const nameCache = new Map<string, string>();

export const ReactionBadge = React.memo(({ reactions, reactionType, reactionBy, isMe }: ReactionBadgeProps) => {
    const { user } = useAuthContext();
    const [showTooltip, setShowTooltip] = useState(false);
    const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const { activeChat } = useChatContext();

    // Normalize reactions
    const activeReactions = { ...reactions };
    if (reactionType && reactionBy && !activeReactions[reactionBy]) {
        activeReactions[reactionBy] = reactionType;
    }

    const reactorIds = Object.keys(activeReactions);

    const getInstantName = (id: string) => {
        if (id === user?.id) return 'You';
        if (id === activeChat?.id && activeChat.name) return activeChat.name;
        if (nameCache.has(id)) return nameCache.get(id)!;
        return null;
    };

    useEffect(() => {
        let isMounted = true;
        if (reactorIds.length === 0 || !showTooltip) return;

        const fetchNames = async () => {
            const missingIds = reactorIds.filter(id => getInstantName(id) === null);
            if (missingIds.length === 0) {
                return; // Nothing to fetch, it's instant!
            }

            setIsLoading(true);
            try {
                // Fetch missing users
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name, username')
                    .in('id', missingIds);

                if (isMounted && data && !error) {
                    const names = { ...displayNames };
                    // add new fetched
                    data.forEach(u => {
                        const name = u.id === user?.id ? 'You' : (u.full_name || u.username || 'Someone');
                        names[u.id] = name;
                        nameCache.set(u.id, name);
                    });
                    
                    setDisplayNames(names);
                }
            } catch (err) {
                console.error('Error fetching reaction users:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchNames();
        return () => { isMounted = false; };
    }, [showTooltip, activeChat, user]);

    if (reactorIds.length === 0) return null;

    // Aggregate emojis
    const emojiCounts: Record<string, number> = {};
    Object.values(activeReactions).forEach(emoji => {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    });
    
    const uniqueEmojis = Object.keys(emojiCounts);

    const getTooltipText = () => {
        return Object.entries(activeReactions).map(([id, emoji]) => {
            const name = getInstantName(id) || displayNames[id] || (isLoading ? '...' : 'Someone');
            return `${name}: ${emoji}`;
        }).join('\n');
    };

    return (
        <div
            className={`absolute bottom-[-14px] ${isMe ? 'right-[10px]' : 'left-[10px]'} z-50 cursor-help`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={() => setShowTooltip(true)}
            onTouchEnd={() => setShowTooltip(false)}
        >
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[100] whitespace-pre px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-2xl backdrop-blur-md border border-white/10 bg-black/80 text-white pointer-events-none text-center leading-tight"
                    >
                        {getTooltipText()}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 550, damping: 28 }}
                className="h-[24px] px-1 py-0.5 rounded-full dark:bg-zinc-800 bg-zinc-100 border-[2px] dark:border-background border-white shadow-sm flex items-center justify-center min-w-[24px]"
            >
                <div className="flex items-center space-x-[2px] relative cursor-pointer">
                    {uniqueEmojis.map((emoji, idx) => (
                        <div key={idx} className="flex items-center justify-center">
                            {emoji === '❤️' ? (
                                <Heart size={12} fill="#ef4444" stroke="#ef4444" className="mt-0.5" />
                            ) : (
                                <EmojiText text={emoji} size={13} disableMagnify={true} />
                            )}
                        </div>
                    ))}
                </div>
                {reactorIds.length > 1 && (
                    <span className="text-[10px] font-bold ml-1 text-foreground opacity-80">{reactorIds.length}</span>
                )}
            </motion.div>
        </div>
    );
});

ReactionBadge.displayName = 'ReactionBadge';