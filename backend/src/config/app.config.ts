const nodeEnv = process.env.NODE_ENV || 'development';

const frontendOrigins = (
  process.env.FRONTEND_URL || (nodeEnv === 'development' ? 'http://localhost:5173' : '')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (nodeEnv === 'production' && frontendOrigins.length === 0) {
  console.error('[Config Warning] FRONTEND_URL missing in production. Using fallback origins. Set FRONTEND_URL env var for CORS security.');
  frontendOrigins.push('http://localhost:3000', 'https://yourdomain.com'); // Safe fallback or empty
}

export const appConfig = {
  port: Number(process.env.PORT) || 3004,
  frontendOrigins,
  bodyLimit: '10mb',
  nodeEnv,
} as const;
