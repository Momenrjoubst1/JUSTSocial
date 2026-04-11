import React, { useState, useEffect } from 'react';
import { AvatarFrame, FrameId } from '@/features/profile/components/atoms/AvatarFrame';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  isOnline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  frameId?: FrameId | string | null;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, name, size = 32, isOnline, className = '', style = {}, frameId 
}) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const combinedStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  };

  const renderContent = () => {
    if (!src || error || src === 'null' || src === 'undefined') {
      return (
        <div
          className="select-none"
          style={{
            ...combinedStyle,
            fontSize: Math.max(10, size * 0.4),
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {initials}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className="object-cover"
        style={combinedStyle}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    );
  };

  const dotSize = Math.max(8, size * 0.25);
  const dotOffset = Math.max(0, dotSize * 0.15);

  const innerSize = size;
  const frameSizeMap: Record<number, 'sm' | 'md' | 'lg' | 'xl'> = {
    32: 'sm',
    40: 'md',
    52: 'md',
    64: 'lg',
    128: 'xl',
    160: 'xl'
  };

  const frameSize = frameSizeMap[size] || (size > 100 ? 'xl' : 'md');

  const content = (
    <div className={`relative inline-block rounded-full ${className}`} style={{ width: size, height: size }}>
      {renderContent()}
      
      {isOnline && (
        <div 
          className="absolute rounded-full border-2 border-white dark:border-gray-950 bg-emerald-500 shadow-sm"
          style={{
            width: dotSize,
            height: dotSize,
            right: dotOffset,
            bottom: dotOffset,
            zIndex: 20 // ensure above frame
          }}
        >
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
        </div>
      )}
    </div>
  );

  if (frameId && frameId !== 'none') {
    return (
      <div className={`inline-block ${className}`} style={{ width: size + 8, height: size + 8 }}>
        <AvatarFrame frameId={frameId as FrameId} size={frameSize}>
          {content}
        </AvatarFrame>
      </div>
    );
  }

  return content;
};

