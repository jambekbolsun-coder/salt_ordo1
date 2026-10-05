import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const action = process.argv[2] || 'prepare'
const defaultOrigin = 'https://salt-ordo1.vercel.app'

const categoryLandings = [
  {
    slug: 'kyzga-sep-bishkek',
    categorySlug: 'sep',
    title: 'Кызга сеп в Бишкеке — готовые комплекты и пошив на заказ',
    description: 'Кызга сеп, төшөк, жууркан, жаздык и сандык в единой палитре. Ручная работа Salt Ordo, индивидуальная комплектация и доставка по Кыргызстану.',
    intro: 'Соберём приданое невесты в едином стиле: подберём ткань, цвет, размеры, количество предметов и оформление под вашу традицию и бюджет.',
    image: '/hero-sep.webp',
  },
  {
    slug: 'zher-toshok-bishkek',
    categorySlug: 'jer-toshok',
    title: 'Жер төшөк в Бишкеке — купить готовый или заказать',
    description: 'Жер төшөк и кыргызские төшөктөр ручной работы в Бишкеке. Выбор ткани, цвета, размера и шва, изготовление на заказ и доставка по Кыргызстану.',
    intro: 'Изготавливаем мягкие жер төшөк для дома, гостей, кызга сеп и семейных событий. Подбираем материал, плотность, размер и оформление.',
    image: '/hero-toshok.webp',
  },
  {
    slug: 'zhazdyk-bishkek',
    categorySlug: 'jastyk',
    title: 'Жаздык и декоративные подушки на заказ в Бишкеке',
    description: 'Жаздык и декоративные подушки Salt Ordo: индивидуальные размеры, ткани и цвета для дома и кызга сеп. Доставка по Кыргызстану.',
    intro: 'Подберём подушки к жер төшөк, сеп-комплекту или интерьеру, чтобы ткань, оттенки и декоративные детали сочетались между собой.',
    image: '/hero-sage-modern.webp',
  },
  {
    slug: 'sandyk-kyzga-sep',
    categorySlug: 'sandyk',
    title: 'Сандык для кызга сеп в Бишкеке',
    description: 'Сандык и сандык-комплекты для кызга сеп в Бишкеке. Индивидуальное оформление, размеры и текстиль Salt Ordo, доставка по Кыргызстану.',
    intro: 'Сандык становится центральной частью сеп-комплекта. Подберём размер, цвет, декор и текстиль, чтобы всё выглядело единым набором.',
    image: '/hero-chest-heirloom.webp',
  },
  {
    slug: 'individualnyy-poshiv-bishkek',
    categorySlug: 'custom',
    title: 'Домашний текстиль на заказ по вашему фото или эскизу',
    description: 'Индивидуальный пошив төшөк, подушек и комплектов в Бишкеке. Salt Ordo адаптирует цвет, ткань, размер и детали по вашему референсу.',
    intro: 'Создаём национальные и современные комплекты по фотографии, эскизу или вашей идее. Стоимость и срок согласовываются до начала работы.',
    image: '/hero-blush-handmade.webp',
  },
]

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/catalog', priority: '0.9', changefreq: 'daily' },
  { path: '/contacts', priority: '0.7', changefreq: 'monthly' },
  ...categoryLandings.map((page) => ({ path: `/${page.slug}`, priority: '0.9', changefreq: 'weekly' })),
]

await loadEnvironment()
const siteOrigin = (process.env.VITE_PUBLIC_SITE_URL || defaultOrigin).replace(/\/$/, '')

if (action === 'prepare') await prepare()
else if (action === 'render') await render()
else throw new Error(`Unknown SEO action: ${action}`)

async function loadEnvironment() {
  for (const name of ['.env.production', '.env.local']) {
    try {
      const raw = await fs.readFile(path.join(root, name), 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (!match || process.env[match[1]]) continue
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
      }
    } catch { /* optional env file */ }
  }
}

