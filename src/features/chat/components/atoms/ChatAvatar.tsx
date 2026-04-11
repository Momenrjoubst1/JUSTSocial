import React from 'react';
import { Avatar } from '@/components/ui/core';

interface ChatAvatarProps {
    src: string;
    name: string;
    size?: number;
    isOnline?: boolean;
    className?: string;
}

export const ChatAvatar = React.memo(({ src, name, size = 32, isOnline, className = "" }: ChatAvatarProps) => {
    const dotSize = Math.max(6, Math.round(size / 4));
    const borderWidth = Math.max(1, Math.round(dotSize / 6));
    const dotStyle: React.CSSProperties = {
        width: dotSize,
        height: dotSize,
        borderWidth: borderWidth,
        boxSizing: 'border-box'
    };

    return (
        <div className={`relative inline-block rounded-full ${className}`}>
            <Avatar 
                src={src} 
                name={name} 
                size={size} 
                className="shadow-sm border border-white/5" 
            />
            {isOnline && (
                <span
                    style={dotStyle}
                    className="absolute bottom-0 right-0 bg-emerald-500 rounded-full shadow-sm animate-pulse ring-2 ring-emerald-500/20"
                />
            )}
        </div>
    );
});

ChatAvatar.displayName = 'ChatAvatar';
