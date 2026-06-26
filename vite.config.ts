import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves assets from https://<user>.github.io/ATS-Scanner/, so the
  // base prefix is only needed for the production build. In dev the app is served
  // from the root for clean local URLs.
  base: command === 'build' ? '/ATS-Scanner/' : '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
