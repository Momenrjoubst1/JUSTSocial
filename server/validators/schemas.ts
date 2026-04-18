import { z } from 'zod';

export const livekitTokenSchema = z.object({
  roomName: z
    .string({ required_error: 'roomName is required' })
    .min(1, 'roomName cannot be empty')
    .max(100, 'roomName too long')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'roomName can only contain letters, numbers, hyphens, underscores'
    ),
  participantIdentity: z
    .string({ required_error: 'participantIdentity is required' })
    .min(1)
    .max(200),
});

export const livekitLeaveSchema = z.object({
  roomName: z
    .string({ required_error: 'roomName is required' })
    .min(1, 'roomName cannot be empty')
    .max(100, 'roomName too long'),
});

export const agentSchema = z.object({
  roomName: z
    .string({ required_error: 'roomName is required' })
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  identity: z
    .string()
    .uuid('identity must be a valid UUID')
    .optional(),
});

export const moderationSchema = z.object({
  imageBase64: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional(),
  identity: z.string().min(1).max(200).optional(),
  userId: z.string().uuid('Must be a valid UUID').optional(),
}).refine(
  (data) => data.imageBase64 ?? data.imageUrl,
  { message: 'Either imageBase64 or imageUrl is required' }
);

export const chatTranslationSchema = z.object({
  text: z
    .string({ required_error: 'text is required' })
    .min(1, 'text cannot be empty')
    .max(5000, 'text too long'),
  targetLang: z
    .string({ required_error: 'targetLang is required' })
    .length(2, 'targetLang must be a 2-letter language code')
    .regex(/^[a-z]{2}$/, 'targetLang must be lowercase letters only'),
});

export type LivekitTokenInput = z.infer<typeof livekitTokenSchema>;
export type AgentInput = z.infer<typeof agentSchema>;
export type ModerationInput = z.infer<typeof moderationSchema>;
export type ChatTranslationInput = z.infer<typeof chatTranslationSchema>;

export const reportSchema = z.object({
    reporterId: z.string().min(1),
    reportedUserId: z.string().optional(),
    reportedIdentity: z.string().optional(),
    reportedFingerprint: z.string().optional(),
    reason: z.string().optional(),
    description: z.string().optional(),
    roomName: z.string().optional(),
    livekitRoom: z.string().optional(),
    livekitIdentity: z.string().optional(),
    imageBase64: z.string().optional()
}).passthrough();

export const moderateSchema = z.object({
    imageBase64: z.string().optional(),
    identity: z.string().optional(),
    fingerprint: z.string().optional(),
    userId: z.string().optional(),
    roomName: z.string().optional()
}).passthrough();
