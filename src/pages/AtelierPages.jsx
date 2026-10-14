import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import SeoHead from '../components/SeoHead'
import {
  EditorialPhoto,
  Invitation,
  PageIntro,
  PhotoSlot,
  Process,
  SaveIdea,
  TextLink,
} from '../components/AtelierUI'
import OrderComposer from '../components/OrderComposer'
import {
  atelierPages,
  materials,
  materialCandidates,
  palettes,
} from '../lib/atelierContent'
import { SITE_ORIGIN } from '../lib/seoContent'

function Materials() {
  const [compare, setCompare] = useState(['Стриженный бархат'])
  const [ornament, setOrnament] = useState('')
  const options = [...materials.map((m) => m.name), ...materialCandidates]
  return (
    <>
      <PageIntro title="Материал задаёт характер.">
        Начните с ткани: её поверхности, оттенка и ощущения в руках. Образцы и
        точные характеристики выбранного материала обсудим вместе.
      </PageIntro>
      <section className="material-feature">
        <PhotoSlot
          src={materials[0].macro}
          label="Макрофотография стриженного бархата"
          format="4:3"
        />
        <div>
          <span className="atelier-kicker">01 / Из существующего каталога</span>
          <h2>
            Стриженный
            {' '}
            <em>бархат.</em>
          </h2>
          <p>{materials[0].note}</p>
          <dl className="material-facts">
            <div>
              <dt>Состав и плотность</dt>
              <dd>
                {[materials[0].composition, materials[0].density]
                  .filter(Boolean)
                  .join(' · ') || 'Уточним по выбранному образцу'}
              </dd>
            </div>
            <div>
              <dt>Мягкость и блеск</dt>
              <dd>
                {[materials[0].softness, materials[0].finish]
                  .filter(Boolean)
                  .join(' · ') || 'Сравним при личном подборе'}
              </dd>
            </div>
            <div>
              <dt>Цвета и уход</dt>
              <dd>
                {[materials[0].colors.join(', '), materials[0].care]
                  .filter(Boolean)
                  .join(' · ') || 'Согласуем для конкретного изделия'}
              </dd>
            </div>
          </dl>
          <SaveIdea
            item={{
              type: 'material',
              id: 'velvet',
              label: 'Стриженный бархат',
              url: '/materials',
            }}
          />
          <TextLink to="/collections?q=бархат">Изделия из каталога</TextLink>
          {materials[0].detail && (
            <PhotoSlot
              src={materials[0].detail}
              label="Деталь изделия из стриженного бархата"
            />
          )}
        </div>
      </section>
      <section className="atelier-section">
        <div className="atelier-section-head">
          <div>
            <span className="atelier-kicker">Другие направления подбора</span>
            <h2>
              Какая ткань
              {' '}
              <em>вам близка?</em>
            </h2>
          </div>
          <p>
            Это пожелания для обсуждения. Наличие этих тканей в Salt Ordo пока
            не подтверждено.
          </p>
        </div>
        <div className="material-request-list">
          {materialCandidates.map((name, i) => (
            <article key={name}>
              <span>0{i + 2}</span>
              <h3>{name}</h3>
              <small>По запросу · наличие уточняется</small>
              <SaveIdea
                item={{
                  type: 'material',
                  id: `request-${i}`,
                  label: `${name} — уточнить наличие`,
                  url: '/materials',
                }}
              />
            </article>
          ))}
        </div>
      </section>
      <section className="atelier-section" id="palette">
        <span className="atelier-kicker">Палитра будущего комплекта</span>
        <h2>
          Сохраните
          {' '}
          <em>любимый оттенок.</em>
        </h2>
        <p>
          Цвета ниже — ориентир для разговора, не складская карта тканей. Точный
          оттенок выбирается по образцу.
        </p>
        <div className="palette-row palette-row--large">
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
      </section>
      <section className="atelier-section">
        <h2>Сравнить перед выбором</h2>
        <p>
          Отметьте до трёх тканей, которые хотите сравнить с мастером.
          Непроверенные свойства оставлены открытыми.
        </p>
        <div className="compare-options">
          {options.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={compare.includes(name)}
                disabled={!compare.includes(name) && compare.length >= 3}
                onChange={(e) =>
                  setCompare(
                    e.target.checked
                      ? [...compare, name]
                      : compare.filter((n) => n !== name),
                  )
                }
              />
              {name}
            </label>
          ))}
        </div>
        {compare.length > 0 && (
          <div
            className="comparison-scroll"
            tabIndex="0"
            aria-label="Сравнение материалов"
          >
            <table>
              <caption>Вопросы для подбора ткани</caption>
              <thead>
                <tr>
                  <th scope="col">Свойство</th>
                  {compare.map((n) => (
                    <th scope="col" key={n}>
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  'Внешний вид',
                  'Мягкость',
                  'Практичность',
                  'Уход',
                  'Подходящие изделия',
                ].map((label) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {compare.map((n) => (
                      <td key={n}>Уточним по образцу</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="atelier-two-columns atelier-section">
        <div>
          <span className="atelier-kicker">Что находится внутри</span>
          <h2>
            Форма начинается
            {' '}
            <em>с наполнения.</em>
          </h2>
          <p>
            Наполнитель выбирается вместе с тканью и назначением изделия. Его
            состав, мягкость и рекомендации по хранению нужно подтвердить до
            изготовления.
          </p>
          <TextLink to="/individual-order">Обсудить наполнение</TextLink>
        </div>
        <div>
          <span className="atelier-kicker">Рисунок и смысл</span>
          <h2>
            Место для
            {' '}
            <em>вашего орнамента.</em>
          </h2>
          <p>
            Опишите мотив или дайте ему рабочее название. Референс можно
            передать в форме заказа. Авторские работы используем только с
            разрешения.
          </p>
          <label>
            Идея орнамента
            <input
              maxLength={100}
              value={ornament}
              onChange={(e) => setOrnament(e.target.value)}
            />
          </label>
          {ornament.trim() && (
            <SaveIdea
              item={{
                type: 'ornament',
                id: ornament.trim().toLowerCase(),
                label: ornament.trim(),
                url: '/individual-order',
              }}
            />
          )}
        </div>
      </section>
      <Invitation />
    </>
  )
}
function IndividualOrder() {
  return (
    <>
      <section className="order-landing-intro">
        <PageIntro title="Создайте то, что близко вам.">
          Изделие, материал, цвет и рисунок — отправные точки вашего комплекта.
          Начните с того, что уже знаете. Остальное обсудим вместе.
        </PageIntro>
        <EditorialPhoto
          slug="ming-kurak-0ccde54e"
          alt="Миң курак из каталога Salt Ordo"
          priority
        />
      </section>
      <nav className="order-jump">
        <a className="btn btn--primary" href="#order-form">
          Рассказать о своей идее ↓
        </a>
        <TextLink to="/selection">Открыть мою подборку</TextLink>
      </nav>
      <Process compact />
      <section className="order-context">
        <div>
          <h2>Можно начать с референса.</h2>
          <p>
            Передайте ссылку на фотографию или отправьте изображение в WhatsApp.
            Рисунок, ткань и пропорции обсудим перед работой.
          </p>
        </div>
        <div>
          <h2>Ткань выбираем вместе.</h2>
          <p>
            Наличие материала, стоимость и срок подтверждаются индивидуально.
            Предварительная заявка ни к чему не обязывает.
          </p>
          <TextLink to="/materials">Посмотреть материалы</TextLink>
        </div>
      </section>
      <OrderComposer />
      <section className="atelier-faq">
        <h2>Перед первым разговором</h2>
        {[
          [
            'Нужно ли знать точные размеры?',
            'Нет. Можно оставить этот пункт пустым и попросить мастера помочь с замерами.',
          ],
          [
            'Можно ли изменить готовый дизайн?',
            'Да, укажите понравившееся изделие и желаемые изменения. Возможность исполнения обсудим до заказа.',
          ],
          [
            'Как узнать стоимость и срок?',
            'Они зависят от согласованных материалов, размеров, состава и декора. Сначала обсудим детали, затем подтвердим расчёт.',
          ],
          [
            'Как передать фотографию?',
            'Добавьте доступную ссылку в форме или отправьте JPG, PNG, WebP либо PDF мастеру в WhatsApp. Ссылка должна открываться без входа в ваш аккаунт.',
          ],
        ].map(([q, a]) => (
          <div key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </section>
    </>
  )
}
function Care() {
  return (
    <>
      <PageIntro title="Чтобы вещь оставалась близкой надолго.">
        Уход зависит от ткани, наполнителя, шва и декоративных деталей. Для
        вашего изделия нужны рекомендации именно к нему.
      </PageIntro>
      <div className="care-guide">
        {[
          [
            'Ткань и отделка',
            'Перед очисткой уточните состав ткани, устойчивость красителя и особенности вышивки. Если эти сведения не указаны, запросите их у мастера.',
          ],
          [
            'Очистка',
            'Не выбирайте температуру стирки, моющее средство или способ химчистки только по внешнему виду ткани. Передайте мастеру название изделия и фотографию ярлыка.',
          ],
          [
            'Форма и наполнитель',
            'Допустимость стирки, отжима и сушки зависит от наполнения. Попросите рекомендации для конкретного комплекта.',
          ],
          [
            'Хранение',
            'Перед длительным хранением уточните способ упаковки, необходимость проветривания и условия, при которых изделие сохраняет форму.',
          ],
        ].map(([title, text], i) => (
          <section key={title}>
            <span>0{i + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <section className="atelier-invitation">
        <h2>
          Уточним уход
          {' '}
          <em>за вашей вещью.</em>
        </h2>
        <p>
          В обращении укажите название изделия, материал, если он известен, и
          что требуется: очистка, хранение или восстановление формы.
        </p>
        <TextLink to="/contacts">Спросить мастера</TextLink>
      </section>
    </>
  )
}
export default function AtelierPages() {
  const { pathname } = useLocation()
  const key = pathname.slice(1)
  const meta = atelierPages[key] || atelierPages['individual-order']
  const Component =
    {
      materials: Materials,
      'individual-order': IndividualOrder,
      care: Care,
    }[key] || IndividualOrder
  return (
    <div className="atelier-container atelier-page" lang="ru">
      <SeoHead
        title={`${meta.title} | Salt Ordo`}
        description={meta.description}
        path={pathname}
        image="/atelier/ming-kurak-960.webp"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Главная',
              item: SITE_ORIGIN,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: meta.title,
              item: SITE_ORIGIN + pathname,
            },
          ],
        }}
      />
      <Component />
    </div>
  )
}
