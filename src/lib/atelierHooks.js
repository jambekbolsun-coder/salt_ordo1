import { useEffect, useState } from 'react'
import { useLanguage } from '../state/LanguageContext'
import { listProducts } from './api'
import { atelierCopy } from './atelierContent'
export function useAtelierCopy() {
  const { lang } = useLanguage()
  return atelierCopy[lang] || atelierCopy.ru
}
export function useCatalog() {
  const [state, setState] = useState({ products: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    listProducts()
      .then(
        (products) =>
          active && setState({ products, loading: false, error: '' }),
      )
      .catch(
        () =>
          active &&
          setState({
            products: [],
            loading: false,
            error:
              'Не удалось загрузить изделия. Попробуйте обновить страницу.',
          }),
      )
    return () => {
      active = false
    }
  }, [])
  return state
}
