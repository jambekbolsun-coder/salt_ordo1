// Local-only acceptance fixture: real public catalog, isolated synthetic CRM.
// Never imported by the application or Vercel functions.
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { database } from '../tests/helpers/database.mjs'
import { transport } from '../tests/helpers/transport.mjs'
import handler from '../api/index.mjs'
const catalog = JSON.parse(
  await readFile(
    new URL('../seo/.build-catalog.json', import.meta.url),
    'utf8',
  ),
)
const db = await database()
let failNext = false
transport(db)
const vite = await createServer({
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  envDir: false,
  define: {
    'import.meta.env.VITE_SALT_SUPABASE_URL': JSON.stringify(
      'http://localhost:5173',
    ),
    'import.meta.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY':
      JSON.stringify('isolated-test-only'),
  },
  plugins: [
    {
      name: 'atelier-fixture',
      configureServer(server) {
        server.middlewares.use('/api/index', (req, res) => {
          if (
            failNext &&
            req.method === 'POST' &&
            req.url?.includes('route=public')
          ) {
            failNext = false
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({ error: 'Isolated acceptance test outage' }),
            )
            return
          }
          return handler(req, res)
        })
        server.middlewares.use('/__fixture/fail-next', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end()
            return
          }
          failNext = true
          res.end('Test failure armed')
        })
        server.middlewares.use('/__fixture', async (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              leads: (
                await db.query('select customer_name,message from public.leads')
              ).rows,
              inquiries: (
                await db.query(
                  'select count(*)::int as count from salt_crm.inquiries',
                )
              ).rows[0].count,
            }),
          )
        })
        server.middlewares.use('/rest/v1', (req, res) => {
          const u = new URL(req.url, 'http://localhost')
          let rows = []
          if (u.pathname === '/catalog_products') {
            rows = catalog.products
            if (u.searchParams.has('slug'))
              rows = rows.filter(
                (p) => p.slug === u.searchParams.get('slug').slice(3),
              )
          }
          if (u.pathname === '/categories') rows = catalog.categories
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify(
              req.headers.accept?.includes('vnd.pgrst.object')
                ? rows[0] || null
                : rows,
            ),
          )
        })
      },
    },
  ],
})
await vite.listen()
vite.printUrls()
console.log('ATELIER ISOLATED CRM READY')
process.on('SIGINT', async () => {
  await vite.close()
  await db.close()
  process.exit(0)
})
