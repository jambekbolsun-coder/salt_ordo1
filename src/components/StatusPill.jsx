const labels = {
  new: 'Новый',
  contacted: 'Связались',
  confirmed: 'Подтверждён',
  production: 'На изготовлении',
  ready: 'Готов',
  delivery: 'В доставке',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
  draft: 'Черновик',
  published: 'Опубликован',
  hidden: 'Скрыт',
}
export default function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{labels[status] || status}</span>
}
