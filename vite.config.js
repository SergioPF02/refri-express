import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    watch: {
      ignored: ['**/android/**']
    }
  },
  optimizeDeps: {
    exclude: ['@capacitor/android', 'android'],
    entries: ['!**/android/**'] // Explicitly tell Vite not to scan android folder for entries
  }
})
