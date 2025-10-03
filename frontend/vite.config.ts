import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.1.9:4500', // Usar IP local
        changeOrigin: true,
      }
    }
  },
})
