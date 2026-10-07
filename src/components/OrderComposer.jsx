import { useRef, useState } from 'react'
import { useFavorites } from '../state/FavoritesContext'
import { buildBrief, validReference } from '../lib/selection.mjs'
import { styles, materialCandidates } from '../lib/atelierContent'
import LeadCapture from './LeadCapture'
const groups = [
  {
    title: 'Что создаём',
    description:
      'Выберите основу будущего комплекта. Любой пункт можно оставить мастеру.',
    fields: [
      [
        'product',
        'Изделие',
        ['Кызга сеп', 'Жер төшөк', 'Сандык', 'Жаздык', 'Другой текстиль'],
      ],
      ['composition', 'Состав и количество предметов'],
      ['occasion', 'Для дома, события или подарка'],
    ],
  },
  {
    title: 'Характер и детали',
    description:
      'Это пожелания. Наличие ткани и возможность исполнения согласуем отдельно.',
    fields: [
      ['style', 'Стиль', styles],
      ['palette', 'Цвета и сочетания'],
      [
        'material',
        'Желаемый материал',
        ['Стриженный бархат', ...materialCandidates],
      ],
      ['ornament', 'Орнамент или декоративные элементы'],
      ['dimensions', 'Размеры и единицы измерения'],
    ],
  },
  {
    title: 'Ориентиры',
    description: 'Желаемый срок и бюджет помогут обсудить подходящий вариант.',
    fields: [
      ['budget', 'Примерный бюджет, сом'],
      ['deadline', 'Желаемая дата', null, 'date'],
      ['reference', 'Ссылка на фотографию или эскиз', null, 'url'],
    ],
  },
  {
    title: 'Ваша идея',
    description:
      'Проверьте пожелания и оставьте контакты. Повторно вводить выбранные параметры не понадобится.',
    fields: [],
  },
]
export default function OrderComposer() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const title = useRef(null)
  const { items } = useFavorites()
  const brief = buildBrief(form, items)
  function go(next) {
    if (step === 2 && next > step && !validReference(form.reference)) {
      setError(
        'Укажите полную ссылку, начинающуюся с https://, или оставьте поле пустым.',
      )
      return
    }
    setError('')
    setStep(next)
    requestAnimationFrame(() => title.current?.focus())
  }
  return (
    <section
      className="order-composer"
      id="order-form"
      aria-label="Создание индивидуального заказа"
    >
      <ol className="composer-steps">
        {groups.map((g, i) => (
          <li key={g.title} aria-current={step === i ? 'step' : undefined}>
            <button type="button" disabled={i > step} onClick={() => go(i)}>
              <span>0{i + 1}</span>
              {g.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="composer-body">
        <span className="atelier-kicker">
          Шаг {step + 1} из {groups.length}
        </span>
        <h2 ref={title} tabIndex="-1">
          {groups[step].title}
        </h2>
        <p>{groups[step].description}</p>
        {step < 3 ? (
          <>
            <div className="atelier-form-grid">
              {groups[step].fields.map(([key, label, options, type]) => (
                <label key={key}>
                  {label}
                  {options ? (
                    <select
                      value={form[key] || ''}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    >
                      <option value="">Помогите с выбором</option>
                      {options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form[key] || ''}
                      type={type || 'text'}
                      maxLength={key === 'reference' ? 400 : 100}
                      aria-invalid={key === 'reference' && !!error}
                      aria-describedby={
                        key === 'reference' ? 'reference-help' : undefined
                      }
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {step === 2 && (
              <p id="reference-help" className="atelier-note">
                Можно передать общедоступную ссылку на JPG, PNG, WebP или PDF.
                Если фото только на телефоне, отправьте его в WhatsApp после
                сохранения заявки. Файл не прикрепляется автоматически. Референс
                используем как направление для собственной композиции.
              </p>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="composer-controls">
              {step > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => go(step - 1)}
                >
                  Назад
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => go(step + 1)}
              >
                Далее →
              </button>
              <button
                type="button"
                className="atelier-link"
                onClick={() => go(step + 1)}
              >
                Обсудить этот шаг с мастером
              </button>
            </div>
          </>
        ) : (
          <>
            <pre className="idea-summary">{brief}</pre>
            <button
              type="button"
              className="atelier-link"
              onClick={() => go(0)}
            >
              Изменить пожелания
            </button>
            <LeadCapture message={brief} source="contact" />
          </>
        )}
      </div>
    </section>
  )
}
