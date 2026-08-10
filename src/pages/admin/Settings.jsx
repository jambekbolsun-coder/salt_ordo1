import { useEffect, useState } from 'react'
import { Instagram, MessageCircle, Save, Search, Store, Truck } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { getSiteSettings, saveSiteSettings } from '../../lib/api'
import { useSiteSettings } from '../../state/SiteSettingsContext'

const defaults = {
  brand_name:'Salt Ordo',
  whatsapp:'+996998992996',
  instagram:'https://www.instagram.com/salt_ordo/',
  delivery_note_ru:'Доставка по всему Кыргызстану',
  delivery_note_kg:'Кыргызстандын бардык аймагына жеткирүү',
  delivery_note_en:'Delivery across Kyrgyzstan',
  seo_title:'Salt Ordo — домашний текстиль и индивидуальные заказы',
  seo_description:'Төшөк, сеп-комплекты, сандыки и домашний текстиль Salt Ordo. Готовые изделия, индивидуальные заказы и доставка по Кыргызстану.'
}

export default function Settings() {
  const [form,setForm] = useState(defaults)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const { setSettings } = useSiteSettings()
  useEffect(() => { getSiteSettings().then((data)=>setForm({ ...defaults,...data })).catch(()=>{}) }, [])
  const change = (key,value) => setForm((current)=>({ ...current,[key]:value }))
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const saved = await saveSiteSettings(form)
      setSettings((current)=>({ ...current,...saved }))
      setMessage('Настройки сохранены.')
    } catch (err) { setMessage(err.message) }
    finally { setBusy(false) }
  }

  return <>
    <AdminPageHeader eyebrow="Система" title="Настройки сайта" text="Контакты, доставка и SEO меняются без редактирования кода."/>
    <form className="settings-layout" onSubmit={submit}>
      <section className="admin-panel form-section">
        <div className="form-section__head"><div><span><Store/></span><h2>Бренд и контакты</h2></div></div>
        <div className="form-grid">
          <label><span>Название</span><input value={form.brand_name} onChange={(e)=>change('brand_name',e.target.value)}/></label>
          <label><span>WhatsApp</span><div className="input-with-icon"><MessageCircle/><input value={form.whatsapp} onChange={(e)=>change('whatsapp',e.target.value)}/></div></label>
          <label className="form-span-2"><span>Instagram</span><div className="input-with-icon"><Instagram/><input value={form.instagram} onChange={(e)=>change('instagram',e.target.value)}/></div></label>
        </div>
      </section>
      <section className="admin-panel form-section">
        <div className="form-section__head"><div><span><Truck/></span><h2>Доставка · три языка</h2></div></div>
        <div className="form-grid">
          <label className="form-span-2"><span>RU</span><input value={form.delivery_note_ru} onChange={(e)=>change('delivery_note_ru',e.target.value)}/></label>
          <label className="form-span-2"><span>KG</span><input value={form.delivery_note_kg} onChange={(e)=>change('delivery_note_kg',e.target.value)}/></label>
          <label className="form-span-2"><span>EN</span><input value={form.delivery_note_en} onChange={(e)=>change('delivery_note_en',e.target.value)}/></label>
        </div>
      </section>
      <section className="admin-panel form-section">
        <div className="form-section__head"><div><span><Search/></span><h2>SEO</h2></div></div>
        <div className="form-grid">
          <label className="form-span-2"><span>Title</span><input value={form.seo_title} onChange={(e)=>change('seo_title',e.target.value)}/></label>
          <label className="form-span-2"><span>Description</span><textarea rows="4" value={form.seo_description} onChange={(e)=>change('seo_description',e.target.value)}/></label>
        </div>
      </section>
      <div className="settings-savebar">{message && <span>{message}</span>}<button className="btn btn--primary" disabled={busy}><Save/>{busy ? 'Сохраняем…' : 'Сохранить настройки'}</button></div>
    </form>
  </>
}