async function loadCatalog() {
  const snapshot = JSON.parse(await fs.readFile(path.join(root, 'seo/catalog-snapshot.json'), 'utf8'))
  const url = process.env.VITE_SALT_SUPABASE_URL
  const key = process.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return snapshot

  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const request = async (endpoint) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(`${url}/rest/v1/${endpoint}`, { headers, signal: controller.signal })
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`)
      return response.json()
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    const [products, categories] = await Promise.all([
      request('catalog_products?select=*&order=sort_order.asc,created_at.desc'),
      request('categories?select=*&is_visible=eq.true&order=sort_order.asc,created_at.asc'),
    ])
    if (!Array.isArray(products) || !products.length) return snapshot
    return { products, categories: Array.isArray(categories) ? categories : snapshot.categories }
  } catch (error) {
    console.warn(`[seo] Live catalog unavailable, using snapshot: ${error.message}`)
    return snapshot
  }
}

async function prepare() {
  const catalog = await loadCatalog()
  await fs.mkdir(path.join(root, 'seo'), { recursive: true })
  await fs.writeFile(path.join(root, 'seo/.build-catalog.json'), JSON.stringify(catalog, null, 2))
  await fs.writeFile(path.join(root, 'public/sitemap.xml'), buildSitemap(catalog.products))
  console.log(`[seo] Prepared sitemap with ${staticPages.length + catalog.products.length} indexable URLs.`)
}

async function render() {
  const catalog = await readBuildCatalog()
  const source = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8')
  const writes = []

  writes.push(writeHtml('index.html', buildPage(source, {
    title: 'Кызга сеп и жер төшөк в Бишкеке | Salt Ordo',
    description: 'Salt Ordo — кызга сеп, жер төшөк, жууркан, жаздык и сандык ручной работы в Бишкеке. Индивидуальный пошив и доставка по Кыргызстану.',
    path: '/',
    image: '/og.webp',
    schema: homeSchema(),
    body: homeFallback(catalog.products),
  })))

  writes.push(writeHtml('seo/catalog.html', buildPage(source, {
    title: 'Каталог Salt Ordo — кызга сеп, жер төшөк и сандык',
    description: 'Каталог Salt Ordo: кызга сеп, жер төшөк, жаздык, сандык и текстиль ручной работы. Цены, наличие, индивидуальный пошив и доставка по Кыргызстану.',
    path: '/catalog',
    image: '/og.webp',
    schema: collectionSchema('Каталог Salt Ordo', '/catalog'),
    body: catalogFallback(catalog.products),
  })))

  writes.push(writeHtml('seo/contacts.html', buildPage(source, {
    title: 'Контакты Salt Ordo — шоурум домашнего текстиля в Бишкеке',
    description: 'Шоурум Salt Ordo в Бишкеке: ул. Мукаша Абдраева, 198/1. Кызга сеп, жер төшөк, сандык и индивидуальный пошив. WhatsApp: +996 998 992 996.',
    path: '/contacts',
    image: '/hero-blush-handmade.webp',
    schema: localBusinessSchema('/contacts'),
    body: contactsFallback(),
  })))

  for (const page of categoryLandings) {
    const products = catalog.products.filter((product) => product.category?.slug === page.categorySlug)
    writes.push(writeHtml(`seo/categories/${page.slug}.html`, buildPage(source, {
      title: `${page.title} | Salt Ordo`,
      description: page.description,
      path: `/${page.slug}`,
      image: page.image,
      schema: [collectionSchema(page.title, `/${page.slug}`), breadcrumbSchema([
        ['Главная', '/'],
        [page.title, `/${page.slug}`],
      ])],
      body: categoryFallback(page, products),
    })))
  }

  for (const product of catalog.products) {
    writes.push(writeHtml(`seo/products/${safeSlug(product.slug)}.html`, buildPage(source, productPage(product))))
  }

  await Promise.all(writes)
  console.log(`[seo] Rendered ${3 + categoryLandings.length + catalog.products.length} crawlable HTML pages.`)
}

async function readBuildCatalog() {
  try {
    return JSON.parse(await fs.readFile(path.join(root, 'seo/.build-catalog.json'), 'utf8'))
  } catch {
    return loadCatalog()
  }
}

function buildSitemap(products) {
  const staticDate = new Date().toISOString().slice(0, 10)
  const urls = staticPages.map((page) => sitemapUrl({ ...page, lastmod: staticDate }))
  for (const product of products) {
    const image = firstImage(product)
    urls.push(sitemapUrl({
      path: `/product/${safeSlug(product.slug)}`,
      lastmod: String(product.updated_at || product.created_at || staticDate).slice(0, 10),
      changefreq: 'weekly',
      priority: '0.8',
      image,
      imageTitle: productName(product),
    }))
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`
}

function sitemapUrl({ path: route, lastmod, changefreq, priority, image, imageTitle }) {
  return `  <url>\n    <loc>${xml(`${siteOrigin}${route}`)}</loc>\n    <lastmod>${xml(lastmod)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>${image ? `\n    <image:image><image:loc>${xml(image)}</image:loc><image:title>${xml(imageTitle)}</image:title></image:image>` : ''}\n  </url>`
}

