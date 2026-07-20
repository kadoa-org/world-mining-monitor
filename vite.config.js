import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at www.kadoa.com/mining via the kadoa dashboard's reverse proxy
// (see kadoa-backend apps/dashboard/next.config.mjs). The site lives
// natively under /mining/: `base` prefixes all asset URLs and the build
// output sits in dist/mining/ so the proxy needs no path rewriting.
export default defineConfig({
  base: "/mining/",
  plugins: [react()],
  server: { port: 5180 },
  build: { outDir: "dist/mining" },
});
