import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'server/livekit-agent.py',
        '**/*.config.*',
      ],
      include: [
        'server/services/ban.service.ts',
        'server/services/room.service.ts',
        'server/services/agent.service.ts',
        'server/text-moderator.ts',
        'server/middleware/auth.middleware.ts',
        'server/middleware/admin.middleware.ts',
        'server/routes/ice.routes.ts',
        'server/routes/moderation.routes.ts'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      },
    },
    setupFiles: ['./server/tests/setup.ts'],
  },
});
