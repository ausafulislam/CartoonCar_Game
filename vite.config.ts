import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,woff,woff2}'],
        globIgnores: [
          '**/test-shots/**',
          // Install-prompt screenshots are fetched by the browser on demand, not
          // needed in the offline precache.
          '**/screenshots/**',
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB per file
      },
      manifest: {
        id: '/',
        name: 'Cartoon Car Adventure',
        short_name: 'Cartoon Car',
        description:
          'A colorful, family-friendly cartoon driving game that runs entirely in your browser. Play offline after the first visit.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1d9bf0',
        background_color: '#0d3f6e',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '430x880',
            type: 'image/png',
            label: 'Home screen',
            form_factor: 'narrow',
          },
          {
            src: '/screenshots/gameplay.png',
            sizes: '430x880',
            type: 'image/png',
            label: 'Gameplay — construction road works',
            form_factor: 'narrow',
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
