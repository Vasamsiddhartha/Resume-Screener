import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves assets from https://<user>.github.io/Resume-Screener/, so
  // the base prefix is only needed for the production build. In dev the app is
  // served from the root for clean local URLs.
  base: command === 'build' ? '/Resume-Screener/' : '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // The local ATS engine runs ML inference inside a module Web Worker.
  worker: {
    format: 'es',
  },
  // Treat model files as static assets so Vite serves/copies them verbatim.
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  optimizeDeps: {
    // Pre-bundle transformers.js, but leave onnxruntime-web alone — it ships
    // its own WASM binaries that must not be transformed by esbuild.
    include: ['@huggingface/transformers'],
    exclude: ['onnxruntime-web'],
  },
  server: {
    // COOP/COEP enable SharedArrayBuffer → multi-threaded WASM in dev. Harmless
    // where unsupported; GitHub Pages can't set these, so the engine also runs
    // fine single-threaded in production.
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
}))
