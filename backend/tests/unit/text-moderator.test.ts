import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeText } from '../../src/utils/text-moderator';

// Mock Perspective API calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: {
        attributeScores: {
          TOXICITY:         { summaryScore: { value: 0.1 } },
          SEVERE_TOXICITY:  { summaryScore: { value: 0.05 } },
          SEXUALLY_EXPLICIT:{ summaryScore: { value: 0.02 } },
          THREAT:           { summaryScore: { value: 0.01 } },
          INSULT:           { summaryScore: { value: 0.08 } },
        },
      },
    }),
  },
}));

describe('text-moderator — analyzeText', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows clean text', async () => {
    const result = await analyzeText('مرحبا كيف حالك');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('clean');
  });

  it('blocks profanity', async () => {
    const result = await analyzeText('you are so stupid f*ck');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('profanity');
  });

  it('blocks phone numbers', async () => {
    const result = await analyzeText('call me at +966501234567');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('pii');
  });

  it('blocks email addresses', async () => {
    const result = await analyzeText('email me at test@example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('pii');
  });

  it('blocks URLs', async () => {
    const result = await analyzeText('visit www.malicious-site.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('pii');
  });

  it('allows empty text', async () => {
    const result = await analyzeText('');
    expect(result.allowed).toBe(true);
  });

  it('blocks text longer than 2000 characters', async () => {
    const result = await analyzeText('a'.repeat(2001));
    expect(result.allowed).toBe(false);
  });

  describe('analyzeText — Edge Cases', () => {
    it('allows text with exactly 2000 characters (boundary)', async () => {
      const result = await analyzeText('a'.repeat(2000));
      // Should NOT block at exactly 2000
      expect(result).toBeDefined();
    });

    it('blocks text with 2001 characters (over boundary)', async () => {
      const result = await analyzeText('a'.repeat(2001));
      expect(result.allowed).toBe(false);
    });

    it('allows whitespace-only text', async () => {
      const result = await analyzeText('   ');
      expect(result.allowed).toBe(true);
    });

    it('handles mixed Arabic and English text', async () => {
      const result = await analyzeText('مرحبا hello كيف حالك');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('clean');
    });
  });

  describe('analyzeText — Error Cases', () => {
    it('allows message through when Perspective API is down', async () => {
      // Override axios mock to simulate API failure
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockRejectedValueOnce(
        new Error('Network Error')
      );

      // Layer 1 and 2 pass, Layer 3 fails → should fail open
      const result = await analyzeText('مرحبا كيف حالك');
      expect(result.allowed).toBe(true); // fail open
    });

    it('allows message through when Perspective API returns 429', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockRejectedValueOnce(
        Object.assign(new Error('Too Many Requests'), { response: { status: 429 } })
      );

      const result = await analyzeText('مرحبا');
      expect(result.allowed).toBe(true); // fail open on quota exceeded
    });

    it('blocks profanity even when Perspective API is down', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockRejectedValueOnce(
        new Error('Network Error')
      );

      // Layer 1 (local filter) should catch this regardless of API
      const result = await analyzeText('f*ck you');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('profanity');
    });
  });
});


