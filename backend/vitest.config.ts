import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-server.ts"],
    exclude: [
      "**/.kilo/**",
      "**/.kiro/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
    ],
    env: {
      NODE_ENV: "test",
      ADMIN_SECRET_KEY: "test-admin-key",
    },
  },
});
