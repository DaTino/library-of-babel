import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/  |  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  // For most hosts (Vercel / Netlify) the default "/" base is correct.
  // For a GitHub Pages *project* site, set this to "/<repo-name>/".
  base: "/",
  test: {
    // Phase 0 logic (graph derivation) is pure — no DOM needed.
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
