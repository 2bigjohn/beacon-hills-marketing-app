import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_URL || "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        inventory: "inventory.html",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
