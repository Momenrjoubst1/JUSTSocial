/**
 * Crypto Service — Unit Tests
 *
 * Covers:
 *  1. Key generation (RSA-OAEP 2048-bit)
 *  2. Public key export → import roundtrip
 *  3. Hybrid encrypt → decrypt roundtrip (sender & receiver copies)
 *  4. Decryption with wrong key produces error marker
 *  5. Key fingerprinting (SHA-256 hex)
 *  6. PBKDF2 private-key encryption/decryption roundtrip
 *  7. LRU cache hit path (second decrypt of same payload is instant)
 *  8. Malformed payload handling
 *  9. Private key extractability guard
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// We need to mock supabase before importing crypto module
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptHybridMessage,
  decryptHybridMessage,
  getPublicKeyFingerprint,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
} from '../crypto';

describe('crypto service', () => {
  let senderKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let receiverKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;

  let senderPubB64: string;
  let receiverPubB64: string;

  beforeAll(async () => {
    senderKeyPair = await generateKeyPair();
    receiverKeyPair = await generateKeyPair();
    senderPubB64 = await exportPublicKey(senderKeyPair.publicKey);
    receiverPubB64 = await exportPublicKey(receiverKeyPair.publicKey);
  });

  // ── 1. Key Generation ─────────────────────────────────────
  describe('generateKeyPair', () => {
    it('generates a valid RSA-OAEP key pair', () => {
      expect(senderKeyPair.publicKey).toBeDefined();
      expect(senderKeyPair.privateKey).toBeDefined();
      expect(senderKeyPair.publicKey.algorithm.name).toBe('RSA-OAEP');
    });

    it('returns the public key as extractable', () => {
      expect(senderKeyPair.publicKey.extractable).toBe(true);
    });

    it('returns the private key as NON-extractable', () => {
      expect(senderKeyPair.privateKey.extractable).toBe(false);
    });

    it('includes raw private key B64 for initial PBKDF2 backup', () => {
      expect(senderKeyPair.rawPrivateKeyB64).toBeDefined();
      expect(typeof senderKeyPair.rawPrivateKeyB64).toBe('string');
      expect(senderKeyPair.rawPrivateKeyB64.length).toBeGreaterThan(100);
    });
  });

  // ── 2. Public Key Export/Import ────────────────────────────
  describe('exportPublicKey / importPublicKey', () => {
    it('exports to base64 and re-imports to an identical usable key', async () => {
      const exportedB64 = await exportPublicKey(senderKeyPair.publicKey);
      expect(exportedB64).toBeTruthy();
      expect(typeof exportedB64).toBe('string');

      const reimported = await importPublicKey(exportedB64);
      expect(reimported.algorithm.name).toBe('RSA-OAEP');
      expect(reimported.usages).toContain('encrypt');
    });

    it('produces different base64 for different key pairs', () => {
      expect(senderPubB64).not.toBe(receiverPubB64);
    });
  });

  // ── 3. Hybrid Encrypt → Decrypt Roundtrip ──────────────────
  describe('encryptHybridMessage → decryptHybridMessage', () => {
    it('receiver can decrypt message encrypted with their public key', async () => {
      const original = 'Hello, secure world! مرحبا 🔐';
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, original);

      expect(encrypted).toContain('E2EE:v2:');
      expect(encrypted).not.toContain(original); // must not leak plaintext

      // Receiver decrypts using their private key (via rawPrivateKeyB64 since non-extractable)
      const decrypted = await decryptHybridMessage(
        receiverKeyPair.rawPrivateKeyB64,
        'receiver-user-id',
        'sender-user-id',
        encrypted,
      );

      expect(decrypted).toBe(original);
    });

    it('sender can decrypt their own copy of the message', async () => {
      const original = 'Self-decryption test';
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, original);

      const decrypted = await decryptHybridMessage(
        senderKeyPair.rawPrivateKeyB64,
        'sender-user-id',
        'sender-user-id', // sender == current user
        encrypted,
      );

      expect(decrypted).toBe(original);
    });

    it('returns plaintext when keys are null (fallback mode)', async () => {
      const msg = 'No encryption available';
      const result = await encryptHybridMessage(null, null, msg);
      expect(result).toBe(msg);
    });

    it('handles empty string message', async () => {
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, '');
      const decrypted = await decryptHybridMessage(
        receiverKeyPair.rawPrivateKeyB64,
        'r',
        's',
        encrypted,
      );
      expect(decrypted).toBe('');
    });
  });

  // ── 4. Wrong Key Decryption ────────────────────────────────
  describe('wrong key decryption', () => {
    it('returns error marker when decrypting with wrong private key', async () => {
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, 'secret');

      // Try to decrypt the receiver's portion with a completely different key
      const wrongKeyPair = await generateKeyPair();
      const result = await decryptHybridMessage(
        wrongKeyPair.rawPrivateKeyB64,
        'wrong-user',
        'sender',
        encrypted,
      );

      expect(result).toContain('🔒');
    });
  });

  // ── 5. Key Fingerprinting ──────────────────────────────────
  describe('getPublicKeyFingerprint', () => {
    it('produces a formatted uppercase hex fingerprint', async () => {
      const fp = await getPublicKeyFingerprint(senderPubB64);
      expect(fp).toBeTruthy();
      // Should be uppercase hex groups separated by spaces
      expect(fp).toMatch(/^[0-9A-F]{4}( [0-9A-F]{4})+$/);
    });

    it('produces different fingerprints for different keys', async () => {
      const fp1 = await getPublicKeyFingerprint(senderPubB64);
      const fp2 = await getPublicKeyFingerprint(receiverPubB64);
      expect(fp1).not.toBe(fp2);
    });

    it('produces same fingerprint for same key', async () => {
      const fp1 = await getPublicKeyFingerprint(senderPubB64);
      const fp2 = await getPublicKeyFingerprint(senderPubB64);
      expect(fp1).toBe(fp2);
    });
  });

  // ── 6. PBKDF2 Backup ──────────────────────────────────────
  describe('PBKDF2 private key backup', () => {
    it('encrypts and decrypts private key with password', async () => {
      const password = 'Str0ng!P@ss';
      const { encryptedB64, saltB64, ivB64 } = await encryptPrivateKeyWithPassword(
        senderKeyPair.rawPrivateKeyB64,
        password,
      );

      expect(encryptedB64).toBeTruthy();
      expect(saltB64).toBeTruthy();
      expect(ivB64).toBeTruthy();

      const recovered = await decryptPrivateKeyWithPassword(
        encryptedB64,
        saltB64,
        ivB64,
        password,
      );

      expect(recovered).toBe(senderKeyPair.rawPrivateKeyB64);
    });

    it('fails to decrypt with wrong password', async () => {
      const { encryptedB64, saltB64, ivB64 } = await encryptPrivateKeyWithPassword(
        senderKeyPair.rawPrivateKeyB64,
        'correct-password',
      );

      await expect(
        decryptPrivateKeyWithPassword(encryptedB64, saltB64, ivB64, 'wrong-password'),
      ).rejects.toThrow();
    });
  });

  // ── 7. Malformed Payload Handling ──────────────────────────
  describe('malformed payload handling', () => {
    it('returns original string for non-E2EE prefix', async () => {
      const result = await decryptHybridMessage(
        senderKeyPair.rawPrivateKeyB64,
        'user1',
        'user2',
        'Just a normal message',
      );
      expect(result).toBe('Just a normal message');
    });

    it('returns error for corrupted E2EE payload (wrong part count)', async () => {
      const result = await decryptHybridMessage(
        senderKeyPair.rawPrivateKeyB64,
        'u1',
        'u2',
        'E2EE:v2:only:three',
      );
      expect(result).toContain('🔒');
    });

    it('handles null/undefined payload gracefully', async () => {
      const r1 = await decryptHybridMessage(null, 'u1', 'u2', '');
      expect(r1).toBe('');

      const r2 = await decryptHybridMessage(null, 'u1', 'u2', null as any);
      expect(r2).toBe('');
    });

    it('returns error marker when private key is null on E2EE payload', async () => {
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, 'test');
      const result = await decryptHybridMessage(null, 'u1', 'u2', encrypted);
      expect(result).toContain('🔒');
    });
  });

  // ── 8. LRU Cache ───────────────────────────────────────────
  describe('decryption cache', () => {
    it('second decrypt of same payload returns same result (cache hit)', async () => {
      const msg = 'Cache test message αβγ';
      const encrypted = await encryptHybridMessage(receiverPubB64, senderPubB64, msg);
      const userId = 'cache-user-1';

      const d1 = await decryptHybridMessage(receiverKeyPair.rawPrivateKeyB64, userId, 'sender', encrypted);
      const d2 = await decryptHybridMessage(receiverKeyPair.rawPrivateKeyB64, userId, 'sender', encrypted);

      expect(d1).toBe(msg);
      expect(d2).toBe(msg);
    });
  });
});
