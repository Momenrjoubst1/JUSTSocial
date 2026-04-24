import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const NODE_MODULES_SEGMENT = "/node_modules/";

function isNodeModulePackage(id: string, packageName: string) {
  return id.includes(`${NODE_MODULES_SEGMENT}${packageName}/`);
}

function appleEmojiPlugin() {
  const emojiPackageJson = require.resolve("emoji-datasource-apple/package.json");
  const emojiDir = path.resolve(path.dirname(emojiPackageJson), "img/apple/64");

  return {
    name: "apple-emoji",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/apple-emoji/")) return next();

        const filename = req.url.replace("/apple-emoji/", "");
        const filePath = path.join(emojiDir, filename);

        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        res.statusCode = 404;
        res.end();
      });
    },
    writeBundle(options: any) {
      const outDir = options.dir || path.resolve(__dirname, "dist");
      const destDir = path.join(outDir, "apple-emoji");

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = fs
        .readdirSync(emojiDir)
        .filter((file: string) => file.endsWith(".png"));

      for (const file of files) {
        fs.copyFileSync(path.join(emojiDir, file), path.join(destDir, file));
      }
    },
  };
}

export default defineConfig({
  envDir: "..",
  plugins: [
    react(),
    tailwindcss(),
    appleEmojiPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "SkillSwap",
        short_name: "SkillSwap",
        description: "Encrypted Skill Exchange & Secure Learning",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
    visualizer({
      open: false,
      filename: path.resolve(__dirname, "../reports/frontend-bundle-analysis.html"),
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    minify: "terser",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, "/");

          if (
            normalizedId.includes("@assistant-ui") ||
            normalizedId.includes("@ai-sdk") ||
            isNodeModulePackage(normalizedId, "ai") ||
            isNodeModulePackage(normalizedId, "react-markdown") ||
            isNodeModulePackage(normalizedId, "remark-gfm") ||
            isNodeModulePackage(normalizedId, "remark-parse") ||
            isNodeModulePackage(normalizedId, "remark-rehype") ||
            isNodeModulePackage(normalizedId, "react-syntax-highlighter") ||
            isNodeModulePackage(normalizedId, "react-shiki") ||
            isNodeModulePackage(normalizedId, "parse-diff") ||
            isNodeModulePackage(normalizedId, "diff") ||
            isNodeModulePackage(normalizedId, "unified") ||
            normalizedId.includes("/node_modules/micromark") ||
            normalizedId.includes("/node_modules/mdast-util-") ||
            normalizedId.includes("/node_modules/hast-util-") ||
            normalizedId.includes("/node_modules/unist-util-") ||
            normalizedId.includes("/node_modules/remark-") ||
            normalizedId.includes("/node_modules/rehype-") ||
            isNodeModulePackage(normalizedId, "vfile") ||
            isNodeModulePackage(normalizedId, "property-information") ||
            isNodeModulePackage(normalizedId, "space-separated-tokens") ||
            isNodeModulePackage(normalizedId, "comma-separated-tokens") ||
            isNodeModulePackage(normalizedId, "decode-named-character-reference") ||
            isNodeModulePackage(normalizedId, "trim-lines")
          ) {
            return "vendor-ai";
          }
          if (
            isNodeModulePackage(normalizedId, "i18next") ||
            isNodeModulePackage(normalizedId, "react-i18next") ||
            isNodeModulePackage(normalizedId, "i18next-browser-languagedetector")
          ) {
            return "vendor-i18n";
          }
          if (normalizedId.includes("three/addons") || normalizedId.includes("three/examples")) {
            return "vendor-three-addons";
          }
          if (normalizedId.includes("@pixiv/three-vrm") || normalizedId.includes("gl-matrix")) {
            return "vendor-vrm";
          }
          if (normalizedId.includes("@react-three")) {
            return "vendor-react-three";
          }
          if (isNodeModulePackage(normalizedId, "three")) {
            return "vendor-three";
          }
          if (normalizedId.includes("monaco-editor") || normalizedId.includes("@monaco-editor")) {
            return "vendor-editor";
          }
          if (normalizedId.includes("xterm")) {
            return "vendor-terminal";
          }
          if (normalizedId.includes("microsoft-cognitiveservices-speech-sdk")) {
            return "vendor-speech";
          }
          if (normalizedId.includes("tsparticles") || normalizedId.includes("@tsparticles")) {
            return "vendor-particles";
          }
          if (normalizedId.includes("framer-motion") || normalizedId.includes("motion")) {
            return "vendor-motion";
          }
          if (normalizedId.includes("livekit")) {
            return "vendor-livekit";
          }
          if (normalizedId.includes("chess.js")) {
            return "vendor-chess";
          }
          if (normalizedId.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (
            isNodeModulePackage(normalizedId, "react-router") ||
            isNodeModulePackage(normalizedId, "react-router-dom")
          ) {
            return "vendor-router";
          }
          if (
            normalizedId.includes("@radix-ui") ||
            isNodeModulePackage(normalizedId, "radix-ui") ||
            normalizedId.includes("@floating-ui") ||
            normalizedId.includes("react-remove-scroll") ||
            normalizedId.includes("react-remove-scroll-bar") ||
            normalizedId.includes("react-style-singleton") ||
            normalizedId.includes("aria-hidden") ||
            normalizedId.includes("use-callback-ref") ||
            normalizedId.includes("use-sidecar")
          ) {
            return "vendor-radix";
          }
          if (
            isNodeModulePackage(normalizedId, "react-dom") ||
            isNodeModulePackage(normalizedId, "scheduler") ||
            isNodeModulePackage(normalizedId, "react")
          ) {
            return "vendor-react";
          }
          if (normalizedId.includes("gsap") || normalizedId.includes("@gsap/react")) {
            return "vendor-gsap";
          }
          if (normalizedId.includes("@sentry") || normalizedId.includes("@fingerprintjs")) {
            return "vendor-monitoring";
          }
          if (normalizedId.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (normalizedId.includes("@emoji-mart")) {
            return "vendor-emoji";
          }
          if (normalizedId.includes("react-virtuoso")) {
            return "vendor-virtuoso";
          }
          if (normalizedId.includes("use-sound") || normalizedId.includes("html-to-image")) {
            return "vendor-media-utils";
          }
          if (normalizedId.includes("node_modules")) {
            return "vendor-core";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
    },
  },
});
