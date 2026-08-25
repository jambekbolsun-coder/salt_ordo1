import { createContext, useContext, useRef, useState } from 'react'

const FavoritesContext = createContext(null)
const STORAGE_KEY = 'salt-ordo-favorites-v1'

const read = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(() => read())
  const [pulse, setPulse] = useState(0)
  const timer = useRef(null)

  const animate = () => {
    setPulse((value) => value + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPulse(0), 720)
  }

  const toggle = (id) => {
    const current = read()
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setIds(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* state still works */ }
    animate()
  }

  const has = (id) => ids.includes(id)
  return <FavoritesContext.Provider value={{ ids, toggle, has, pulse }}>{children}</FavoritesContext.Provider>
}

export const useFavorites = () => useContext(FavoritesContext)
