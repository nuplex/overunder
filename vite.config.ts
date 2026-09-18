import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// PWA: https://vite-pwa-org.netlify.app/guide/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
  build: {
    emptyOutDir: true,
  },
  base: '/overunder/'
})
