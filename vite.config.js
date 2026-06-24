import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Served under https://<user>.github.io/beacon-hills-marketing-app/ on GitHub Pages,
// so the base path must match the repo name. Override with BASE_PATH for other hosts
// (Vercel/Netlify serve from root — set BASE_PATH=/).
const base = process.env.BASE_PATH ?? "/beacon-hills-marketing-app/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Beacon Hills Marketing Studio",
        short_name: "Beacon Hills",
        description: "Social media marketing assistant for Beacon Hills restaurant.",
        start_url: ".",
        display: "standalone",
        background_color: "#141414",
        theme_color: "#141414",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    })
  ]
});
