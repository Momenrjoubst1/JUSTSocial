/**
 * logger.ts — Simple application logging utility
 */

export function createLogger(module: string) {
  return {
    info: (msg: string, meta?: any) => console.log(`[${module}] INFO: ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[${module}] WARN: ${msg}`, meta || ''),
    error: (msg: string, meta?: any) => console.error(`[${module}] ERROR: ${msg}`, meta || '')
  };
}

// Compatible singleton for existing imports
export const logger = createLogger('app');
