import React from 'react';
import { motion } from 'framer-motion';
import { Reply, Smile, MoreVertical } from 'lucide-react';
import { ReactionPicker } from '../atoms/ReactionPicker';
import { useState } from 'react';

interface MessageActionsProps {
    isMe: boolean;
    isDark: boolean;
    onReply: () => void;
    onMore: (e: React.MouseEvent) => void;
    onReaction: (emoji: string) => void;
}

export const MessageActions = React.memo(({ isMe, isDark, onReply, onMore, onReaction }: MessageActionsProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const buttonClass = `p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-foreground' : 'hover:bg-black/5 text-foreground'}`;

    return (
        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-300 ${showPicker ? 'opacity-100 z-[90]' : 'opacity-0 group-hover:opacity-100'} ${isMe ? 'right-full mr-3' : 'left-full ml-3'}`}>
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={onReply}
                className={buttonClass}
            >
                <Reply size={16} className="scale-x-[-1]" />
            </motion.button>
            <div className="relative">
                <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setShowPicker(!showPicker);
                    }}
                    className={buttonClass}
                >
                    <Smile size={16} />
                </motion.button>
                <ReactionPicker 
                    show={showPicker} 
                    onSelect={onReaction} 
                    onClose={() => setShowPicker(false)} 
                    isDark={isDark}
                    isMe={isMe}
                />
            </div>
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={onMore}
                className={buttonClass}
            >
                <MoreVertical size={16} />
            </motion.button>
        </div>
    );
});

MessageActions.displayName = 'MessageActions';
