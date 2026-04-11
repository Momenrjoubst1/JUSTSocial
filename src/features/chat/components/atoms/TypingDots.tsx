import React from 'react';
import { motion } from 'framer-motion';

export const TypingDots = React.memo(() => (
  <span className="inline-flex items-center gap-[3px] h-5" aria-hidden>
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        className="w-[6px] h-[6px] rounded-full bg-current"
        style={{ willChange: 'transform' }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
      />
    ))}
  </span>
));

TypingDots.displayName = 'TypingDots';
