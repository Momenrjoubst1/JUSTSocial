import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface ReactionHeartProps {
    show: boolean;
    onComplete: () => void;
}

export const ReactionHeart = React.memo(({ show, onComplete }: ReactionHeartProps) => {
    const xOffsetRef = useRef((Math.random() * 8) + 4); // 4-12px wobble

    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => onComplete(), 800);
        return () => clearTimeout(t);
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                        scale: [0, 1.2, 1], 
                        opacity: [0, 1, 1],
                        y: [0, -40, -60],
                        x: [0, -xOffsetRef.current, xOffsetRef.current]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]"
                >
                    <Heart size={48} fill="#ef4444" stroke="#ef4444" />
                </motion.div>
            )}
        </AnimatePresence>
    );
});

ReactionHeart.displayName = 'ReactionHeart';
