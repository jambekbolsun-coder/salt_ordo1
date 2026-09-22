import { Check, Download, ShieldCheck, Smartphone } from 'lucide-react'
import { useAdminPwa } from '../state/AdminPwaContext'

export default function AdminInstallCard({ compact = false }) {
  const { canInstall, installed, online, installing, install, message, workerError } = useAdminPwa()
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  return <section className={`admin-install ${compact ? 'admin-install--compact' : ''}`} aria-label="Установка приложения">
    <div className="admin-install__heading">
      <img src="/admin-pwa/icon-192.png" width="56" height="56" alt=""/>
      <div><span className="eyebrow">Ваше рабочее пространство</span><h2>Salt Ordo Admin</h2><p>Каталог, заявки и аналитика — под рукой.</p></div>
    </div>
    {!compact && <p>Открывайте кабинет с рабочего стола или главного экрана телефона в отдельном окне. Все изменения сохраняются в облаке при подключении к интернету.</p>}
    {installed ? <p className="admin-install__status"><Check size={18} aria-hidden="true"/> Приложение установлено</p> : canInstall ?
      <button className="btn btn--primary" type="button" onClick={install} disabled={installing || !online} aria-busy={installing}><Download size={18} aria-hidden="true"/>{installing ? 'Открываем установку…' : 'Установить приложение'}</button> :
      <details className="admin-install__help"><summary><Smartphone size={18} aria-hidden="true"/> Как установить приложение</summary>
        {ios ? <ol><li>Откройте эту страницу в Safari.</li><li>Нажмите «Поделиться», затем «На экран “Домой”».</li><li>Если есть переключатель «Открывать как веб-приложение», включите его и нажмите «Добавить».</li></ol> : <ol><li>Откройте эту страницу в Chrome, Edge или Safari.</li><li>В меню браузера выберите «Установить приложение», «Добавить на главный экран» или «Добавить в Dock».</li><li>Подтвердите установку Salt Ordo Admin. Если такого пункта нет, продолжайте работу в браузере.</li></ol>}
      </details>}
    {message && <p className="admin-install__feedback" role="status">{message}</p>}
    {workerError && <p role="status">Не удалось подготовить приложение. Проверьте подключение и обновите страницу; кабинет доступен в браузере.</p>}
    <p className="admin-install__security"><ShieldCheck size={16} aria-hidden="true"/> Установка не даёт доступ к данным. Для работы нужен вход.</p>
  </section>
}
