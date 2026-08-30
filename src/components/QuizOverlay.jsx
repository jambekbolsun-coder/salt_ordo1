import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Box, Check, Clock, DollarSign, HelpCircle, Layers3, Package, Palette, Ruler, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { completeQuiz, dismissQuiz, saveQuizAnswer, startQuiz } from '../lib/api'
import { getTrackingIds } from '../lib/analytics'
import { useLanguage } from '../state/LanguageContext'

const COMPLETED_KEY = 'salt-ordo-quiz-completed'
const DISMISSED_KEY = 'salt-ordo-quiz-dismissed'

const copy = {
  ru: {
    eyebrow: 'Персональный подбор',
    title: 'Что вы хотите подобрать?',
    text: 'Ответьте на 5 вопросов — мы покажем подходящие варианты.',
    step: 'Вопрос',
    back: 'Назад',
    next: 'Дальше',
    result: 'Показать результат',
    closeTitle: 'Точно закрыть подбор?',
    closeText: 'Без ответов будет сложнее быстро найти нужный комплект. Лучше закончить — осталось совсем немного.',
    continue: 'Продолжить',
    close: 'Всё равно закрыть',
    bubble: 'Мы поможем с выбором',
  },
  kg: {
    eyebrow: 'Жеке тандоо',
    title: 'Сизге керектүү нерсени табабыз',
    text: 'Беш кыска суроо — анан каталогдун ылайыктуу бөлүгүн көрсөтөбүз.',
    step: 'Суроо',
    back: 'Артка',
    next: 'Кийинки',
    result: 'Жыйынтыкты көрсөтүү',
    closeTitle: 'Чын эле жабасызбы?',
    closeText: 'Жоопсуз керектүү комплектти табуу кыйыныраак болот. Аягына чейин өтүп коюңуз.',
    continue: 'Улантуу',
    close: 'Баары бир жабуу',
    bubble: 'Тандоого жардам беребиз',
  },
  en: {
    eyebrow: 'Personal selection',
    title: 'Let us find exactly what you need',
    text: 'Five short questions, then we will show the most relevant catalog section.',
    step: 'Question',
    back: 'Back',
    next: 'Next',
    result: 'Show results',
    closeTitle: 'Close the selection?',
    closeText: 'Without your answers it will take longer to find the right set. You are almost done.',
    continue: 'Continue',
    close: 'Close anyway',
    bubble: 'We will help you choose',
  },
}

const optionIcons = {
  sep: Layers3,
  tradition: Sparkles,
  custom: Ruler,
  other: Palette,
  'jer-toshok': Layers3,
  jastyk: Package,
  sandyk: Box,
  all: Sparkles,
  week: Clock,
  'two-weeks': Clock,
  month: Clock,
  later: Clock,
  traditional: Sparkles,
  modern: Palette,
  light: Palette,
  dark: Palette,
  own: Ruler,
  'under-20': DollarSign,
  '20-50': DollarSign,
  '50-100': DollarSign,
  '100-plus': DollarSign,
  discuss: HelpCircle,
}

