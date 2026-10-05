import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'admin-entry',
    configureServer(server) { server.middlewares.use(adminEntry) },
    configurePreviewServer(server) {
      server.middlewares.use(adminEntry)
      server.middlewares.use(seoPreviewEntry)
    },
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

function seoPreviewEntry(req, _res, next) {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const staticRoutes = {
    '/catalog': '/seo/catalog.html',
    '/contacts': '/seo/contacts.html',
    '/kyzga-sep-bishkek': '/seo/categories/kyzga-sep-bishkek.html',
    '/zher-toshok-bishkek': '/seo/categories/zher-toshok-bishkek.html',
    '/zhazdyk-bishkek': '/seo/categories/zhazdyk-bishkek.html',
    '/sandyk-kyzga-sep': '/seo/categories/sandyk-kyzga-sep.html',
    '/individualnyy-poshiv-bishkek': '/seo/categories/individualnyy-poshiv-bishkek.html',
  }
  if (staticRoutes[pathname]) req.url = staticRoutes[pathname]
  else {
    const product = pathname.match(/^\/product\/([a-z0-9-]+)$/)
    if (product) req.url = `/seo/products/${product[1]}.html`
  }
  next()
}
