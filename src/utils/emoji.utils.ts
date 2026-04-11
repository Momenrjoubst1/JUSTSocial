/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Emoji Utilities — Apple-style emoji rendering
 *
 * Provides:
 *  - splitTextAndEmoji: splits a string into text/emoji segments
 *  - getEmojiImageUrl: returns Apple emoji image URL from emoji-datasource-apple
 *  - emojiToUnified: converts an emoji character to its unified hex representation
 * ════════════════════════════════════════════════════════════════════════════════
 */

export interface EmojiSegment {
  type: 'text' | 'emoji';
  value: string;
  /** The unified hex codepoint (dash-separated), only present for emoji segments */
  unified?: string;
}

// ── Comprehensive Unicode Emoji Regex ──────────────────────────────────────────
// Matches most emoji including:
//  - Emoji with variation selectors (FE0F)
//  - Emoji with skin-tone modifiers
//  - ZWJ sequences (family, profession combos)
//  - Flag sequences (regional indicators)
//  - Keycap sequences (#️⃣ etc.)
//  - Component emoji (numbers + keycap combining)
const EMOJI_REGEX =
  /(?:\p{RI}\p{RI}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{RI}\p{RI}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*(?:\u20E3)?|[\u{1F1E0}-\u{1F1FF}]{2}|[\u{1F3FB}-\u{1F3FF}]/gu;

/**
 * Converts an emoji character (or sequence) to its unified hex codepoint representation.
 * e.g. "😀" → "1f600", "👨‍👩‍👧" → "1f468-200d-1f469-200d-1f467"
 */
export function emojiToUnified(emoji: string): string {
  const codepoints: string[] = [];
  for (const cp of emoji) {
    const hex = cp.codePointAt(0)?.toString(16);
    if (hex) codepoints.push(hex);
  }
  return codepoints.join('-');
}

/**
 * Returns the URL for an Apple emoji image from emoji-datasource-apple.
 * Served locally via the `appleEmojiPlugin` Vite plugin (see vite.config.ts).
 * In dev: Vite middleware serves PNGs from node_modules.
 * In build: the plugin copies them to dist/apple-emoji/.
 *
 * Falls back to empty string if the image cannot be found.
 */
export function getEmojiImageUrl(unified: string): string {
  if (!unified) return '';
  const codepoint = unified.toLowerCase();
  return `/apple-emoji/${codepoint}.png`;
}

/**
 * Splits a string into alternating text and emoji segments.
 * 
 * @example
 * splitTextAndEmoji("Hello 😀 World 🎉")
 * // → [
 * //   { type: 'text', value: 'Hello ' },
 * //   { type: 'emoji', value: '😀', unified: '1f600' },
 * //   { type: 'text', value: ' World ' },
 * //   { type: 'emoji', value: '🎉', unified: '1f389' },
 * // ]
 */
export function splitTextAndEmoji(text: string): EmojiSegment[] {
  if (!text) return [];

  const segments: EmojiSegment[] = [];
  let lastIndex = 0;

  // Reset regex state 
  EMOJI_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = EMOJI_REGEX.exec(text)) !== null) {
    // Add text before this emoji (if any)
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }

    const emoji = match[0];
    segments.push({
      type: 'emoji',
      value: emoji,
      unified: emojiToUnified(emoji),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last emoji
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Quick check: does a string contain any emoji?
 */
export function containsEmoji(text: string): boolean {
  if (!text) return false;
  EMOJI_REGEX.lastIndex = 0;
  return EMOJI_REGEX.test(text);
}

/**
 * Check if a string is ONLY emoji (no text), useful for rendering big emoji.
 */
export function isOnlyEmoji(text: string): boolean {
  if (!text || !text.trim) return false;
  const stripped = text.replace(EMOJI_REGEX, '').trim();
  return stripped.length === 0;
}

/**
 * Check if a message consists entirely of 1 to 5 emojis (and nothing else).
 * Used for triggering iOS-style "large emoji" message animations.
 * Uses the same EMOJI_REGEX as all other utilities for consistency.
 */
export function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Use the shared regex to extract all emoji matches
  EMOJI_REGEX.lastIndex = 0;
  const emojis = trimmed.match(EMOJI_REGEX) ?? [];
  // Remove all matched emoji and check if only whitespace remains
  EMOJI_REGEX.lastIndex = 0;
  const withoutEmoji = trimmed.replace(EMOJI_REGEX, '').trim();
  return emojis.length >= 1 && emojis.length <= 5 && withoutEmoji.length === 0;
}
