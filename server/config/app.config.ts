const nodeEnv = process.env.NODE_ENV || 'development';

const frontendOrigins = (
  process.env.FRONTEND_URL || (nodeEnv === 'development' ? 'http://localhost:5173' : '')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (nodeEnv === 'production' && frontendOrigins.length === 0) {
  throw new Error('[Config Error] Missing FRONTEND_URL in production (comma-separated origins allowed)');
}

export const appConfig = {
  port: Number(process.env.PORT) || 3004,
  frontendOrigins,
  bodyLimit: '10mb',
  nodeEnv,
} as const;
