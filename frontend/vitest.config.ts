import { defineConfig } from 'vitest/config';

/**
 * Vitest defaults for this repo:
 * - NODE_ENV=test enables safe placeholders in server/config/*.ts when real .env is absent.
 * - ADMIN_SECRET_KEY matches server/tests/middleware/admin.middleware.test.ts expectations.
 *
 * Copy `.env.test.example` to `.env.test` if you prefer loading secrets from a file
 * (then extend this config with envDir + loadEnv or a small setup file).
 */
export default defineConfig({
  test: {
    environment: 'node',
// setupFiles: ['./tests/setup.ts'], // TODO: frontend tests
    exclude: [
      '**/.kilo/**',
      '**/.kiro/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
    ],
    env: {
      NODE_ENV: 'test',
      ADMIN_SECRET_KEY: 'test-admin-key',
    },
  },
});
