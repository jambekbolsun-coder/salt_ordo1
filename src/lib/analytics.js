import { trackPublicEvent } from './api'

const VISITOR_KEY = 'salt-ordo-visitor-id'
const SESSION_KEY = 'salt-ordo-session-id'

function readOrCreate(storage, key) {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const value = crypto.randomUUID()
    storage.setItem(key, value)
    return value
  } catch {
    return crypto.randomUUID()
  }
}

export function getTrackingIds() {
  return {
    visitorId: readOrCreate(window.localStorage, VISITOR_KEY),
    sessionId: readOrCreate(window.sessionStorage, SESSION_KEY),
  }
}

export function track(eventType, details = {}) {
  const ids = getTrackingIds()
  trackPublicEvent({
    ...ids,
    eventType,
    path: details.path || `${window.location.pathname}${window.location.search}`,
    productId: details.productId || null,
    categorySlug: details.categorySlug || null,
    metadata: details.metadata || {},
  }).catch(() => {})
}
