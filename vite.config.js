import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'admin-entry',
    configureServer(server) { server.middlewares.use(adminEntry) },
    configurePreviewServer(server) { server.middlewares.use(adminEntry) },
  }],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } } },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['terminal.local'],
  },
  preview: { port: 4173 },
})

function adminEntry(req, _res, next) {
  if (/^\/admin(?:\/[^.?]*)?(?:\?.*)?$/.test(req.url)) req.url = '/admin.html'
  next()
}
