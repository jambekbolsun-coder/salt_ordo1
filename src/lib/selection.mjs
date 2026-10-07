export const SELECTION_KEY = 'salt-ordo-selection-v2'
export const LEGACY_KEY = 'salt-ordo-favorites-v1'
export const selectionTypes = {
  product: 'Изделие',
  collection: 'Коллекция',
  material: 'Материал',
  color: 'Цвет',
  ornament: 'Орнамент',
  work: 'Работа',
  style: 'Стиль',
}
export function sanitizeSelection(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  return input
    .filter(
      (i) =>
        i &&
        Object.hasOwn(selectionTypes, i.type) &&
        typeof i.id === 'string' &&
        i.id.length > 0 &&
        i.id.length <= 160 &&
        !seen.has(`${i.type}:${i.id}`) &&
        seen.add(`${i.type}:${i.id}`),
    )
    .slice(0, 24)
    .map((i) => ({
      type: i.type,
      id: i.id,
      label: String(i.label || i.id).slice(0, 120),
      ...(typeof i.url === 'string' &&
      i.url.startsWith('/') &&
      !i.url.startsWith('//') &&
      !/[\\\u0000-\u001f]/.test(i.url)
        ? { url: i.url }
        : {}),
    }))
}
export function selectionSummary(items) {
  return items
    .map((i) => {
      const identity =
        i.type === 'product'
          ? ` (${i.url?.startsWith('/product/') ? i.url : i.id})`
          : ''
      return `${selectionTypes[i.type]}: ${i.label}${identity}`
    })
    .join('\n')
}
export function validReference(value) {
  if (!String(value || '').trim()) return true
  try {
    const u = new URL(value)
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      value.length <= 400
    )
  } catch {
    return false
  }
}
export function buildBrief(fields, selection = []) {
  const labels = {
    product: 'Изделие',
    composition: 'Состав комплекта',
    occasion: 'Назначение',
    style: 'Стиль',
    palette: 'Палитра',
    material: 'Материал',
    ornament: 'Орнамент',
    dimensions: 'Размеры',
    budget: 'Бюджет',
    deadline: 'Желаемая дата',
    reference: 'Референс',
    purpose: 'Цель обращения',
    note: 'Комментарий',
  }
  return [
    'Индивидуальная идея Salt Ordo',
    ...Object.entries(labels)
      .filter(([k]) => String(fields[k] || '').trim())
      .map(([k, v]) => `${v}: ${String(fields[k]).trim()}`),
    selection.length ? `Моя подборка:\n${selectionSummary(selection)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
