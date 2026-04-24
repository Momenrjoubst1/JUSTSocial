/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Text Moderator — Multi-layer text moderation system
 *
 * Layer 1: Local profanity filter (fast, offline) — bad-words + Arabic words
 * Layer 2: Regex pattern detection (PII, URLs, spam)
 * Layer 3: Perspective API (AI-powered, multilingual toxicity)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { Filter } from 'bad-words';
import axios from 'axios';

const localFilter = new Filter({ placeHolder: '*' });

// Extend with Arabic bad words & common letter-substitution bypasses
localFilter.addWords(
  // Arabic bad words
  'كلب', 'حمار', 'غبي', 'احمق', 'منيوك', 'كس', 'طيز', 'شرموطة', 'عرص', 'زبالة',
  'خول', 'معرص', 'قحبة', 'متناك', 'ابن الكلب', 'يلعن', 'زق', 'خرا',
  // Common letter-substitution bypasses
  'f*ck', 'sh*t', 'b*tch', 'f**k', 'a**', 'a55', 'sh1t', 'fck', 'sht',
  'b1tch', 'f u c k', 's h i t', 'a s s', 'p u s s y', 'd1ck', 'pr1ck',
  'stfu', 'gtfo', 'fuk', 'phuck', 'phuk'
);

// ─── Layer 2: Pattern-based detection ─────────────────────────────────────────

const PATTERNS = {
  /** Phone numbers (international formats) */
  phoneNumber: /(\+?\d[\s.-]?){8,15}\d/,
  /** Email addresses */
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /** URLs and links (http, www, common shorteners) */
  urls: /(?:https?:\/\/|www\.|bit\.ly|t\.me|wa\.me|discord\.gg|t\.co)[^\s]*/i,
  /** Repeated characters (spamming: "heeeeello", "!!!!!!!")  */
  spamRepeat: /(.)\1{5,}/,
  /** ALL CAPS spam (more than 8 consecutive caps chars) */
  allCaps: /\b[A-Z]{8,}\b/,
  /** Social media handles used to redirect users off-platform */
  socialRedirect: /@[a-zA-Z0-9_.]{3,}(?:\s|$)/,
};

// Replacement labels (Arabic)
const PII_REPLACEMENTS = {
  phoneNumber: '[رقم محذوف]',
  email: '[إيميل محذوف]',
  urls: '[رابط محذوف]',
} as const;

// ─── Layer 3: Perspective API (Google) ────────────────────────────────────────

interface PerspectiveResult {
  flagged: boolean;
  score: number;
  reason: string;
}

async function checkPerspective(text: string): Promise<PerspectiveResult> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return { flagged: false, score: 0, reason: 'api-disabled' };

  try {
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
      {
        comment: { text },
        languages: ['en', 'ar'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          THREAT: {},
          SEXUALLY_EXPLICIT: {},
        },
      },
      { timeout: 3000 }
    );

    const scores = response.data.attributeScores;
    const toxicity: number = scores.TOXICITY?.summaryScore?.value ?? 0;
    const severe: number = scores.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
    const sexual: number = scores.SEXUALLY_EXPLICIT?.summaryScore?.value ?? 0;
    const threat: number = scores.THREAT?.summaryScore?.value ?? 0;

    const maxScore = Math.max(toxicity, severe, sexual, threat);
    const flagged = maxScore > 0.75; // threshold: 75%

    return {
      flagged,
      score: maxScore,
      reason: flagged
        ? Object.entries({ toxicity, severe, sexual, threat })
            .sort((a, b) => b[1] - a[1])[0][0]
        : 'clean',
    };
  } catch {
    // Perspective API failed — fail OPEN (don't block the message)
    return { flagged: false, score: 0, reason: 'api-error' };
  }
}

// ─── Main Export: analyzeText() ───────────────────────────────────────────────

export interface ModerationResult {
  allowed: boolean;
  reason: string;   // 'clean' | 'profanity' | 'pii' | 'spam' | 'toxicity'
  cleaned?: string;  // censored version (if profanity / PII)
  score?: number;    // toxicity score 0–1 (from Perspective)
}

export async function analyzeText(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { allowed: true, reason: 'clean' };
  }

  // ── Layer 1: Local profanity filter (fast, offline) ─────────────────────
  const hasProfanity = localFilter.isProfane(text);
  if (hasProfanity) {
    return {
      allowed: false,
      reason: 'profanity',
      cleaned: localFilter.clean(text),
    };
  }

  // ── Layer 2: Pattern detection (PII, links, spam) ───────────────────────
  if (PATTERNS.phoneNumber.test(text)) {
    return {
      allowed: false,
      reason: 'pii',
      cleaned: text.replace(new RegExp(PATTERNS.phoneNumber, 'g'), PII_REPLACEMENTS.phoneNumber),
    };
  }
  if (PATTERNS.email.test(text)) {
    return {
      allowed: false,
      reason: 'pii',
      cleaned: text.replace(new RegExp(PATTERNS.email, 'g'), PII_REPLACEMENTS.email),
    };
  }
  if (PATTERNS.urls.test(text)) {
    return {
      allowed: false,
      reason: 'pii',
      cleaned: text.replace(new RegExp(PATTERNS.urls.source, 'gi'), PII_REPLACEMENTS.urls),
    };
  }
  if (PATTERNS.spamRepeat.test(text) || PATTERNS.allCaps.test(text)) {
    return { allowed: false, reason: 'spam' };
  }

  // ── Layer 3: Perspective API (async, multilingual AI) ───────────────────
  const perspective = await checkPerspective(text);
  if (perspective.flagged) {
    return {
      allowed: false,
      reason: 'toxicity',
      score: perspective.score,
    };
  }

  return { allowed: true, reason: 'clean', score: perspective.score };
}