function buildPage(source, page) {
  const canonical = `${siteOrigin}${page.path === '/' ? '/' : page.path}`
  const image = page.image.startsWith('http') ? page.image : `${siteOrigin}${page.image}`
  const schemas = (Array.isArray(page.schema) ? page.schema : [page.schema]).filter(Boolean)
  const head = [
    `<title>${html(page.title)}</title>`,
    `<meta name="description" content="${attribute(page.description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    `<link rel="canonical" href="${attribute(canonical)}">`,
    `<meta property="og:title" content="${attribute(page.title)}">`,
    `<meta property="og:description" content="${attribute(page.description)}">`,
    `<meta property="og:type" content="${page.path.startsWith('/product/') ? 'product' : 'website'}">`,
    `<meta property="og:url" content="${attribute(canonical)}">`,
    `<meta property="og:image" content="${attribute(image)}">`,
    '<meta property="og:locale" content="ru_KG">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${attribute(page.title)}">`,
    `<meta name="twitter:description" content="${attribute(page.description)}">`,
    `<meta name="twitter:image" content="${attribute(image)}">`,
    ...schemas.map((entry) => `<script type="application/ld+json" data-salt-seo-schema>${jsonLd(entry)}</script>`),
    fallbackStyles(),
  ].join('\n    ')

  let output = removeSeoHead(source)
  output = output.replace('</head>', `    ${head}\n  </head>`)
  output = output.replace(/<div id="root"><\/div>/, `<div id="root">${page.body}</div>`)
  return output
}

function removeSeoHead(source) {
  return source
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<link[^>]+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta[^>]+(?:name|property)="(?:description|robots|og:title|og:description|og:type|og:url|og:image|og:image:width|og:image:height|og:locale|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>/gi, '')
    .replace(/\s*<script[^>]+data-salt-seo-schema[^>]*>[\s\S]*?<\/script>/gi, '')
}

async function writeHtml(relativePath, content) {
  const target = path.join(root, 'dist', relativePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content)
}

function productPage(product) {
  const name = productName(product)
  const category = product.category?.name_ru || 'Домашний текстиль'
  const price = product.price_on_request ? 'цена по запросу' : `${formatPrice(product.sale_price)} сом`
  const description = `${name} от Salt Ordo${product.material_ru || product.material ? `, материал — ${product.material_ru || product.material}` : ''}${product.sizes?.length ? `, размер — ${product.sizes.join(', ')}` : ''}. ${product.price_on_request ? 'Цена по запросу' : `Цена ${price}`}. Ручная работа в Бишкеке, индивидуальный заказ и доставка по Кыргызстану.`
  const route = `/product/${safeSlug(product.slug)}`
  const categoryPage = categoryLandings.find((page) => page.categorySlug === product.category?.slug)
  const categoryPath = categoryPage ? `/${categoryPage.slug}` : '/catalog'
  const images = (product.images || []).map((item) => item.public_url).filter(Boolean)
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: product.description_ru?.length >= 80 ? product.description_ru : description,
      image: images,
      sku: product.sku || product.slug,
      category,
      brand: { '@type': 'Brand', name: 'Salt Ordo' },
      url: `${siteOrigin}${route}`,
      material: product.material_ru || product.material || undefined,
      color: product.colors?.join(', ') || undefined,
      size: product.sizes?.join(', ') || undefined,
      offers: {
        '@type': 'Offer',
        url: `${siteOrigin}${route}`,
        priceCurrency: 'KGS',
        price: product.price_on_request ? undefined : Number(product.sale_price || 0),
        availability: Number(product.stock_qty || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Salt Ordo' },
      },
    },
    breadcrumbSchema([['Главная', '/'], [category, categoryPath], [name, route]]),
  ]
  return {
    title: `${name} купить в Бишкеке — ${price} | Salt Ordo`,
    description,
    path: route,
    image: firstImage(product) || '/og.webp',
    schema,
    body: productFallback(product, description, categoryPath),
  }
}

function fallbackShell(content) {
  return `<div class="seo-static"><header><a class="seo-static__brand" href="/">SALT <b>ORDO</b></a><nav><a href="/">Главная</a><a href="/catalog">Каталог</a><a href="/kyzga-sep-bishkek">Кызга сеп</a><a href="/zher-toshok-bishkek">Жер төшөк</a><a href="/contacts">Контакты</a></nav></header>${content}<footer><b>Salt Ordo</b><span>Бишкек, ул. Мукаша Абдраева, 198/1 · +996 998 992 996 · Доставка по Кыргызстану</span></footer></div>`
}

