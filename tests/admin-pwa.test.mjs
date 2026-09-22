import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../public/admin/sw.js', import.meta.url), 'utf8')
const origin = 'https://salt-ordo1.vercel.app'

function worker({ offline = false, status = 200 } = {}) {
  const listeners = new Map()
  const stores = new Map([['unrelated-cache', new Map()], ['salt-ordo-admin-offline-old', new Map()]])
  const requests = []
  let claimed = false
  const context = {
    URL, Response,
    self: { location: { origin }, addEventListener: (name, fn) => listeners.set(name, fn), clients: { claim: async () => { claimed = true } } },
    caches: {
      keys: async () => [...stores.keys()],
      delete: async (name) => stores.delete(name),
      open: async (name) => {
        if (!stores.has(name)) stores.set(name, new Map())
        return { put: async (key, value) => stores.get(name).set(key, value), match: async (key) => stores.get(name).get(key) }
      },
    },
    fetch: async (request, options) => {
      requests.push({ request, options })
      if (offline && typeof request !== 'string') throw new Error('offline')
      return new Response(typeof request === 'string' ? 'public offline page' : 'PRIVATE DATA', { status })
    },
  }
  vm.runInNewContext(source, context)
  return {
    stores, requests, claimed: () => claimed,
    lifecycle: (name) => { let promise; listeners.get(name)({ waitUntil(value) { promise = value } }); return promise },
    fetch: (url, options = {}) => {
      let promise
      listeners.get('fetch')({ request: { url, mode: 'navigate', method: 'GET', ...options }, respondWith(value) { promise = value } })
      return promise
    },
  }
}

test('installation only caches the unauthenticated offline document', async () => {
  const w = worker()
  await w.lifecycle('install')
  assert.deepEqual([...w.stores.get('salt-ordo-admin-offline-v1').keys()], ['/admin-pwa/offline.html'])
  assert.equal(w.requests[0].options.credentials, 'omit')
})

test('failed offline download prevents installation', async () => {
  await assert.rejects(worker({ status: 500 }).lifecycle('install'))
})

test('activation removes only this app’s obsolete offline caches', async () => {
  const w = worker()
  await w.lifecycle('install')
  await w.lifecycle('activate')
  assert.deepEqual([...w.stores.keys()], ['unrelated-cache', 'salt-ordo-admin-offline-v1'])
  assert.equal(w.claimed(), true)
})

test('private navigations are fetched without HTTP cache and never stored', async () => {
  const w = worker()
  await w.lifecycle('install')
  const response = await w.fetch(`${origin}/admin/leads`)
  assert.equal(await response.text(), 'PRIVATE DATA')
  assert.equal(w.requests.at(-1).options.cache, 'no-store')
  assert.equal(w.stores.get('salt-ordo-admin-offline-v1').size, 1)
})

test('offline navigation returns only the neutral page, never private content', async () => {
  const w = worker({ offline: true })
  await w.lifecycle('install')
  assert.equal(await (await w.fetch(`${origin}/admin/products/secret`)).text(), 'public offline page')
})

test('cache eviction still returns a safe 503 offline response', async () => {
  const response = await worker({ offline: true }).fetch(`${origin}/admin/leads`)
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('API, POST, cross-origin, assets and storefront requests are not intercepted', () => {
  const w = worker()
  for (const [url, options] of [
    [`${origin}/admin/leads`, { method: 'POST' }],
    [`${origin}/admin/data`, { mode: 'cors' }],
    [`${origin}/assets/app.js`, {}],
    [`${origin}/catalog`, {}],
    [`${origin}/administrator`, {}],
    ['https://example.com/admin/leads', {}],
    ['https://example.supabase.co/rest/v1/staff', { mode: 'cors' }],
  ]) assert.equal(w.fetch(url, options), undefined)
  assert.equal(w.requests.length, 0)
})

test('admin install identity, launch path and scope stay separate from storefront', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/admin-pwa/manifest.webmanifest', import.meta.url)))
  assert.equal(manifest.id, '/admin/')
  assert.equal(manifest.start_url, '/admin/')
  assert.equal(manifest.scope, '/admin/')
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) {
    const png = await readFile(new URL(`../public${icon.src}`, import.meta.url))
    const [width, height] = icon.sizes.split('x').map(Number)
    assert.equal(png.readUInt32BE(16), width)
    assert.equal(png.readUInt32BE(20), height)
  }
})

test('production admin responses prohibit caching, framing and inline scripts', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)))
  const headers = config.headers.find(({ source }) => source === '/admin/:path*').headers
  assert.equal(headers.find(({ key }) => key === 'Cache-Control').value, 'no-store')
  const csp = headers.find(({ key }) => key === 'Content-Security-Policy').value
  assert.match(csp, /script-src 'self';/)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.equal(config.redirects.find(({ source }) => source === '/admin').destination, '/admin/')
  assert.equal(config.rewrites.find(({ source }) => source === '/admin/').destination, '/admin.html')
  assert.equal(config.headers.find(({ source }) => source === '/admin/').headers.find(({ key }) => key === 'Cache-Control').value, 'no-store')
})
