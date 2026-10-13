import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  build: {
    target: "es2022",
    outDir: mode === "android" ? "dist-android" : "dist",
    copyPublicDir: mode !== "android",
  },
  server: {
    allowedHosts: process.env.AMBIANCE_PREVIEW_HOST
      ? [process.env.AMBIANCE_PREVIEW_HOST]
      : [],
  },
}));