function homeFallback(products) {
  return fallbackShell(`<main><section class="seo-static__hero"><div><small>РУЧНАЯ РАБОТА В БИШКЕКЕ</small><h1>Кызга сеп и жер төшөк в Бишкеке</h1><p>Готовые изделия и индивидуальный пошив: төшөк, жууркан, жаздык, сандык и полные сеп-комплекты с доставкой по Кыргызстану.</p><a href="/catalog">Смотреть каталог</a></div><img src="/hero-sep.webp" alt="Кызга сеп и жер төшөк Salt Ordo"></section><section><h2>Популярные категории</h2>${categoryLinks()}</section><section><h2>Изделия Salt Ordo</h2>${productCards(products.slice(0, 8))}</section></main>`)
}

function catalogFallback(products) {
  return fallbackShell(`<main><nav class="seo-static__crumbs"><a href="/">Главная</a> › Каталог</nav><h1>Каталог Salt Ordo</h1><p>Кызга сеп, жер төшөк, жаздык, сандык и домашний текстиль ручной работы в Бишкеке.</p>${categoryLinks()}${productCards(products)}</main>`)
}

function contactsFallback() {
  return fallbackShell('<main><nav class="seo-static__crumbs"><a href="/">Главная</a> › Контакты</nav><h1>Шоурум Salt Ordo в Бишкеке</h1><p>Бишкек, ул. Мукаша Абдраева, 198/1. Перед визитом напишите нам — подготовим ткани и примеры работ.</p><p><a href="tel:+996998992996">+996 998 992 996</a> · <a href="https://wa.me/996998992996">WhatsApp</a> · <a href="https://www.instagram.com/salt_ordo/">Instagram @salt_ordo</a></p><h2>Кызга сеп и домашний текстиль на заказ</h2><p>Обсудим ткань, цвет, размеры, состав комплекта, стоимость и срок изготовления. Доставляем готовые изделия по всему Кыргызстану.</p></main>')
}

function categoryFallback(page, products) {
  return fallbackShell(`<main><nav class="seo-static__crumbs"><a href="/">Главная</a> › ${html(page.title)}</nav><section class="seo-static__hero"><div><small>SALT ORDO · БИШКЕК</small><h1>${html(page.title)}</h1><p>${html(page.intro)}</p><a href="https://wa.me/996998992996">Обсудить заказ</a></div><img src="${attribute(page.image)}" alt="${attribute(page.title)}"></section><section><h2>Готовые изделия и индивидуальный заказ</h2>${products.length ? productCards(products) : '<p>Нужный цвет, размер и комплектацию изготовим по вашему референсу. Свяжитесь с менеджером для расчёта.</p>'}</section></main>`)
}

function productFallback(product, description, categoryPath) {
  const name = productName(product)
  const image = firstImage(product)
  const price = product.price_on_request ? 'Цена по запросу' : `${formatPrice(product.sale_price)} сом`
  return fallbackShell(`<main><nav class="seo-static__crumbs"><a href="/">Главная</a> › <a href="${attribute(categoryPath)}">${html(product.category?.name_ru || 'Каталог')}</a> › ${html(name)}</nav><article class="seo-static__product">${image ? `<img src="${attribute(image)}" alt="${attribute(name)}">` : ''}<div><small>${html(product.category?.name_ru || 'Salt Ordo')}</small><h1>${html(name)}</h1><strong class="seo-static__price">${html(price)}</strong><p>${html(description)}</p><dl>${spec('Материал', product.material_ru || product.material)}${spec('Размер', product.sizes?.join(', '))}${spec('Наличие', Number(product.stock_qty || 0) > 0 ? 'В наличии' : 'Под заказ')}${spec('Срок изготовления', product.production_days ? `${product.production_days} дней` : '')}</dl><a href="https://wa.me/996998992996">Уточнить и заказать в WhatsApp</a></div></article><section><h2>${html(name)} ручной работы в Бишкеке</h2><p>Цвет, ткань, размер и детали можно адаптировать под ваш интерьер, кызга сеп или семейное событие. Доставка доступна по всему Кыргызстану.</p></section></main>`)
}

