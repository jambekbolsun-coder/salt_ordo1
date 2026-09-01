const VIEWED_PRODUCTS_KEY = 'salt-ordo-viewed-products-v1'
const MAX_VIEWED_PRODUCTS = 500

function readViewedProducts() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(VIEWED_PRODUCTS_KEY) || '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

export function hasViewedProduct(productId) {
  if (!productId || typeof window === 'undefined') return false
  return Boolean(readViewedProducts()[productId])
}

export function markProductViewed(productId) {
  if (!productId || typeof window === 'undefined') return

  try {
    const viewed = readViewedProducts()
    viewed[productId] = Date.now()

    const entries = Object.entries(viewed)
      .sort(([, firstSeenAt], [, secondSeenAt]) => secondSeenAt - firstSeenAt)
      .slice(0, MAX_VIEWED_PRODUCTS)

    window.localStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // The product page still works when storage is unavailable.
  }
}
