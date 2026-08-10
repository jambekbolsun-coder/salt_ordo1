import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext(null)
const supported = ['ru', 'kg', 'en']

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('salt-ordo-language')
    return supported.includes(saved) ? saved : 'ru'
  })

  const setLang = (next) => {
    if (!supported.includes(next)) return
    setLangState(next)
    localStorage.setItem('salt-ordo-language', next)
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'kg' ? 'ky' : lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: translations[lang] }), [lang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
