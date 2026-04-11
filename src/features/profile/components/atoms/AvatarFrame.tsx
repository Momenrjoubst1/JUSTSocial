import React from 'react';
import { motion } from 'framer-motion';

export type FrameId = 'none' | 'neon' | 'gold' | 'cyberpunk' | 'nature' | 'rainbow' | 'glass';

interface AvatarFrameProps {
  frameId: FrameId;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AVATAR_FRAMES: { id: FrameId; name: string; description: string; colors: string[] }[] = [
  { id: 'none', name: 'No Frame', description: 'Simple and clean', colors: ['transparent'] },
  { id: 'neon', name: 'Neon Pulse', description: 'Electric blue glow', colors: ['#00f2ff', '#0072ff'] },
  { id: 'gold', name: 'Golden Royal', description: 'Elegant gold shimmer', colors: ['#ffd700', '#ba8b02'] },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic glitch style', colors: ['#ff00ff', '#00ffff'] },
  { id: 'nature', name: 'Earth Spirit', description: 'Verdant green nature', colors: ['#2ecc71', '#27ae60'] },
  { id: 'rainbow', name: 'Rainbow Dream', description: 'Vibrant spinning colors', colors: ['#ff0000', '#00ff00', '#0000ff'] },
  { id: 'glass', name: 'Crystal Glass', description: 'Premium frosted finish', colors: ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)'] },
];

export const AvatarFrame: React.FC<AvatarFrameProps> = ({ frameId, children, size = 'xl' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32 sm:w-40 sm:h-40',
  };

  const getFrameStyles = () => {
    switch (frameId) {
      case 'neon':
        return (
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 10px #00f2ff, 0 0 20px #00f2ff',
                '0 0 20px #00f2ff, 0 0 40px #00f2ff',
                '0 0 10px #00f2ff, 0 0 20px #00f2ff'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-1 rounded-full border-2 border-[#00f2ff] pointer-events-none z-10"
          />
        );
      case 'gold':
        return (
          <div className="absolute -inset-1 rounded-full pointer-events-none z-10 p-[2px] bg-gradient-to-tr from-[#ffd700] via-[#fff5b7] to-[#ba8b02] shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5], rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent"
            />
          </div>
        );
      case 'cyberpunk':
        return (
          <>
            <div className="absolute -inset-1 rounded-full border-2 border-[#ff00ff] pointer-events-none z-10 opacity-70" />
            <motion.div
              animate={{ opacity: [0, 1, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
              className="absolute -inset-2 rounded-full border border-[#00ffff] pointer-events-none z-10 opacity-50"
            />
            <div className="absolute top-0 right-0 w-4 h-4 bg-[#00ffff] clip-path-polygon-[0%_0%,100%_0%,100%_100%] z-20" />
          </>
        );
      case 'nature':
        return (
          <div className="absolute -inset-1 rounded-full border-4 border-green-500/30 pointer-events-none z-10">
            <svg className="absolute -top-2 -right-2 w-8 h-8 text-green-500 fill-current" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8.13,20C11.07,20 14,12.31 21,11C14,10.59 12.3,10.6 9,15C9.89,12.86 11.07,10 17,8Z" />
            </svg>
          </div>
        );
      case 'rainbow':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-full pointer-events-none z-10 p-[3px] bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"
          >
            <div className="w-full h-full rounded-full bg-background" />
          </motion.div>
        );
      case 'glass':
        return (
          <div className="absolute -inset-2 rounded-full pointer-events-none z-10 border border-white/40 bg-white/10 backdrop-blur-md shadow-lg" />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {getFrameStyles()}
      <div className="relative z-0 w-full h-full rounded-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};
