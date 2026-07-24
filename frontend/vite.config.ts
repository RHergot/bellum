import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['bellum.rhesoftware.com', 'bellum.tailf0921a.ts.net']
  }
})
