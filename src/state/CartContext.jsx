import { createContext, useContext, useMemo, useRef, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'salt-ordo-cart-v1'
const MAX_QTY = 99

const read = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

const persist = (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* state still works */ }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => read())
  const [pulse, setPulse] = useState(0)
  const timer = useRef(null)

  const commit = (next) => {
    setItems(next)
    persist(next)
  }

  const animate = () => {
    setPulse((value) => value + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPulse(0), 720)
  }

  const add = (product, quantity = 1) => {
    const current = read()
    const requested = Math.max(1, Math.min(MAX_QTY, Number(quantity) || 1))
    const found = current.find((x) => x.id === product.id)
    const next = found
      ? current.map((x) => x.id === product.id ? { ...x, quantity: Math.min(MAX_QTY, x.quantity + requested) } : x)
      : [...current, { ...product, quantity: requested }]
    commit(next)
    animate()
  }

  const setQty = (id, quantity) => {
    const next = read().map((x) => x.id === id
      ? { ...x, quantity: Math.max(1, Math.min(MAX_QTY, Number(quantity) || 1)) }
      : x)
    commit(next)
  }

  const remove = (id) => commit(read().filter((x) => x.id !== id))
  const clear = () => commit([])

  const count = useMemo(() => items.reduce((sum, x) => sum + x.quantity, 0), [items])
  const total = useMemo(() => items.reduce((sum, x) => sum + Number(x.sale_price || 0) * x.quantity, 0), [items])

  return <CartContext.Provider value={{ items, add, setQty, remove, clear, count, total, pulse }}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
