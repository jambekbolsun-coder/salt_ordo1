import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronRight, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { getChatbotSettings, listChatbotFaqs } from '../lib/api'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

const defaults = {
  enabled: true,
  title_ru: 'Помощник Salt Ordo',
  title_kg: 'Salt Ordo жардамчысы',
  title_en: 'Salt Ordo assistant',
  welcome_ru: 'Здравствуйте! Я помогу быстро найти ответ на частый вопрос.',
  welcome_kg: 'Саламатсызбы! Көп берилүүчү суроолорго тез жооп табууга жардам берем.',
  welcome_en: 'Hello! I can help you find quick answers to common questions.',
  fallback_ru: 'Пока не нашёл точного ответа. Напишите нам в WhatsApp — менеджер поможет лично.',
  fallback_kg: 'Азырынча так жооп табылган жок. WhatsApp аркылуу жазыңыз — менеджер жеке жардам берет.',
  fallback_en: 'I could not find an exact answer yet. Message us on WhatsApp and our manager will help personally.',
}

const normalize = (value='') => String(value)
  .toLowerCase()
  .replace(/[ё]/g,'е')
  .replace(/[^a-zа-яөүңғқһі0-9\s-]/gi,' ')
  .replace(/\s+/g,' ')
  .trim()

const localized = (item, field, lang) => item?.[`${field}_${lang}`] || item?.[`${field}_ru`] || ''

function findBestFaq(faqs, query, lang) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return null
  const tokens = normalizedQuery.split(' ').filter((token)=>token.length >= 3)
  let best = null
  let bestScore = 0
  for (const faq of faqs) {
    const questions = ['ru','kg','en'].map((code)=>faq[`question_${code}`] || '').join(' ')
    const keywords = Array.isArray(faq.keywords) ? faq.keywords.join(' ') : String(faq.keywords || '')
    const localQuestion = localized(faq,'question',lang)
    const haystack = normalize(`${questions} ${keywords}`)
    let score = 0
    if (normalize(localQuestion) === normalizedQuery) score += 10
    if (normalize(localQuestion).includes(normalizedQuery) || normalizedQuery.includes(normalize(localQuestion))) score += 4
    for (const token of tokens) if (haystack.includes(token)) score += 1
    if (score > bestScore) { best = faq; bestScore = score }
  }
  return bestScore >= 1 ? best : null
}

export default function FloatingAssist() {
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const [open,setOpen] = useState(false)
  const [config,setConfig] = useState(defaults)
  const [faqs,setFaqs] = useState([])
  const [query,setQuery] = useState('')
  const [messages,setMessages] = useState([])
  const panelRef = useRef(null)

  useEffect(() => {
    let active = true
    Promise.all([getChatbotSettings(), listChatbotFaqs()])
      .then(([nextConfig,nextFaqs]) => {
        if (!active) return
        setConfig({ ...defaults, ...(nextConfig || {}) })
        setFaqs(nextFaqs || [])
      })
      .catch(()=>{})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!open) return
    if (messages.length === 0) setMessages([{ from:'bot', text: localized(config,'welcome',lang) || defaults[`welcome_${lang}`] }])
    const key = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown',key)
    return () => window.removeEventListener('keydown',key)
  }, [open, lang, config, messages.length])

  useEffect(() => {
    if (!open) return
    const welcome = localized(config,'welcome',lang) || defaults[`welcome_${lang}`]
    setMessages((current)=>current.length <= 1 ? [{ from:'bot', text: welcome }] : current)
  }, [lang, config, open])

  const quickFaqs = useMemo(() => faqs.filter((item)=>item.is_active !== false).slice(0,5), [faqs])
  const botTitle = localized(config,'title',lang) || defaults[`title_${lang}`]
  const fallback = localized(config,'fallback',lang) || defaults[`fallback_${lang}`]

  const answerFaq = (faq) => {
    const question = localized(faq,'question',lang)
    const answer = localized(faq,'answer',lang)
    setMessages((current)=>[...current,{ from:'user', text:question },{ from:'bot', text:answer }])
  }

  const submit = (event) => {
    event.preventDefault()
    const text = query.trim()
    if (!text) return
    const matched = findBestFaq(faqs,text,lang)
    setMessages((current)=>[
      ...current,
      { from:'user',text },
      { from:'bot',text:matched ? localized(matched,'answer',lang) : fallback, fallback:!matched },
    ])
    setQuery('')
    requestAnimationFrame(()=>panelRef.current?.querySelector('.chatbot-messages')?.scrollTo({ top:99999,behavior:'smooth' }))
  }

  return <>
    <div className="floating-assist" aria-label={t.chatbot.actionsLabel}>
      <a className="floating-action floating-action--whatsapp" href={whatsappUrl(settings.whatsapp,t.common.whatsappText)} target="_blank" rel="noreferrer" aria-label={t.chatbot.whatsapp}>
        <MessageCircle/>
        <span>{t.chatbot.whatsapp}</span>
      </a>
      {config.enabled !== false && <button className={`floating-action floating-action--bot ${open ? 'is-active' : ''}`} type="button" onClick={()=>setOpen((value)=>!value)} aria-expanded={open} aria-label={botTitle}>
        <Bot/>
        <span>{t.chatbot.open}</span>
      </button>}
    </div>

    {config.enabled !== false && <section ref={panelRef} className={`chatbot-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header className="chatbot-panel__head">
        <div className="chatbot-panel__identity"><span><Sparkles/></span><div><strong>{botTitle}</strong><small>{t.chatbot.subtitle}</small></div></div>
        <button className="icon-btn" type="button" onClick={()=>setOpen(false)} aria-label={t.chatbot.close}><X/></button>
      </header>
      <div className="chatbot-messages" aria-live="polite">
        {messages.map((message,index)=><div key={`${message.from}-${index}`} className={`chat-message chat-message--${message.from}`}>
          <p>{message.text}</p>
          {message.fallback && <a href={whatsappUrl(settings.whatsapp,t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle/>{t.chatbot.manager}</a>}
        </div>)}
      </div>
      {quickFaqs.length > 0 && <div className="chatbot-quick">
        <span>{t.chatbot.quick}</span>
        <div>{quickFaqs.map((faq)=><button key={faq.id} type="button" onClick={()=>answerFaq(faq)}>{localized(faq,'question',lang)}<ChevronRight/></button>)}</div>
      </div>}
      <form className="chatbot-input" onSubmit={submit}>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t.chatbot.placeholder} aria-label={t.chatbot.placeholder}/>
        <button type="submit" aria-label={t.chatbot.send}><Send/></button>
      </form>
    </section>}
  </>
}
