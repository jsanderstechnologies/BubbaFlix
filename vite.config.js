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
      '/api/torrent': {
        target: 'https://apibay.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/torrent/, '/q.php'),
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1'),
      },
    },
  },
})
