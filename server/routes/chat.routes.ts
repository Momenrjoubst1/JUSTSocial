import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { chatTranslationSchema } from '../validators/schemas.js';
import { textCheckLimiter } from '../middleware/rate-limiters.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const TARGET_LANG_PROMPTS: Record<string, string> = {
  'auto-correct': 'auto-correct',
  'en-casual': 'modern, daily conversational English (casual/street slang)',
  'en-formal': 'highly formal, professional, and grammatically perfect English',
  'ar-formal': 'العربية الفصحى المعاصرة (رسمية واضحة ومحترفة)',
  'ar-sa': 'اللهجة السعودية الدارجة (عامية أهل السعودية)',
  'ar-eg': 'اللهجة المصرية الدارجة (عامية الشارع المصري)',
  'ar-lev': 'اللهجة الشامية الدارجة (سوري/لبناني/أردني/فلسطيني)',
  'ar-gulf': 'اللهجة الخليجية الدارجة (عامية أهل الخليج)',
  'ar-ma': 'الدارجة المغربية (عامية أهل المغرب)',
  'fr-casual': 'modern, daily conversational French (casual/street)',
  'es-casual': 'modern, daily conversational Spanish (casual/street)',
};

const GOOGLE_LANG_FALLBACK: Record<string, string> = {
  'auto-correct': 'auto',
  'en-casual': 'en',
  'en-formal': 'en',
  'ar-formal': 'ar',
  'ar-sa': 'ar',
  'ar-eg': 'ar',
  'ar-lev': 'ar',
  'ar-gulf': 'ar',
  'ar-ma': 'ar',
  'fr-casual': 'fr',
  'es-casual': 'es',
};

function sanitizeResponseText(text: string, fallback: string): string {
  const clean = text.replace(/^["']|["']$/g, '').trim();
  return clean || fallback;
}

async function translateWithGoogle(text: string, targetLang: string, signal?: AbortSignal): Promise<string> {
  const fallbackCode = GOOGLE_LANG_FALLBACK[targetLang] || 'en';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${fallbackCode}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Google translate failed: ${res.status}`);

  const json = await res.json() as unknown;
  if (!Array.isArray(json) || !Array.isArray(json[0])) return text;

  const translated = (json[0] as unknown[])
    .map((item) => (Array.isArray(item) ? String(item[0] ?? '') : ''))
    .join('');

  return translated || text;
}

async function translateWithGroq(
  text: string,
  targetLang: string,
  fullLangName: string,
  groqKey: string,
  signal?: AbortSignal,
): Promise<string> {
  const systemPrompt = targetLang === 'auto-correct'
    ? 'You are a professional text editor. Your task is to correct any spelling, grammatical, or typographical errors in the given text. Keep the exact same language, tone, and dialect. DO NOT translate to another language. ONLY return the corrected text, with no quotes or explanations.'
    : `You are a native bilingual chat user. Convert the following text exactly into this specific language/dialect/tone: "${fullLangName}". Make it sound incredibly natural for a native speaker of that specific dialect or tone, using modern phrasing. DO NOT be literal. Return ONLY the final translated string, no quotes, no extra text.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model: process.env.GROQ_TRANSLATION_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  });

  if (!res.ok) throw new Error(`Groq translate failed: ${res.status}`);

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Groq returned empty translation');
  return content;
}

router.post('/translate', textCheckLimiter, validate(chatTranslationSchema), asyncHandler(async (req, res) => {
  const { text, targetLang } = req.body as { text?: string; targetLang?: string };

  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'text is required'  });
    return;
  }

  if (typeof targetLang !== 'string' || !TARGET_LANG_PROMPTS[targetLang]) {
    res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'invalid targetLang'  });
    return;
  }

  const input = text.trim().slice(0, 2000);
  const fullLangName = TARGET_LANG_PROMPTS[targetLang] || 'English';
  const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  let translated = input;

  try {
    if (groqKey) {
      translated = await translateWithGroq(input, targetLang, fullLangName, groqKey);
    } else if (targetLang !== 'auto-correct') {
      translated = await translateWithGoogle(input, targetLang);
    }
  } catch {
    if (targetLang !== 'auto-correct') {
      try {
        translated = await translateWithGoogle(input, targetLang);
      } catch {
        translated = input;
      }
    }
  }

  res.json({ translated: sanitizeResponseText(translated, input) });
}));

export default router;