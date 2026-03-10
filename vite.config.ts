import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy requests starting with /melhorenvio to the sandbox to avoid CORS
      '/melhorenvio': {
        target: 'https://sandbox.melhorenvio.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/melhorenvio/, ''),
      },
    },
  },
})
