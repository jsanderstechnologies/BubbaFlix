import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bitsearch': {
        target: 'https://bitsearch.to',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/bitsearch/, '/api'),
      },
    },
  },
})
