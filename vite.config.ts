import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiProxy = {
  '/api': 'http://localhost:3001',
  '/auth': 'http://localhost:3001',
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy, host: true },
  preview: { proxy: apiProxy },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'd3': ['d3-geo', 'd3-selection', 'd3-scale', 'd3-drag'],
          'chakra': ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
        },
      },
    },
  },
})
