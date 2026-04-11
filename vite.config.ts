import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// ── Apple Emoji Plugin ─────────────────────────────────────────────────────────
// Serves emoji-datasource-apple PNGs locally from node_modules:
//  • Dev: middleware intercepts /apple-emoji/*.png and streams from node_modules
//  • Build: writeBundle copies PNGs to dist/apple-emoji/
function appleEmojiPlugin() {
  const emojiDir = path.resolve(
    __dirname,
    "node_modules/emoji-datasource-apple/img/apple/64"
  );

  return {
    name: "apple-emoji",

    // Dev: serve /apple-emoji/*.png from node_modules
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/apple-emoji/")) return next();

        const filename = req.url.replace("/apple-emoji/", "");
        const filePath = path.join(emojiDir, filename);

        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
          );
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    },

    // Production: copy emoji PNGs into dist/apple-emoji/
    writeBundle(options: any) {
      const outDir = options.dir || path.resolve(__dirname, "dist");
      const destDir = path.join(outDir, "apple-emoji");

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = fs.readdirSync(emojiDir).filter((f: string) => f.endsWith(".png"));
      for (const file of files) {
        fs.copyFileSync(path.join(emojiDir, file), path.join(destDir, file));
      }
    },
  };
}
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    appleEmojiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SkillSwap',
        short_name: 'SkillSwap',
        description: 'Encrypted Skill Exchange & Secure Learning',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    visualizer({
      open: false,
      filename: "bundle-analysis.html",
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('three') || id.includes('@react-three') || id.includes('@pixiv/three-vrm')) {
            return 'vendor-3d';
          }
          if (id.includes('tsparticles') || id.includes('@tsparticles')) {
            return 'vendor-particles';
          }
          if (id.includes('framer-motion') || id.includes('motion')) {
            return 'vendor-motion';
          }
          if (id.includes('livekit')) {
            return 'vendor-livekit';
          }
          if (id.includes('chess.js')) {
            return 'vendor-chess';
          }
          if (id.includes('node_modules')) {
            return 'vendor-core';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,   // listen on all interfaces (LAN accessible)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
