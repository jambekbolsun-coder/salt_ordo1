import { Cloud, LockKeyhole, RefreshCw } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminInstallCard from '../../components/AdminInstallCard'
import { useAdminPwa } from '../../state/AdminPwaContext'

export default function Application() {
  const { online, updateReady, installed } = useAdminPwa()
  return <>
    <AdminPageHeader eyebrow="Salt Ordo · приложение" title="Ваш кабинет. Всегда рядом." text="Установите Salt Ordo Admin на телефон или компьютер и открывайте рабочее пространство одним нажатием."/>
    <div className="admin-app-grid">
      <AdminInstallCard/>
      <section className="admin-panel admin-app-status" aria-label="Состояние приложения">
        <h2>Готово к работе</h2>
        <dl><div><dt>Подключение</dt><dd>{online ? 'Есть доступ к сети' : 'Нет подключения'}</dd></div><div><dt>Режим</dt><dd>{installed ? 'Приложение' : 'Браузер'}</dd></div><div><dt>Данные</dt><dd>В облаке · работа онлайн</dd></div></dl>
        <div className="admin-app-note"><RefreshCw aria-hidden="true"/><div><strong>{updateReady ? 'Доступно обновление' : 'Обновления через сайт'}</strong><p>{updateReady ? 'Сохраните изменения и закройте все окна Salt Ordo Admin. При следующем запуске приложение обновится.' : 'Приложение проверяет обновления при открытии. Формы не перезагружаются посреди работы.'}</p></div></div>
      </section>
      <section className="admin-panel admin-app-note"><LockKeyhole aria-hidden="true"/><div><h2>Доступ по вашей роли</h2><p>Установка сохраняет действующие права сотрудника. Вход обязателен, а закрытые данные не сохраняются для офлайн-доступа. На общем устройстве выходите из кабинета после работы.</p></div></section>
      <section className="admin-panel admin-app-note"><Cloud aria-hidden="true"/><div><h2>Один кабинет на всех устройствах</h2><p>Работайте с тем же каталогом и заявками на телефоне и компьютере. Для просмотра и сохранения нужен интернет. Установка не создаёт отдельную копию базы.</p></div></section>
    </div>
  </>
}