const questions = {
  ru: [
    ['purpose', 'Для чего вы выбираете изделия?', [['sep','Кызга сеп'],['tradition','Для традиции или события'],['custom','Индивидуальный заказ'],['other','Другое']]],
    ['item', 'Что вас интересует больше всего?', [['sep','Полный сеп-комплект'],['jer-toshok','Жер төшөк'],['jastyk','Подушки / жаздык'],['sandyk','Сандык'],['all','Хочу посмотреть всё']]],
    ['deadline', 'Когда заказ должен быть готов?', [['week','До 7 дней'],['two-weeks','До 2 недель'],['month','В течение месяца'],['later','Срок пока не важен']]],
    ['style', 'Какой стиль вам ближе?', [['traditional','Национальный и традиционный'],['modern','Современный минимализм'],['light','Светлый и нежный'],['dark','Глубокие тёмные оттенки'],['own','Есть свой пример']]],
    ['budget', 'Как удобнее обсудить бюджет?', [['under-20','До 20 000 сом'],['20-50','20 000–50 000 сом'],['50-100','50 000–100 000 сом'],['100-plus','От 100 000 сом'],['discuss','Подобрать после консультации']]],
  ],
  kg: [
    ['purpose', 'Буюмдарды эмне үчүн тандап жатасыз?', [['sep','Кызга сеп'],['tradition','Салт же иш-чара үчүн'],['custom','Жеке буйрутма'],['other','Башка']]],
    ['item', 'Сизди көбүрөөк эмне кызыктырат?', [['sep','Толук сеп комплекти'],['jer-toshok','Жер төшөк'],['jastyk','Жаздык'],['sandyk','Сандык'],['all','Баарын көргүм келет']]],
    ['deadline', 'Буйрутма качан даяр болушу керек?', [['week','7 күнгө чейин'],['two-weeks','2 жумага чейин'],['month','Бир айдын ичинде'],['later','Мөөнөт маанилүү эмес']]],
    ['style', 'Кайсы стиль жакын?', [['traditional','Улуттук жана салттуу'],['modern','Заманбап минимализм'],['light','Ачык жана назик'],['dark','Кочкул түстөр'],['own','Өзүмдүн үлгүм бар']]],
    ['budget', 'Бюджетти кантип талкуулайбыз?', [['under-20','20 000 сомго чейин'],['20-50','20 000–50 000 сом'],['50-100','50 000–100 000 сом'],['100-plus','100 000 сомдон жогору'],['discuss','Кеңештен кийин тандайбыз']]],
  ],
  en: [
    ['purpose', 'What are you choosing the items for?', [['sep','Bridal dowry'],['tradition','A tradition or event'],['custom','A custom order'],['other','Other']]],
    ['item', 'What interests you most?', [['sep','Complete dowry set'],['jer-toshok','Floor bedding'],['jastyk','Pillows'],['sandyk','Chest'],['all','Show me everything']]],
    ['deadline', 'When should the order be ready?', [['week','Within 7 days'],['two-weeks','Within 2 weeks'],['month','Within a month'],['later','Timing is flexible']]],
    ['style', 'Which style feels right?', [['traditional','National and traditional'],['modern','Modern minimalism'],['light','Light and delicate'],['dark','Deep dark shades'],['own','I have a reference']]],
    ['budget', 'How should we approach the budget?', [['under-20','Up to 20,000 KGS'],['20-50','20,000–50,000 KGS'],['50-100','50,000–100,000 KGS'],['100-plus','From 100,000 KGS'],['discuss','Choose after a consultation']]],
  ],
}

