import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../state/FavoritesContext'
import { selectionSummary, selectionTypes } from '../lib/selection.mjs'
import { PageIntro, TextLink } from '../components/AtelierUI'
import { useCatalog } from '../lib/atelierHooks'
import LeadCapture from '../components/LeadCapture'
export default function Favorites() {
  const { items, remove } = useFavorites()
  const { products } = useCatalog()
  const [comment, setComment] = useState('')
  const list = useMemo(
    () =>
      items.map((i) => {
        const p =
          i.type === 'product' ? products.find((p) => p.id === i.id) : null
        return p ? { ...i, label: p.name_ru, url: `/product/${p.slug}` } : i
      }),
    [items, products],
  )
  const summary = ['Моя подборка Salt Ordo', selectionSummary(list), comment]
    .filter(Boolean)
    .join('\n')
  return (
    <div className="atelier-container atelier-page" lang="ru">
      <PageIntro title="Моя подборка">
        Соберите будущий комплект из вещей, тканей, оттенков и деталей, которые
        вам близки. Без регистрации.
      </PageIntro>
      {items.length ? (
        <div className="selection-layout">
          <div>
            <ul className="selection-list">
              {list.map((i) => (
                <li key={`${i.type}:${i.id}`}>
                  <span>{selectionTypes[i.type]}</span>
                  <h2>{i.url ? <Link to={i.url}>{i.label}</Link> : i.label}</h2>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Убрать из подборки: ${i.label}`}
                  >
                    Убрать
                  </button>
                </li>
              ))}
            </ul>
            <label className="selection-comment">
              Что объединяет эти идеи?
              <textarea
                rows="4"
                maxLength={350}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <TextLink to="/collections">Продолжить подбор</TextLink>
            <TextLink to="/individual-order">
              Уточнить детали комплекта
            </TextLink>
          </div>
          <aside>
            <h2>Передайте замысел.</h2>
            <p>Мастер получит всю подборку и ваш комментарий в одной заявке.</p>
            <LeadCapture compact message={summary} />
          </aside>
        </div>
      ) : (
        <section className="atelier-empty">
          <span className="atelier-kicker">Всё начинается с одной детали</span>
          <h2>
            Здесь будет
            <br />
            <em>ваша идея.</em>
          </h2>
          <p>
            Нажимайте на закладку возле изделия, коллекции, цвета или материала.
            Ваш выбор сохранится в этом браузере.
          </p>
          <TextLink to="/collections">Посмотреть коллекции</TextLink>
          <TextLink to="/materials">Начать с материалов</TextLink>
        </section>
      )}
    </div>
  )
}
