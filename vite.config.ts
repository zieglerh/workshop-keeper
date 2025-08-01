import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: process.env.NODE_ENV === 'development', // ← wichtig für Docker (Inotify-Probleme vermeiden)
    },
    hmr: {
      host: process.env.HMR_HOST || 'localhost', // ← damit der Browser den HMR-WS korrekt verbindet
      port: 5173,
      protocol: 'ws',
      overlay: true
    },
    proxy: {
      '/api': 'http://' + process.env.HMR_HOST + ':3000',
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
