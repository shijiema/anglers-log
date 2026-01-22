import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This ensures assets are referenced correctly relative to the root
  base: '/', 
  build: {
    // This helps the Service Worker find the files
    outDir: 'dist',
  }
})