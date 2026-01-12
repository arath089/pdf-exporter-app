import { defineConfig } from "vite";

export default defineConfig({
  build: {
    manifest: true,
    outDir: "dist",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/downloads": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
