import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, decodeURIComponent(new URL('.', import.meta.url).pathname), 'VITE_')
  const colorLabEnabled = env.VITE_ENABLE_COLOR_LAB === 'true'
  return ({
  plugins: [react()],
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
