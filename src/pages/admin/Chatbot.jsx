import { useEffect, useState } from 'react'
import { Bot, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import {
  deleteChatbotFaq,
  getChatbotSettings,
  listChatbotFaqs,
  saveChatbotFaq,
  saveChatbotSettings,
} from '../../lib/api'

const defaultSettings = {
  id: true,
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

const emptyFaq = {
  question_ru:'', question_kg:'', question_en:'',
  answer_ru:'', answer_kg:'', answer_en:'',
  keywords:'', sort_order:0, is_active:true,
}

const LangBlock = ({ code, label, form, change }) => (
  <div className="chatbot-lang-block">
    <span className="chatbot-lang-block__label">{label}</span>
    <label><span>Название помощника</span><input value={form[`title_${code}`] || ''} onChange={(e)=>change(`title_${code}`,e.target.value)}/></label>
    <label><span>Приветствие</span><textarea rows="3" value={form[`welcome_${code}`] || ''} onChange={(e)=>change(`welcome_${code}`,e.target.value)}/></label>
    <label><span>Если ответа нет</span><textarea rows="3" value={form[`fallback_${code}`] || ''} onChange={(e)=>change(`fallback_${code}`,e.target.value)}/></label>
  </div>
)

export default function Chatbot() {
  const [settings,setSettings] = useState(defaultSettings)
  const [faqs,setFaqs] = useState([])
  const [newFaq,setNewFaq] = useState(emptyFaq)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')

  const load = async () => {
    const [nextSettings,nextFaqs] = await Promise.all([
      getChatbotSettings(),
      listChatbotFaqs({ admin:true }),
    ])
    setSettings({ ...defaultSettings, ...(nextSettings || {}) })
    setFaqs(nextFaqs || [])
  }

  useEffect(() => { load().catch((err)=>setError(err.message)) }, [])

  const changeSetting = (key,value) => setSettings((current)=>({ ...current,[key]:value }))
  const changeFaq = (id,key,value) => setFaqs((items)=>items.map((item)=>item.id === id ? { ...item,[key]:value } : item))

  const saveSettings = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('')
    try {
      const saved = await saveChatbotSettings(settings)
      setSettings({ ...settings,...saved })
      setMessage('Настройки помощника сохранены.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const createFaq = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('')
    try {
      if (!newFaq.question_ru.trim() || !newFaq.answer_ru.trim()) throw new Error('Заполните вопрос и ответ на русском языке.')
      await saveChatbotFaq(newFaq)
      setNewFaq(emptyFaq)
      await load()
      setMessage('Новый вопрос добавлен.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const saveFaq = async (item) => {
    setBusy(true); setMessage(''); setError('')
    try {
      await saveChatbotFaq(item)
      await load()
      setMessage('Ответ обновлён.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const removeFaq = async (id) => {
    if (!window.confirm('Удалить этот вопрос из чат-бота?')) return
    setBusy(true); setError('')
    try { await deleteChatbotFaq(id); await load() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <>
    <AdminPageHeader eyebrow="Помощник" title="Чат-бот и частые вопросы" text="Здесь вы сами задаёте смысл ответов. Посетитель увидит вопросы на своём языке, а если точного ответа нет — помощник предложит WhatsApp."/>
    {message && <div className="notice notice--success">{message}</div>}
    {error && <div className="notice notice--error">{error}</div>}

    <form className="admin-panel form-section chatbot-settings" onSubmit={saveSettings}>
      <div className="form-section__head">
        <div><span><Bot/></span><h2>Поведение помощника</h2></div>
        <label className="switch-row"><input type="checkbox" checked={settings.enabled} onChange={(e)=>changeSetting('enabled',e.target.checked)}/><span>Показывать чат-бот на сайте</span></label>
      </div>
      <div className="chatbot-language-grid">
        <LangBlock code="ru" label="RU · Русский" form={settings} change={changeSetting}/>
        <LangBlock code="kg" label="KG · Кыргызча" form={settings} change={changeSetting}/>
        <LangBlock code="en" label="EN · English" form={settings} change={changeSetting}/>
      </div>
      <div className="chatbot-save-row"><button className="btn btn--primary" disabled={busy}><Save/>{busy ? 'Сохраняем…' : 'Сохранить настройки'}</button></div>
    </form>

    <section className="admin-panel form-section chatbot-create">
      <div className="form-section__head"><div><span><Sparkles/></span><h2>Добавить частый вопрос</h2></div><small>Русский обязателен, KG/EN — смысловая адаптация.</small></div>
      <form onSubmit={createFaq} className="chatbot-faq-form">
        <div className="chatbot-faq-columns">
          <div><strong>RU</strong><input placeholder="Вопрос" value={newFaq.question_ru} onChange={(e)=>setNewFaq({ ...newFaq,question_ru:e.target.value })}/><textarea rows="4" placeholder="Ответ" value={newFaq.answer_ru} onChange={(e)=>setNewFaq({ ...newFaq,answer_ru:e.target.value })}/></div>
          <div><strong>KG</strong><input placeholder="Суроо" value={newFaq.question_kg} onChange={(e)=>setNewFaq({ ...newFaq,question_kg:e.target.value })}/><textarea rows="4" placeholder="Жооп" value={newFaq.answer_kg} onChange={(e)=>setNewFaq({ ...newFaq,answer_kg:e.target.value })}/></div>
          <div><strong>EN</strong><input placeholder="Question" value={newFaq.question_en} onChange={(e)=>setNewFaq({ ...newFaq,question_en:e.target.value })}/><textarea rows="4" placeholder="Answer" value={newFaq.answer_en} onChange={(e)=>setNewFaq({ ...newFaq,answer_en:e.target.value })}/></div>
        </div>
        <div className="chatbot-faq-meta">
          <label><span>Ключевые слова</span><input placeholder="доставка, срок, Бишкек, delivery" value={newFaq.keywords} onChange={(e)=>setNewFaq({ ...newFaq,keywords:e.target.value })}/><small>Через запятую. Можно писать на трёх языках.</small></label>
          <label><span>Порядок</span><input type="number" value={newFaq.sort_order} onChange={(e)=>setNewFaq({ ...newFaq,sort_order:e.target.value })}/></label>
          <label className="switch-row"><input type="checkbox" checked={newFaq.is_active} onChange={(e)=>setNewFaq({ ...newFaq,is_active:e.target.checked })}/><span>Показывать</span></label>
          <button className="btn btn--primary" disabled={busy}><Plus/>Добавить</button>
        </div>
      </form>
    </section>

    <section className="chatbot-faq-list">
      {faqs.map((item)=><article className="admin-panel chatbot-faq-card" key={item.id}>
        <div className="chatbot-faq-card__head">
          <div><span className="eyebrow">FAQ #{Number(item.sort_order || 0)}</span><h3>{item.question_ru}</h3></div>
          <div className="row-actions">
            <label className="switch-row switch-row--compact"><input type="checkbox" checked={item.is_active} onChange={(e)=>changeFaq(item.id,'is_active',e.target.checked)}/><span>{item.is_active ? 'Виден' : 'Скрыт'}</span></label>
            <button className="icon-btn danger-btn" type="button" onClick={()=>removeFaq(item.id)} aria-label="Удалить"><Trash2/></button>
          </div>
        </div>
        <div className="chatbot-faq-columns">
          {['ru','kg','en'].map((code)=><div key={code}><strong>{code.toUpperCase()}</strong><input value={item[`question_${code}`] || ''} onChange={(e)=>changeFaq(item.id,`question_${code}`,e.target.value)}/><textarea rows="4" value={item[`answer_${code}`] || ''} onChange={(e)=>changeFaq(item.id,`answer_${code}`,e.target.value)}/></div>)}
        </div>
        <div className="chatbot-faq-meta chatbot-faq-meta--edit">
          <label><span>Ключевые слова</span><input value={Array.isArray(item.keywords) ? item.keywords.join(', ') : (item.keywords || '')} onChange={(e)=>changeFaq(item.id,'keywords',e.target.value)}/></label>
          <label><span>Порядок</span><input type="number" value={item.sort_order || 0} onChange={(e)=>changeFaq(item.id,'sort_order',e.target.value)}/></label>
          <button className="btn btn--soft" type="button" disabled={busy} onClick={()=>saveFaq(item)}><Save/>Сохранить</button>
        </div>
      </article>)}
      {faqs.length === 0 && <div className="admin-panel empty-cell">FAQ пока пуст. Добавьте первый вопрос выше.</div>}
    </section>
  </>
}
