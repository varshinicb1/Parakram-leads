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
  },
});
