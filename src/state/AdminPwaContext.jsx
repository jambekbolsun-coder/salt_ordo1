import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

const AdminPwaContext = createContext(null)

export function AdminPwaProvider() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [updateReady, setUpdateReady] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState('')
  const [workerError, setWorkerError] = useState(false)

  useEffect(() => {
    const manifest = document.querySelector('link[rel="manifest"]')
    const previousManifest = manifest?.getAttribute('href')
    const theme = document.querySelector('meta[name="theme-color"]')
    const previousTheme = theme?.content
    manifest?.setAttribute('href', '/admin-pwa/manifest.webmanifest')
    theme?.setAttribute('content', '#241f27')

    const display = window.matchMedia('(display-mode: standalone)')
    const syncDisplay = () => setInstalled(display.matches || navigator.standalone === true)
    const onPrompt = (event) => { event.preventDefault(); setPrompt(event) }
    const onInstalled = () => { setInstalled(true); setPrompt(null); setMessage('Приложение установлено. Откройте Salt Ordo Admin с главного экрана.') }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    syncDisplay()
    display.addEventListener('change', syncDisplay)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    let disposed = false
    let registration
    let installingWorker
    const onWorkerState = () => {
      if (!disposed && installingWorker?.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true)
    }
    const onUpdate = () => {
      installingWorker?.removeEventListener('statechange', onWorkerState)
      installingWorker = registration.installing
      installingWorker?.addEventListener('statechange', onWorkerState)
    }
    const checkUpdate = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration?.update().catch(() => {})
    }
    if ('serviceWorker' in navigator && window.isSecureContext && import.meta.env.PROD) {
      navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/', updateViaCache: 'none' })
        .then((value) => {
          if (disposed) return
          registration = value
          setUpdateReady(Boolean(value.waiting))
          registration.addEventListener('updatefound', onUpdate)
          onUpdate()
        }).catch(() => { if (!disposed) setWorkerError(true) })
    }
    document.addEventListener('visibilitychange', checkUpdate)
    return () => {
      disposed = true
      display.removeEventListener('change', syncDisplay)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', checkUpdate)
      registration?.removeEventListener('updatefound', onUpdate)
      installingWorker?.removeEventListener('statechange', onWorkerState)
      manifest?.setAttribute('href', previousManifest)
      theme?.setAttribute('content', previousTheme)
    }
  }, [])

  const install = async () => {
    if (!prompt || installing) return
    setInstalling(true)
    setMessage('')
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      setMessage(outcome === 'accepted' ? 'Запрос принят. Браузер завершит установку.' : 'Установка отменена. Вы можете продолжить работу в браузере.')
    } catch {
      setMessage('Не удалось открыть установку. Используйте меню браузера или попробуйте ещё раз.')
    } finally {
      setPrompt(null)
      setInstalling(false)
    }
  }

  return <AdminPwaContext.Provider value={{ canInstall: Boolean(prompt), installed, online, updateReady, installing, message, workerError, install }}>
    {!online && <div className="admin-connection" role="status">Нет подключения к интернету. Изменения нельзя сохранить, пока связь не восстановится.</div>}
    <Outlet/>
  </AdminPwaContext.Provider>
}

export const useAdminPwa = () => useContext(AdminPwaContext)
