import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, decodeURIComponent(new URL('.', import.meta.url).pathname), 'VITE_')
  const colorLabEnabled = env.VITE_ENABLE_COLOR_LAB === 'true'
  // Vercel GitHub Preview builds can run Character Lab without changing public Production.
  const vercelPreview = process.env.VERCEL_ENV === 'preview'
  return ({
  plugins: [react()],
  define: { __SGM_VERCEL_PREVIEW__: JSON.stringify(vercelPreview) },
  base: './',
  resolve: command === 'build' && !colorLabEnabled ? {
    alias: {
      './ColorLabPanel': decodeURIComponent(new URL('./src/ColorLabPanel.production.tsx', import.meta.url).pathname),
    },
  } : undefined,
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        en: 'en/index.html',
        ja: 'ja/index.html',
      },
    },
  },
  })
})
