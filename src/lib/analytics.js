import { trackPublicEvent } from './api'

const VISITOR_KEY = 'salt-ordo-visitor-id'
const SESSION_KEY = 'salt-ordo-session-id'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createTrackingId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()

  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function readOrCreate(storage, key) {
  try {
    const existing = storage.getItem(key)
    if (UUID_PATTERN.test(existing || '')) return existing
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
  return trackPublicEvent({
    ...ids,
    eventType,
    path: details.path || `${window.location.pathname}${window.location.search}`,
    productId: details.productId || null,
    categorySlug: details.categorySlug || null,
    metadata: details.metadata || {},
  }).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn(
        `Analytics event failed: ${eventType}`,
        error?.message || 'Unknown analytics error',
        error?.code || '',
      )
    }
    return null
  })
}
