import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: './',
  resolve: command === 'build' ? {
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
}))
