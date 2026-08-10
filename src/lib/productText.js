export function localizedField(item, field, lang = 'ru') {
  if (!item) return ''
  return item[`${field}_${lang}`] || item[`${field}_ru`] || item[field] || ''
}

export function categoryName(category, lang = 'ru') {
  return localizedField(category, 'name', lang)
}

export function promoLabel(product, lang = 'ru') {
  return localizedField(product, 'promo_label', lang)
}

export function isPromotionActive(product, now = new Date()) {
  if (!product?.is_on_sale) return false
  const start = product.promo_start_at ? new Date(product.promo_start_at) : null
  const end = product.promo_end_at ? new Date(product.promo_end_at) : null
  if (start && now < start) return false
  if (end && now > end) return false
  return Number(product.old_price || 0) > Number(product.sale_price || 0)
}

export function discountPercent(product) {
  const oldPrice = Number(product?.old_price || 0)
  const salePrice = Number(product?.sale_price || 0)
  if (!oldPrice || salePrice >= oldPrice) return 0
  return Math.round(((oldPrice - salePrice) / oldPrice) * 100)
}
