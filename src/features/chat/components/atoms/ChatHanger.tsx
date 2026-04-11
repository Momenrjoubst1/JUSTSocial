import React from 'react';
import { motion } from 'framer-motion';

export type HangerId = 'none' | 'spider' | 'monkey' | 'star' | 'heart' | 'ufo' | 'ghost' | 'moon';

export const HANGER_OPTIONS: { id: HangerId; icon: string; label: string }[] = [
  { id: 'none', icon: '❌', label: 'بدون' },
  { id: 'spider', icon: '🕷️', label: 'عنكبوت' },
  { id: 'monkey', icon: '🐒', label: 'قرد' },
  { id: 'ghost', icon: '👻', label: 'شبح' },
  { id: 'ufo', icon: '🛸', label: 'طبق طائر' },
  { id: 'moon', icon: '🌙', label: 'قمر' },
  { id: 'star', icon: '⭐', label: 'نجمة' },
  { id: 'heart', icon: '💖', label: 'قلب' }
];

interface ChatHangerProps {
  hangerId?: string | null;
}

export const ChatHanger: React.FC<ChatHangerProps> = ({ hangerId }) => {
  if (!hangerId || hangerId === 'none') return null;

  const hanger = HANGER_OPTIONS.find(h => h.id === hangerId) || HANGER_OPTIONS[1];

  // Specific animation styles depending on the hanger
  const isSwinging = ['spider', 'monkey', 'ghost'].includes(hanger.id);

  return (
    <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-1 h-32 pointer-events-none z-50" style={{ perspective: '1000px' }}>
      <motion.div
        className="w-full h-full flex flex-col items-center origin-top relative"
        animate={
          isSwinging
            ? { rotate: [-15, 15, -15] }
            : { y: [0, 8, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: isSwinging ? 3 : 2.5,
          ease: "easeInOut",
        }}
      >
        {/* Thread */}
        <div className="w-[2px] h-12 bg-gradient-to-b from-foreground/50 to-foreground/20" />
        
        {/* Element */}
        <div className="text-3xl drop-shadow-2xl -mt-2 transform hover:scale-110 transition-transform">
          {hanger.icon}
        </div>
      </motion.div>
    </div>
  );
};
