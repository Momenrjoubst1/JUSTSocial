/**
 * ════════════════════════════════════════════════════════════════════════════════
 * EmojiText — Renders text with Apple-style emoji images
 *
 * Replaces native OS emoji with Apple emoji images from emoji-datasource-apple.
 * Renders consistently across Windows, Android, Linux, etc.
 *
 * Usage:
 *   <EmojiText text="Hello 😀 World!" />
 *   <EmojiText text="🎉🎊" size={28} />
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { memo, useMemo } from 'react';
import { splitTextAndEmoji, getEmojiImageUrl, isEmojiOnly, containsEmoji } from '@/utils/emoji.utils';

export interface EmojiTextProps {
  /** The text string that may contain emoji characters */
  text: string;
  /** Size of emoji images in pixels (default: 20) */
  size?: number;
  /** Additional CSS class for the wrapper */
  className?: string;
  /** Disable automatic magnification for single emojis */
  disableMagnify?: boolean;
  /** Whether the message consists exclusively of 1-5 emojis (Large mode) */
  emojiOnly?: boolean;
  /** What type of animation to play */
  animationType?: 'send' | 'receive' | 'none';
}

/**
 * Renders a text string with Apple-style emoji images replacing native emoji.
 * Plain text segments are rendered as <span>, emoji as <img>.
 * 
 * - Falls back gracefully: if the image fails to load, the native emoji is shown.
 * - Supports iOS-style staggered entrance send animations.
 */
export const EmojiText = memo(({ 
  text, 
  size = 20, 
  className = '', 
  disableMagnify = false,
  emojiOnly = false,
  animationType = 'none'
}: EmojiTextProps) => {
  const safeText = text || '';
  const hasEmoji = useMemo(() => containsEmoji(safeText), [safeText]);
  const segments = useMemo(() => hasEmoji ? splitTextAndEmoji(safeText) : [], [safeText, hasEmoji]);

  // Fast path: no emoji at all — render plain text
  if (!hasEmoji || !safeText) {
    return <span className={className}>{safeText}</span>;
  }

  const isTrulyEmojiOnly = !disableMagnify && (emojiOnly || isEmojiOnly(safeText));
  // User requested large emoji (42px) if ONLY 1-5 emojis exist
  const emojiSize = isTrulyEmojiOnly ? 42 : size;

  let emojiIndexCounter = 0;

  const contentNodes = segments.map((seg, i) => {
    if (seg.type === 'text') {
      return <span key={i}>{seg.value}</span>;
    }

    const url = getEmojiImageUrl(seg.unified!);
    const currentEmojiIndex = emojiIndexCounter++;

    const imgEl = (
      <span className="emoji-hover-wrap">
        <img
          src={url}
          alt={seg.value}
          draggable={false}
          loading="lazy"
          decoding="async"
          width={emojiSize}
          height={emojiSize}
          className="emoji-img"
          style={{
            display: 'inline-block',
            width: `${emojiSize}px`,
            height: `${emojiSize}px`,
            verticalAlign: isTrulyEmojiOnly ? 'bottom' : '-0.25em',
            margin: isTrulyEmojiOnly ? '0 2px' : '0 1px',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
          onError={(e) => {
            const img = e.currentTarget;
            const currentSrc = img.src;
            const withoutFe0f = seg.unified!.replace(/-fe0f/g, '');

            if (withoutFe0f !== seg.unified && !currentSrc.includes(withoutFe0f + '.png')) {
              img.src = getEmojiImageUrl(withoutFe0f);
              return;
            }

            const span = document.createElement('span');
            span.textContent = seg.value;
            span.style.fontSize = `${emojiSize}px`;
            span.style.lineHeight = '1';
            img.replaceWith(span);
          }}
        />
      </span>
    );

    if (isTrulyEmojiOnly) {
      // Large emoji format overrides the normal animation classes
      if (animationType === 'send' || animationType === 'receive') {
        return (
          <span 
            key={i} 
            className="emoji-large-entrance"
            style={{ animationDelay: `${currentEmojiIndex * 80}ms` }}
          >
            {imgEl}
          </span>
        );
      }
      return <React.Fragment key={i}>{imgEl}</React.Fragment>;
    }

    // Normal text inline mode
    if (animationType === 'send' || animationType === 'receive') {
      const staggerBase = animationType === 'receive' ? 35 : 40;
      const timingDelay = currentEmojiIndex * staggerBase;
      const animClass = animationType === 'send' ? 'emoji-pop' : 'emoji-float-in';

      return (
        <span 
          key={i} 
          className={animClass}
          style={{ animationDelay: `${timingDelay}ms` }}
        >
          {imgEl}
        </span>
      );
    }

    return <React.Fragment key={i}>{imgEl}</React.Fragment>;
  });

  if (isTrulyEmojiOnly) {
    return <div className="emoji-only-container">{contentNodes}</div>;
  }

  return (
    <span className={`emoji-text ${className}`}>
      {contentNodes}
    </span>
  );
});

EmojiText.displayName = 'EmojiText';
