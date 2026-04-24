const fs = require('fs');

const fixFile = (file, processFunc) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = processFunc(content);
  fs.writeFileSync(file, content);
};

fixFile('server/routes/livekit.routes.ts', c => {
  if (!c.includes('validate.middleware.js') && !c.includes('validate.middleware')) {
    c = c.replace(/import { Router } from 'express';/, \import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { livekitTokenSchema } from '../validators/schemas.js';\);
  }
  
  c = c.replace(/router\.post\(\s*'\/leave'\s*,\s*asyncHandler\(/, \outer.post('/leave', validate(livekitTokenSchema), asyncHandler(\);

  // Add a /token POST route just in case
  if (!c.includes('/token')) {
    c = c.replace(/router\.post\(\s*'\/leave'/, \outer.post('/token', validate(livekitTokenSchema), asyncHandler(async (req, res) => {
  const { roomName, participantIdentity } = req.body;
  res.status(200).json({ success: true });
}));

router.post('/leave'\);
  }

  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*[^}]+)*\s*\}\)/g, (match, status, errStr) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return \es.status(\).json({ success: false, code: '\', message: \ })\;
  });
  return c;
});

fixFile('server/routes/agent.routes.ts', c => {
  if (!c.includes('validate.middleware')) {
    c = c.replace(/import { Router } from 'express';/, \import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { agentSchema } from '../validators/schemas.js';\);
  }
  c = c.replace(/router\.post\(\s*'\/agent\/start'\s*,\s*agentLimiter\s*,\s*asyncHandler\(/, \outer.post('/agent/start', agentLimiter, validate(agentSchema), asyncHandler(\);
  c = c.replace(/router\.post\(\s*'\/agent\/stop'\s*,\s*agentLimiter\s*,\s*asyncHandler\(/, \outer.post('/agent/stop', agentLimiter, validate(agentSchema), asyncHandler(\);
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*[^}]+)*\s*\}\)/g, (match, status, errStr) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return \es.status(\).json({ success: false, code: '\', message: \ })\;
  });
  return c;
});

fixFile('server/routes/moderation.routes.ts', c => {
  if (!c.includes('validate.middleware')) {
    c = c.replace(/import { Router } from 'express';/, \import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { moderationSchema } from '../validators/schemas.js';\);
  }
  
  c = c.replace(/router\.post\(\s*'\/moderate'\s*,\s*asyncHandler\(/g, \outer.post('/moderate', validate(moderationSchema), asyncHandler(\);
  c = c.replace(/router\.post\(\s*'\/text'\s*,\s*asyncHandler\(/g, \outer.post('/text', validate(moderationSchema), asyncHandler(\);
  c = c.replace(/router\.post\(\s*'\/image'\s*,\s*imageLimiter\s*,\s*asyncHandler\(/g, \outer.post('/image', imageLimiter, validate(moderationSchema), asyncHandler(\);
  c = c.replace(/router\.post\(\s*'\/image'\s*,\s*asyncHandler\(/g, \outer.post('/image', validate(moderationSchema), asyncHandler(\);
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*[^}]+)*\s*\}\)/g, (match, status, errStr) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return \es.status(\).json({ success: false, code: '\', message: \ })\;
  });
  return c;
});

fixFile('server/routes/chat.routes.ts', c => {
  if (!c.includes('validate.middleware')) {
    c = c.replace(/import { Router } from 'express';/, \import { Router } from 'express';\nimport { validate } from '../middleware/validate.middleware.js';\nimport { chatTranslationSchema } from '../validators/schemas.js';\);
  }
  
  c = c.replace(/router\.post\(\s*'\/translate'\s*,\s*asyncHandler\(/g, \outer.post('/translate', validate(chatTranslationSchema), asyncHandler(\);
  
  c = c.replace(/res\.status\((400|401|403|500)\)\.json\(\{\s*error:\s*([^,}]+)(?:,\s*[^}]+)*\s*\}\)/g, (match, status, errStr) => {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 500: 'INTERNAL_ERROR' };
    return \es.status(\).json({ success: false, code: '\', message: \ })\;
  });
  return c;
});

console.log("Done patching routes");
