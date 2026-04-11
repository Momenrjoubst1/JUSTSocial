import React from 'react';
import { SocialConfigItem } from '../../constants';

interface SocialIconProps {
  config: SocialConfigItem;
}

export const SocialIcon: React.FC<SocialIconProps> = ({ config }) => {
  return (
    <div className="p-3 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl border border-white/40 dark:border-white/10 hover:scale-110 bg-white/50 dark:bg-black/40" style={{ color: config.color }}>
      {config.icon}
    </div>
  );
};
