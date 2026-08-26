import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        swSrc: "src/sw.js",
        swDest: "dist/sw.js"
      },
      devOptions: {
        enabled: true,
        type: "module"
      },
      manifest: {
        name: "SmartFridge",
        short_name: "Fridge",
        description: "Ton frigo intelligent",
        theme_color: "#4CAF50",
        background_color: "#F9F9F9",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: [".trycloudflare.com"]
  }
});