import { trackPublicEvent } from './api'

const VISITOR_KEY = 'salt-ordo-visitor-id'
const SESSION_KEY = 'salt-ordo-session-id'

function createTrackingId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function readOrCreate(storage, key) {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const value = createTrackingId()
    storage.setItem(key, value)
    return value
  } catch {
    return createTrackingId()
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
