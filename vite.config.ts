import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access through ngrok tunnels (public sharing).
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    // Same-origin /api proxy to the backend so a single public tunnel serves
    // both the SPA and the API/WS (avoids ngrok's per-host interstitial
    // breaking cross-origin fetches).
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
