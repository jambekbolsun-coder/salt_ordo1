import { Link } from 'react-router-dom'
import {
  EditorialPhoto,
  TextLink,
  SaveIdea,
  Process,
  Invitation,
} from './AtelierUI'
import { directions, styles, palettes } from '../lib/atelierContent'
export default function HomeDetails() {
  return (
    <div className="atelier-home" lang="ru">
      <div className="atelier-container">
        <section className="atelier-introduction">
          <span className="atelier-kicker">Дом начинается с близкого</span>
          <div>
            <h2>
              Вещи, в которых
              {' '}
              есть <em>ваша история.</em>
            </h2>
            <p>
              Salt Ordo — мастерская текстиля в Бишкеке. Мы создаём готовые
              изделия и комплекты на заказ: от жер төшөк и жаздыков до кызга
              сеп. Ткань, палитра, рисунок и размеры складываются в вещь,
              близкую именно вам.
            </p>
            <TextLink to="/individual-order">Создать свой комплект</TextLink>
          </div>
        </section>
        <section className="atelier-section">
          <div className="atelier-section-head">
            <div>
              <span className="atelier-kicker">01 / Коллекции</span>
              <h2>
                Для дома.
                {' '}
                <em>Для особенного.</em>
              </h2>
            </div>
            <TextLink to="/collections">Все коллекции</TextLink>
          </div>
          <div className="collection-editorial-grid">
            {directions.filter((d) => d.image).map((d, i) => (
              <article key={d.id}>
                <Link
                  to={d.path || `/collections?${d.query || `category=${d.id}`}`}
                >
                  <EditorialPhoto slug={d.image} alt={d.name} />
                </Link>
                <div className="collection-caption">
                  <span>0{i + 1}</span>
                  <div>
                    <h3>
                      <Link
                        to={
                          d.path ||
                          `/collections?${d.query || `category=${d.id}`}`
                        }
                      >
                        {d.name}
                      </Link>
                    </h3>
                    <p>{d.description}</p>
                  </div>
                  <SaveIdea
                    compact
                    item={{
                      type: 'collection',
                      id: d.id,
                      label: d.name,
                      url:
                        d.path ||
                        `/collections?${d.query || `category=${d.id}`}`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          <div className="collection-text-links">
            {directions.filter((d) => !d.image).map((d) => (
              <div key={d.id}><TextLink to={d.path || `/collections?category=${d.id}`}>{d.name}</TextLink><p>{d.description}</p></div>
            ))}
          </div>
        </section>
      </div>
      <section className="atelier-style-section">
        <div className="atelier-container">
          <span className="atelier-kicker">02 / Ваше видение</span>
          <div className="atelier-style-intro">
            <h2>
              Один дом.
              {' '}
              <em>Тысячи сочетаний.</em>
            </h2>
            <p>
              Национальный орнамент или спокойная однотонная ткань.
              Выразительная композиция или лаконичные детали. Эти направления —
              начало разговора, а не границы выбора.
            </p>
          </div>
          <div className="style-list">
            {styles.map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                <h3>{s}</h3>
                <SaveIdea
                  compact
                  item={{
                    type: 'style',
                    id: String(i),
                    label: s,
                    url: '/individual-order',
                  }}
                />
              </div>
            ))}
          </div>
          <TextLink to="/individual-order">Рассказать о своей идее</TextLink>
        </div>
      </section>
      <div className="atelier-container">
        <section className="atelier-material-teaser">
          <div>
            <span className="atelier-kicker">03 / Материалы и цвет</span>
            <h2>
              Начните
              {' '}
              <em>с ощущения.</em>
            </h2>
            <p>
              Посмотрите ткань вблизи, сравните оттенки, обсудите наполнение.
              Окончательный выбор лучше делать по образцу — экран передаёт цвет
              приблизительно.
            </p>
            <div className="palette-row">
              {palettes.map((p) => (
                <div key={p.id}>
                  <span style={{ background: p.hex }} aria-hidden="true" />
                  <SaveIdea
                    compact
                    item={{
                      type: 'color',
                      id: p.id,
                      label: p.name,
                      url: '/materials#palette',
                    }}
                  />
                  <small>{p.name}</small>
                </div>
              ))}
            </div>
            <TextLink to="/materials">Выбрать материалы</TextLink>
          </div>
        </section>
        <Process compact />
        <section className="reference-story">
          <span className="atelier-kicker">04 / От идеи до готовой вещи</span>
          <h2>
            Ваш референс —{' '}
            <em>начало новой работы.</em>
          </h2>
          <div className="reference-stages">
            <div>
              <span>01</span>
              <h3>Идея</h3>
              <p>Фотография, эскиз или несколько слов о будущем комплекте.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Подбор</h3>
              <p>Материалы, палитра и собственная композиция Salt Ordo.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Результат</h3>
              <p>Изделие по согласованным размерам и деталям.</p>
            </div>
          </div>

        </section>
        <Invitation />
      </div>
    </div>
  )
}
