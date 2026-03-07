import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isProduction = process.env.NODE_ENV === "production";

// GitHub Pages project sites are served from a subpath, so production builds use
// relative asset URLs and work without injecting a repo-specific base in CI.
export default defineConfig({
  base: isProduction ? "./" : "/",
  plugins: [react(), tailwindcss()],
});