function productCards(products) {
  if (!products.length) return '<p>Каталог обновляется. Напишите менеджеру, чтобы подобрать или изготовить нужный вариант.</p>'
  return `<div class="seo-static__grid">${products.map((product) => {
    const name = productName(product)
    const image = firstImage(product)
    return `<article><a href="/product/${attribute(safeSlug(product.slug))}">${image ? `<img src="${attribute(image)}" alt="${attribute(name)}" loading="lazy">` : ''}<h3>${html(name)}</h3><p>${product.price_on_request ? 'Цена по запросу' : `${formatPrice(product.sale_price)} сом`}</p></a></article>`
  }).join('')}</div>`
}

function categoryLinks() {
  return `<nav class="seo-static__pills">${categoryLandings.map((page) => `<a href="/${page.slug}">${html(page.title.split(' — ')[0])}</a>`).join('')}</nav>`
}

function localBusinessSchema(route = '/') {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store'],
    name: 'Salt Ordo',
    url: `${siteOrigin}${route}`,
    image: `${siteOrigin}/og.webp`,
    telephone: '+996998992996',
    address: { '@type': 'PostalAddress', streetAddress: 'ул. Мукаша Абдраева, 198/1', addressLocality: 'Бишкек', addressCountry: 'KG' },
    areaServed: { '@type': 'Country', name: 'Кыргызстан' },
    sameAs: ['https://www.instagram.com/salt_ordo/'],
  }
}

function homeSchema() {
  return [localBusinessSchema('/'), { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Salt Ordo', url: siteOrigin, inLanguage: ['ru', 'ky', 'en'] }]
}

function collectionSchema(name, route) {
  return { '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: `${siteOrigin}${route}`, isPartOf: { '@type': 'WebSite', name: 'Salt Ordo', url: siteOrigin } }
}

function breadcrumbSchema(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, route], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `${siteOrigin}${route}` })) }
}

function fallbackStyles() {
  return '<style data-seo-fallback>.seo-static{font-family:Arial,sans-serif;color:#251e23;background:#fffafc}.seo-static header,.seo-static footer,.seo-static main{max-width:1180px;margin:auto;padding:22px}.seo-static header,.seo-static footer{display:flex;gap:24px;justify-content:space-between;align-items:center;flex-wrap:wrap}.seo-static nav{display:flex;gap:14px;flex-wrap:wrap}.seo-static a{color:#8b3151}.seo-static__brand{font-size:24px;text-decoration:none;color:#251e23}.seo-static main{padding-top:42px;padding-bottom:60px}.seo-static h1{font-size:clamp(38px,6vw,72px);line-height:1;margin:16px 0}.seo-static h2{font-size:32px;margin-top:52px}.seo-static p{line-height:1.7;max-width:780px}.seo-static__hero,.seo-static__product{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center}.seo-static__hero img,.seo-static__product>img{width:100%;max-height:560px;object-fit:cover;border-radius:28px}.seo-static__hero a,.seo-static__product a{display:inline-block;margin-top:12px;padding:13px 20px;border-radius:999px;background:#8b3151;color:white;text-decoration:none}.seo-static__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.seo-static__grid article{border:1px solid #eee1e6;border-radius:20px;overflow:hidden;background:#fff}.seo-static__grid article a{color:#251e23;text-decoration:none}.seo-static__grid img{width:100%;aspect-ratio:4/5;object-fit:cover}.seo-static__grid h3,.seo-static__grid p{padding:0 15px}.seo-static__pills{margin:20px 0 34px}.seo-static__pills a{padding:10px 15px;border:1px solid #e6cbd5;border-radius:999px;text-decoration:none}.seo-static__crumbs{font-size:14px}.seo-static__price{display:block;font-size:28px;margin:14px 0}.seo-static dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px}.seo-static dt{color:#74666d}.seo-static dd{margin:0;font-weight:bold}@media(max-width:760px){.seo-static__hero,.seo-static__product{grid-template-columns:1fr}.seo-static__hero img,.seo-static__product>img{order:-1}.seo-static__grid{grid-template-columns:repeat(2,1fr)}.seo-static header nav{display:none}}</style>'
}

function spec(label, value) {
  return value ? `<dt>${html(label)}</dt><dd>${html(value)}</dd>` : ''
}

function productName(product) {
  return product.name_ru || product.name_kg || product.name_en || product.slug
}

function firstImage(product) {
  return (product.images || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0]?.public_url || ''
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0))
}

function safeSlug(value) {
  const slug = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) throw new Error('Invalid product slug in SEO catalog')
  return slug
}

function html(value) {
  return String(value ?? '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])
}

function attribute(value) {
  return html(value).replace(/"/g, '&quot;')
}

function xml(value) {
  return attribute(value).replace(/'/g, '&apos;')
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