function safeGet(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function safeSet(key, value) {
  try { window.localStorage.setItem(key, value) } catch { return undefined }
}

export default function QuizOverlay() {
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [dismissed, setDismissed] = useState(() => Boolean(safeGet(DISMISSED_KEY)))
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [quizSessionId, setQuizSessionId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const text = copy[lang] || copy.ru
  const items = questions[lang] || questions.ru
  const current = items[step]
  const tracking = useMemo(() => getTrackingIds(), [])
  const cardRef = useRef(null)

  useEffect(() => {
    if (safeGet(COMPLETED_KEY) || safeGet(DISMISSED_KEY)) return
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open || quizSessionId) return
    startQuiz({ ...tracking, language: lang })
      .then(setQuizSessionId)
      .catch(() => {})
  }, [open, quizSessionId, tracking, lang])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const previousFocus = document.activeElement
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setConfirmClose(true)
        return
      }
      if (event.key !== 'Tab' || !cardRef.current) return
      const focusable = [...cardRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => cardRef.current?.querySelector('button')?.focus())
    return () => {
      document.body.style.overflow = previous
      document.body.style.paddingRight = previousPadding
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus?.({ preventScroll:true })
    }
  }, [open])

  useEffect(() => {
    if (!open || !confirmClose) return
    requestAnimationFrame(() => cardRef.current?.querySelector('.quiz-confirm .btn')?.focus())
  }, [confirmClose, open])

  const choose = async (value) => {
    setAnswers((state) => ({ ...state, [current[0]]: value }))
    if (quizSessionId) {
      saveQuizAnswer({
        ...tracking,
        quizSessionId,
        questionKey: current[0],
        answer: value,
      }).catch(() => {})
    }
  }

  const finish = async () => {
    const finalAnswers = answers
    const item = finalAnswers.item
    const purpose = finalAnswers.purpose
    const categories = item && item !== 'all'
      ? [item]
      : purpose === 'sep'
        ? ['sep']
        : purpose === 'custom'
          ? ['custom']
          : []
    setBusy(true)
    setError('')
    try {
      if (quizSessionId) await completeQuiz({ ...tracking, quizSessionId, categorySlugs: categories })
      safeSet(COMPLETED_KEY, '1')
      try { window.localStorage.removeItem(DISMISSED_KEY) } catch { /* private browsing */ }
      setOpen(false)
      setDismissed(false)
      navigate(categories[0] ? `/catalog?category=${categories[0]}&quiz=1` : '/catalog?quiz=1')
    } catch (err) {
      setError(err.message || 'Не удалось завершить подбор.')
    } finally {
      setBusy(false)
    }
  }

  const closeAnyway = () => {
    if (quizSessionId) dismissQuiz({ ...tracking, quizSessionId }).catch(() => {})
    safeSet(DISMISSED_KEY, '1')
    setDismissed(true)
    setConfirmClose(false)
    setOpen(false)
  }

  if (!open) {
    if (!dismissed || safeGet(COMPLETED_KEY)) return null
    return (
      <button className="quiz-bubble" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-controls="selection-quiz">
        <span><HelpCircle/></span>
        <strong>{text.bubble}</strong>
      </button>
    )
  }

  return (
    <div id="selection-quiz" className="quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="quiz-title" aria-describedby={step === 0 ? 'quiz-description' : undefined}>
      <button className="quiz-overlay__backdrop" type="button" onClick={() => setConfirmClose(true)} aria-label="Close"/>
      <section ref={cardRef} className="quiz-card" tabIndex="-1">
        <button className="quiz-close" type="button" onClick={() => setConfirmClose(true)} aria-label="Close"><X/></button>
        <div className="quiz-card__brand"><span><Sparkles/></span><strong>SALT <em>ORDO</em></strong></div>

        {confirmClose ? (
          <div className="quiz-confirm">
            <span className="quiz-confirm__icon"><HelpCircle/></span>
            <h2>{text.closeTitle}</h2>
            <p>{text.closeText}</p>
            <button className="btn btn--primary btn--block" type="button" onClick={() => setConfirmClose(false)}>{text.continue}</button>
            <button className="btn btn--ghost btn--block" type="button" onClick={closeAnyway}>{text.close}</button>
          </div>
        ) : (
          <>
            <div className="quiz-step-label">{text.step} {step + 1} / {items.length}</div>
            <div className="quiz-intro">
              <h1 id="quiz-title">{step === 0 ? text.title : current[1]}</h1>
              {step === 0 && <p id="quiz-description">{text.text}</p>}
            </div>
            <div className="quiz-progress" aria-label={`${text.step} ${step + 1} / ${items.length}`}>
              <span style={{ width: `${((step + 1) / items.length) * 100}%` }}/>
            </div>
            <div className="quiz-options">
              {current[2].map(([value, label]) => {
                const OptionIcon = optionIcons[value] || Sparkles
                return (
                  <button key={value} type="button" className={answers[current[0]] === value ? 'is-active' : ''} onClick={() => choose(value)}>
                    <span className="quiz-option__icon"><OptionIcon/></span>
                    <span className="quiz-option__label">{label}</span>
                    <i>{answers[current[0]] === value && <Check/>}</i>
                  </button>
                )
              })}
            </div>
            {error && <div className="notice notice--error">{error}</div>}
            <div className="quiz-actions">
              <button className="btn btn--ghost" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft/>{text.back}</button>
              {step < items.length - 1
                ? <button className="btn btn--primary" type="button" disabled={!answers[current[0]]} onClick={() => setStep((value) => value + 1)}>{text.next}<ArrowRight/></button>
                : <button className="btn btn--primary" type="button" disabled={!answers[current[0]] || busy} onClick={finish}>{text.result}<Sparkles/></button>}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
