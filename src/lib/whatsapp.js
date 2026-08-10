export const DEFAULT_WHATSAPP = '+996998992996'

export function normalizePhone(phone = DEFAULT_WHATSAPP) {
  return String(phone).replace(/\D/g, '')
}

export function whatsappUrl(phone, message = '') {
  const number = normalizePhone(phone)
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}
