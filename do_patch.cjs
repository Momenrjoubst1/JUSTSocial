const fs = require('fs');
const path = require('path');

const schemasPath = path.join(__dirname, 'server/validators/schemas.ts');
const middlewarePath = path.join(__dirname, 'server/middleware/validate.middleware.ts');

fs.mkdirSync(path.join(__dirname, 'server/validators'), { recursive: true });
fs.writeFileSync(schemasPath, `import { z } from 'zod';

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

export const agentSchema = z.object({
  roomName: z
    .string({ required_error: 'roomName is required' })
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  action: z.enum(['start', 'stop'], {
    required_error: 'action must be start or stop',
  }).optional(),
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
`);

fs.mkdirSync(path.join(__dirname, 'server/middleware'), { recursive: true });
fs.writeFileSync(middlewarePath, `import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e: ZodError['errors'][0]) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        errors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
`);

const fixFile = (file, processFunc) => {
  let content = fs.readFileSync(file, 'utf8');
  content = processFunc(content);
  fs.writeFileSync(file, content);
};

fixFile('server/routes/livekit.routes.ts', c => {
  if (!c.includes('validate.middleware.js')) {
    c = c.replace(/import \{ Router \} from 'express';/, "import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { livekitTokenSchema } from '../validators/schemas.js';");
  }
  
  if (c.includes("router.post('/token',")) {
    c = c.replace(/router\.post\(\s*'\/token'\s*,/, "router.post('/token', validate(livekitTokenSchema),");
  }
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*([^}]+))*\s*\}\)/g, (match, status, errStr, extra) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return `res.status(${status}).json({ success: false, code: '${codeMap[status]}', message: ${errStr}${extra ? `, ${extra}` : ''} })`;
  });
  return c;
});

fixFile('server/routes/agent.routes.ts', c => {
  if (!c.includes('validate.middleware.js')) {
    c = c.replace(/import \{ Router \} from 'express';/, "import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { agentSchema } from '../validators/schemas.js';");
  }
  c = c.replace(/router\.post\(\s*'\/agent\/start'\s*,\s*agentLimiter\s*,\s*asyncHandler\(/, "router.post('/agent/start', agentLimiter, validate(agentSchema), asyncHandler(");
  c = c.replace(/router\.post\(\s*'\/agent\/stop'\s*,\s*agentLimiter\s*,\s*asyncHandler\(/, "router.post('/agent/stop', agentLimiter, validate(agentSchema), asyncHandler(");
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*([^}]+))*\s*\}\)/g, (match, status, errStr, extra) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return `res.status(${status}).json({ success: false, code: '${codeMap[status]}', message: ${errStr}${extra ? `, ${extra}` : ''} })`;
  });
  return c;
});

if (fs.existsSync('server/routes/moderation.routes.ts')) {
fixFile('server/routes/moderation.routes.ts', c => {
  if (!c.includes('validate.middleware.js')) {
    c = c.replace(/import \{ Router \} from 'express';/, "import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { moderationSchema } from '../validators/schemas.js';");
  }
  
  c = c.replace(/router\.post\(\s*'\/moderate'\s*,\s*asyncHandler\(/g, "router.post('/moderate', validate(moderationSchema), asyncHandler(");
  c = c.replace(/router\.post\(\s*'\/text'\s*,\s*asyncHandler\(/g, "router.post('/text', validate(moderationSchema), asyncHandler(");
  c = c.replace(/router\.post\(\s*'\/image'\s*,\s*imageLimiter\s*,\s*asyncHandler\(/g, "router.post('/image', imageLimiter, validate(moderationSchema), asyncHandler(");
  c = c.replace(/router\.post\(\s*'\/image'\s*,\s*asyncHandler\(/g, "router.post('/image', validate(moderationSchema), asyncHandler(");
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*([^}]+))*\s*\}\)/g, (match, status, errStr, extra) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return `res.status(${status}).json({ success: false, code: '${codeMap[status]}', message: ${errStr}${extra ? `, ${extra}` : ''} })`;
  });
  return c;
});
}

if (fs.existsSync('server/routes/chat.routes.ts')) {
fixFile('server/routes/chat.routes.ts', c => {
  if (!c.includes('validate.middleware.js')) {
    c = c.replace(/import \{ Router \} from 'express';/, "import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { chatTranslationSchema } from '../validators/schemas.js';");
  }
  
  c = c.replace(/router\.post\(\s*'\/translate'\s*,\s*asyncHandler\(/g, "router.post('/translate', validate(chatTranslationSchema), asyncHandler(");
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*([^}]+))*\s*\}\)/g, (match, status, errStr, extra) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return `res.status(${status}).json({ success: false, code: '${codeMap[status]}', message: ${errStr}${extra ? `, ${extra}` : ''} })`;
  });
  return c;
});
}

console.log("Done patching routes");
