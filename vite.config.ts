import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "next/navigation": "data:text/javascript,export default {}",
    },
  },
  build: {
    rollupOptions: {
      external: ["next/navigation"],
    },
  },
});
