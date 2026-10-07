import { createContext, useContext, useEffect, useState } from 'react'
import {
  LEGACY_KEY,
  SELECTION_KEY,
  sanitizeSelection,
} from '../lib/selection.mjs'
const FavoritesContext = createContext(null)
function read() {
  try {
    const current = localStorage.getItem(SELECTION_KEY)
    if (current) return sanitizeSelection(JSON.parse(current))
    return sanitizeSelection(
      JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]').map((id) => ({
        id,
        type: 'product',
        label: 'Сохранённое изделие',
      })),
    )
  } catch {
    return []
  }
}
export function FavoritesProvider({ children }) {
  const [items, setItems] = useState(read)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const sync = (e) => {
      if (e.key === SELECTION_KEY) setItems(read())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const persist = (next) => {
    setItems(next)
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(next))
      localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify(
          next.filter((i) => i.type === 'product').map((i) => i.id),
        ),
      )
    } catch {
      setNotice(
        'Браузер запретил сохранение. Подборка доступна до закрытия страницы.',
      )
    }
  }
  const contains = (item) =>
    items.some((i) => i.id === item.id && i.type === item.type)
  const toggleItem = (item) => {
    if (contains(item)) {
      persist(items.filter((i) => i.id !== item.id || i.type !== item.type))
      setNotice('Убрано из подборки')
    } else if (items.length >= 24) {
      setNotice('В подборке уже 24 идеи. Уберите одну, чтобы добавить новую.')
    } else {
      setNotice('Добавлено в подборку')
      persist(sanitizeSelection([...items, item]))
    }
  }
  const toggle = (id, product) =>
    toggleItem({
      type: 'product',
      id,
      label: product?.name_ru || 'Сохранённое изделие',
      url: product?.slug ? `/product/${product.slug}` : '/collections',
    })
  return (
    <FavoritesContext.Provider
      value={{
        items,
        ids: items.filter((i) => i.type === 'product').map((i) => i.id),
        toggle,
        toggleItem,
        contains,
        has: (id) => items.some((i) => i.type === 'product' && i.id === id),
        pulse: 0,
        notice,
        remove: (item) =>
          persist(
            items.filter((i) => i.id !== item.id || i.type !== item.type),
          ),
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}
export const useFavorites = () => useContext(FavoritesContext)
