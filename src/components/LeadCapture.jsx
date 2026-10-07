import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createLead } from '../lib/api'
import { getTrackingIds, track } from '../lib/analytics'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'
export default function LeadCapture({
  source = 'contact',
  product = null,
  message = '',
  onClose = null,
  compact = false,
}) {
  const { settings } = useSiteSettings()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    note: '',
    website: '',
  })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [chat, setChat] = useState('')
  const locked = useRef(false)
  const change = (key) => (e) =>
    setForm((s) => ({ ...s, [key]: e.target.value }))
  async function submit(e) {
    e.preventDefault()
    if (locked.current || done) return
    const next = {}
    if (form.name.trim().length < 2)
      next.name = 'Введите имя — минимум 2 символа.'
    if (
      !/^\+?[\d\s()-]{9,20}$/.test(form.phone) ||
      form.phone.replace(/\D/g, '').length < 9
    )
      next.phone = 'Введите телефон с кодом страны.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Проверьте email.'
    const brief = [message, form.note.trim()].filter(Boolean).join('\n\n')
    if (brief.length > 2000)
      next.submit =
        'Описание слишком длинное. Сократите комментарий или подборку.'
    setErrors(next)
    if (Object.keys(next).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus()
      return
    }
    if (form.website) return
    locked.current = true
    setBusy(true)
    try {
      await createLead({
        source,
        customerName: form.name.trim(),
        phone: form.phone,
        email: form.email,
        message: brief,
        productId: product?.id || null,
        ...getTrackingIds(),
      })
      setDone(true)
      setChat(
        whatsappUrl(
          settings.whatsapp,
          `${brief}\n\nИмя: ${form.name.trim()}\nТелефон: ${form.phone}${form.email ? `\nEmail: ${form.email}` : ''}`,
        ),
      )
      track('lead_submit', { productId: product?.id || null })
    } catch {
      setErrors({
        submit:
          'Не удалось подтвердить сохранение заявки. Проверьте соединение и повторите попытку или напишите в WhatsApp.',
      })
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  if (done)
    return (
      <section className="atelier-form-success" role="status">
        <span className="atelier-kicker">Заявка сохранена</span>
        <h3>Ваша идея уже у нас.</h3>
        <p>
          Выбранные параметры и контакты переданы мастеру. Можно продолжить
          разговор в WhatsApp — сообщение уже собрано.
        </p>
        <a
          className="btn btn--primary"
          href={chat}
          target="_blank"
          rel="noreferrer"
        >
          Продолжить в WhatsApp ↗
        </a>
        {onClose && (
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        )}
      </section>
    )
  return (
    <section className="atelier-lead" lang="ru">
      {onClose && (
        <button
          className="atelier-modal-close"
          onClick={onClose}
          aria-label="Закрыть форму"
        >
          ×
        </button>
      )}
      <h3>Как с вами связаться?</h3>
      <form noValidate onSubmit={submit} aria-busy={busy}>
        <div className="atelier-form-grid">
          {[
            ['name', 'Ваше имя', 'text', 'name', 100],
            ['phone', 'Телефон с кодом страны', 'tel', 'tel', 20],
            ['email', 'Email · необязательно', 'email', 'email', 160],
          ].map(([key, label, type, auto, max]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                type={type}
                autoComplete={auto}
                required={key !== 'email'}
                maxLength={max}
                value={form[key]}
                onChange={change(key)}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `lead-${key}-error` : undefined}
              />
              {errors[key] && (
                <span className="field-error" id={`lead-${key}-error`}>
                  {errors[key]}
                </span>
              )}
            </label>
          ))}
        </div>
        {!compact && (
          <label>
            Комментарий · необязательно
            <textarea
              name="note"
              rows="3"
              maxLength={500}
              value={form.note}
              onChange={change('note')}
            />
          </label>
        )}
        <label className="form-honeypot" aria-hidden="true">
          Сайт
          <input
            name="website"
            tabIndex="-1"
            autoComplete="off"
            value={form.website}
            onChange={change('website')}
          />
        </label>
        <p className="atelier-note">
          Отправляя заявку, вы соглашаетесь на обработку контактов для ответа по
          вашему обращению.{' '}
          <Link to="/privacy">Политика конфиденциальности</Link>.
        </p>
        {errors.submit && (
          <p className="notice notice--error" role="alert">
            {errors.submit}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Сохраняем заявку…' : 'Передать идею мастеру'} ↗
        </button>
      </form>
    </section>
  )
}
