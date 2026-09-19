import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { ClientRequest } from 'http'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Mirrors what Nginx sets in production (docs/architecture/06-deployment.md
        // section 6). Without this, express-session's cookie.secure: true
        // (docs/development-milestones/08.5-authentication.md section 5) never
        // sees a connection it considers secure and silently refuses to set the
        // session cookie at all during local dev — see backend/src/middleware/
        // session.ts. Browsers treat localhost as a secure context regardless
        // of scheme, so the resulting Secure cookie still works over plain
        // http://localhost:5173.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq: ClientRequest) => {
            proxyReq.setHeader('X-Forwarded-Proto', 'https')
          })
        }
      }
    }
  }
})
