import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src/frontend") },
  },
  server: { port: 4000 },
  build: {
    outDir: "dist/frontend",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Stable, non-content-hashed filenames. There is no browser cache to
        // bust here — this bundle is shipped inside the MSI and the HTML
        // referencing it is regenerated from scratch every build, so hashed
        // filenames only cause WiX component churn (a new GUID per build for
        // a file whose logical identity never changed), which corrupts the
        // local MSI component database after repeated rebuild/reinstall
        // cycles and can make an uninstall silently reinstall stale files.
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
