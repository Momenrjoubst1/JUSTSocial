import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
    isMuted: boolean;
    onToggle: () => void;
    isDark: boolean;
}

export const MicButton = ({ isMuted, onToggle, isDark }: MicButtonProps) => (
    <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted 
            ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
            : (isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10')
        }`}
    >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
    </motion.button>
);
