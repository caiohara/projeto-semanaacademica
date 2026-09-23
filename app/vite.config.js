import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/salas': 'http://localhost:3000',
      '/atividades': 'http://localhost:3000',
      '/encontros': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testes/configurar.js',
    globals: false,
  },
})
