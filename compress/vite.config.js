import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://nezam-odoo-priority-medical-stage-27163783.dev.odoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // keeps the path intact
      },
    },
  },
})

