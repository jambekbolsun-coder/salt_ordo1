import { useEffect } from 'react'
import { SITE_ORIGIN } from '../lib/seoContent'

const DEFAULT_IMAGE = '/og.webp'
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export default function SeoHead({ title, description, path = '/', image = DEFAULT_IMAGE, type = 'website', robots = INDEX_ROBOTS, schema = [] }) {
  useEffect(() => {
    const canonical = new URL(path, `${SITE_ORIGIN}/`).href
    const imageUrl = new URL(image || DEFAULT_IMAGE, `${SITE_ORIGIN}/`).href
    document.title = title
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'ru_KG' })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })
    upsertCanonical(canonical)

    document.head.querySelectorAll('script[data-salt-seo-schema]').forEach((element) => element.remove())
    const entries = Array.isArray(schema) ? schema.filter(Boolean) : [schema].filter(Boolean)
    if (entries.length) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.saltSeoSchema = 'true'
      script.textContent = JSON.stringify(entries.length === 1 ? entries[0] : entries)
      document.head.appendChild(script)
    }
  }, [title, description, path, image, type, robots, schema])

  return null
}
