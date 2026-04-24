import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface ReactionOverlayProps {
    show: boolean;
    onComplete: () => void;
    reactionType?: string | null; // لدعم أي إيموجي مستقبلاً
}

export const ReactionOverlay = React.memo(({ show, onComplete, reactionType = '❤️' }: ReactionOverlayProps) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 1.3],
                        opacity: [0, 1, 1],
                        y: [0, -20, 0]
                    }}
                    exit={{
                        scale: 1,
                        opacity: 0,
                        transition: { duration: 0.15 }
                    }}
                    transition={{
                        duration: 0.5,
                        ease: "easeOut",
                    }}
                    // استخدام onAnimationComplete بدلاً من setTimeout لضمان أداء مثالي
                    onAnimationComplete={() => onComplete()}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
                >
                    {reactionType === '❤️' ? (
                        <Heart
                            size={64}
                            fill="#ff3b30"
                            stroke="#ff3b30"
                            className="filter drop-shadow-[0_8px_20px_rgba(255,59,48,0.5)]"
                        />
                    ) : (
                        // في حال كان التفاعل إيموجي آخر غير القلب، نعطيه نفس الحجم وظل خفيف
                        <span
                            className="text-[64px] filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                            style={{ lineHeight: 1 }}
                        >
                            {reactionType}
                        </span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
});

ReactionOverlay.displayName = 'ReactionOverlay';