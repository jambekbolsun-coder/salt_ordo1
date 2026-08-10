import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ImagePlus, Percent, Save, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteProductImage, getAdminProduct, listCategories, saveProduct,
  saveProductImages, updateProductImageOrder
} from '../../lib/api'
import { money, slugify } from '../../lib/format'
import { supabaseConfigured } from '../../lib/supabase'
import AdminPageHeader from '../../components/AdminPageHeader'

const initial = {
  name_ru:'', name_kg:'', name_en:'',
  description_ru:'', description_kg:'', description_en:'',
  slug:'', category_id:'', sku:'',
  cost_price:'', sale_price:'', old_price:'', price_on_request:false,
  seam:'', material:'', seam_ru:'', seam_kg:'', seam_en:'', material_ru:'', material_kg:'', material_en:'', colors:[], sizes:[], stock_qty:0, production_days:'',
  status:'draft', is_featured:false, is_new:false, is_set:false, sort_order:0,
  is_on_sale:false, promo_label_ru:'', promo_label_kg:'', promo_label_en:'', promo_start_at:'', promo_end_at:'',
  images:[],
}

const langLabels = { ru:'Русский', kg:'Кыргызча', en:'English' }
const MAX_PRODUCT_IMAGES = 20
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function TagsInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const clean = draft.trim()
    if (clean && !value.includes(clean)) onChange([...value, clean])
    setDraft('')
  }
  return <div className="tags-input">
    <div className="tags-input__chips">{value.map((item) => <button type="button" key={item} onClick={() => onChange(value.filter((valueItem) => valueItem !== item))}>{item}<span>×</span></button>)}</div>
    <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }} onBlur={add} placeholder={placeholder}/>
  </div>
}

function LocalizedTextFields({ form, change }) {
  const [lang, setLang] = useState('ru')
  const hints = {
    ru: 'Пишите естественно и продающе: не перечисляйте сухие характеристики, объясните пользу и настроение изделия.',
    kg: 'Орусчадан сөзмө-сөз которбой, кыргызча табигый жана түшүнүктүү мааниде жазыңыз.',
    en: 'Write naturally for an English-speaking customer; adapt the meaning instead of translating word for word.',
  }
  return <>
    <div className="admin-language-tabs">
      {Object.entries(langLabels).map(([code,label]) => <button type="button" key={code} className={lang === code ? 'is-active' : ''} onClick={() => setLang(code)}>{label}{code === 'ru' ? ' *' : ''}</button>)}
    </div>
    <div className="translation-hint"><Sparkles size={16}/><span>{hints[lang]}</span></div>
    <div className="form-grid localized-editor">
      <label className="form-span-2"><span>Название · {langLabels[lang]}</span><input value={form[`name_${lang}`] || ''} onChange={(e) => change(`name_${lang}`, e.target.value)} required={lang === 'ru'} placeholder={lang === 'ru' ? 'Например: Төшөк комплект «Нежный рассвет»' : lang === 'kg' ? 'Кардарга табигый угулган аталыш' : 'A natural customer-friendly product name'}/></label>
      <label className="form-span-2"><span>Описание · {langLabels[lang]}</span><textarea rows="5" value={form[`description_${lang}`] || ''} onChange={(e) => change(`description_${lang}`, e.target.value)} placeholder={lang === 'ru' ? 'Что входит, чем удобен, какой стиль и для какого случая…' : lang === 'kg' ? 'Комплекттин өзгөчөлүгүн, пайдасын жана стилин түшүнүктүү сүрөттөңүз…' : 'Describe the set, its feel, use and style in natural English…'}/></label>
      <label><span>Шов / отделка · {langLabels[lang]}</span><input value={form[`seam_${lang}`] || ''} onChange={(e) => change(`seam_${lang}`, e.target.value)} placeholder={lang === 'ru' ? 'Декоративный машинный шов' : ''}/></label>
      <label><span>Материал · {langLabels[lang]}</span><input value={form[`material_${lang}`] || ''} onChange={(e) => change(`material_${lang}`, e.target.value)} placeholder={lang === 'ru' ? 'Хлопок, велюр, атлас…' : ''}/></label>
    </div>
  </>
}

function PendingFilePreview({ file, index, total, onMove, onRemove }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <div className="upload-preview is-new">
    {src ? <img src={src} alt=""/> : <ImagePlus/>}
    <div className="upload-preview__actions">
      <button type="button" onClick={() => onMove(index,-1)} disabled={index===0} title="Сдвинуть влево"><ArrowLeft/></button>
      <button type="button" onClick={() => onMove(index,1)} disabled={index===total-1} title="Сдвинуть вправо"><ArrowRight/></button>
      <button type="button" onClick={() => onRemove(index)} title="Убрать из загрузки"><Trash2/></button>
    </div>
    <span>{file.name}</span>
  </div>
}

export default function ProductForm() {
  const { id } = useParams()
  const edit = Boolean(id)
  const [form, setForm] = useState(initial)
  const [categories, setCategories] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(edit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    listCategories({ admin:true }).then(setCategories).catch(() => {})
    if (edit) {
      getAdminProduct(id)
        .then((product) => {
          if (!product) throw new Error('Товар не найден.')
          setForm({ ...initial, ...product, seam_ru:product.seam_ru || product.seam || '', material_ru:product.material_ru || product.material || '', colors:product.colors || [], sizes:product.sizes || [], images:product.images || [] })
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [id, edit])

  const change = (key, value) => setForm((current) => {
    const next = { ...current, [key]:value }
    if (key === 'name_ru' && !edit && (!current.slug || current.slug === slugify(current.name_ru))) next.slug = slugify(value)
    return next
  })

  const margin = useMemo(() => {
    if (form.cost_price === '' || form.sale_price === '') return null
    return Number(form.sale_price || 0) - Number(form.cost_price || 0)
  }, [form.cost_price, form.sale_price])

  const marginPct = useMemo(() => {
    if (margin == null || !Number(form.sale_price)) return null
    return Math.round((margin / Number(form.sale_price)) * 100)
  }, [margin, form.sale_price])

  const discount = useMemo(() => {
    const oldPrice = Number(form.old_price || 0)
    const salePrice = Number(form.sale_price || 0)
    if (!form.is_on_sale || !oldPrice || !salePrice || salePrice >= oldPrice) return 0
    return Math.round(((oldPrice - salePrice) / oldPrice) * 100)
  }, [form.is_on_sale, form.old_price, form.sale_price])

  const removeImage = async (image) => {
    if (!window.confirm('Удалить эту фотографию?')) return
    try {
      await deleteProductImage(image)
      const nextImages = (form.images || []).filter((item) => item.id !== image.id)
      change('images', nextImages)
      if (nextImages.length) await updateProductImageOrder(nextImages)
    } catch (err) { setError(err.message) }
  }

  const moveImage = async (index, direction) => {
    const next = [...(form.images || [])]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    change('images', next)
    try { await updateProductImageOrder(next) } catch (err) { setError(err.message) }
  }

  const movePendingFile = (index, direction) => {
    setFiles((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removePendingFile = (index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const appendFiles = (selected) => {
    const picked = Array.from(selected || [])
    const supported = picked.filter((file) => ['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= MAX_IMAGE_BYTES)
    const rejected = picked.length - supported.length
    const freeSlots = Math.max(0, MAX_PRODUCT_IMAGES - (form.images || []).length - files.length)
    const incoming = supported.slice(0, freeSlots)

    if (rejected > 0) setError('Часть файлов пропущена: используйте JPG, PNG или WEBP до 10 МБ.')
    else if (supported.length > freeSlots) setError(`Для одного товара можно сохранить до ${MAX_PRODUCT_IMAGES} фотографий.`)
    else setError('')

    if (incoming.length) setFiles((current) => [...current, ...incoming])
  }

  const validate = () => {
    if (!form.name_ru.trim()) return 'Укажите название товара на русском языке.'
    if (!form.slug.trim()) return 'Укажите slug товара.'
    if (form.status === 'published' && !form.price_on_request && (form.sale_price === '' || Number(form.sale_price) < 0)) return 'Для публикации укажите цену продажи или включите «Цена по запросу».'
    if (form.is_on_sale) {
      if (!form.old_price || !form.sale_price) return 'Для акции укажите старую и текущую цену.'
      if (Number(form.old_price) <= Number(form.sale_price)) return 'Старая цена должна быть выше цены продажи.'
      if (form.promo_start_at && form.promo_end_at && new Date(form.promo_start_at) > new Date(form.promo_end_at)) return 'Дата окончания акции должна быть позже даты начала.'
    }
    return ''
  }

  const submit = async (event) => {
    event.preventDefault()
    const validation = validate()
    if (validation) return setError(validation)
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const prepared = { ...form, slug:form.slug || slugify(form.name_ru) }
      const saved = await saveProduct(prepared)
      if (files.length) await saveProductImages(saved.id, files, (form.images || []).length)
      setSuccess('Товар сохранён.')
      if (!edit) navigate(`/admin/products/${saved.id}`, { replace:true })
      else {
        const refreshed = await getAdminProduct(saved.id)
        setForm({ ...initial, ...refreshed, seam_ru:refreshed.seam_ru || refreshed.seam || '', material_ru:refreshed.material_ru || refreshed.material || '', colors:refreshed.colors || [], sizes:refreshed.sizes || [], images:refreshed.images || [] })
        setFiles([])
      }
    } catch (err) {
      setError(err.message || 'Не удалось сохранить товар.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-loading"><span/><p>Загружаем карточку товара…</p></div>

  return (
    <>
      <AdminPageHeader eyebrow={edit ? 'Редактирование' : 'Новый товар'} title={edit ? form.name_ru || 'Товар' : 'Добавить товар'} text="Все данные каталога, цены, скидки и характеристики управляются отсюда." actions={<Link className="btn btn--ghost" to="/admin/products"><ArrowLeft size={18}/> Назад</Link>}/>

      <form className="product-editor" onSubmit={submit}>
        <div className="product-editor__main">
          <section className="admin-panel form-section">
            <div className="form-section__head"><div><span>01</span><h2>Название и описание</h2></div><small>Три языка клиентской стороны</small></div>
            <LocalizedTextFields form={form} change={change}/>
            <div className="form-grid form-grid--after-tabs">
              <label><span>Категория</span><select value={form.category_id || ''} onChange={(e)=>change('category_id',e.target.value)}><option value="">Без категории</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_ru}</option>)}</select></label>
              <label><span>Артикул</span><input value={form.sku || ''} onChange={(e)=>change('sku',e.target.value)} placeholder="SO-001"/></label>
              <label><span>URL / slug *</span><input value={form.slug || ''} onChange={(e)=>change('slug',slugify(e.target.value))} required placeholder="toshok-nezhnyy-rassvet"/></label>
              <label><span>Статус</span><select value={form.status} onChange={(e)=>change('status',e.target.value)}><option value="draft">Черновик</option><option value="published">Опубликовано</option><option value="hidden">Скрыто</option></select></label>
            </div>
          </section>

          <section className="admin-panel form-section">
            <div className="form-section__head"><div><span>02</span><h2>Цена, себестоимость и скидка</h2></div><small>Себестоимость скрыта от покупателя</small></div>
            <div className="price-editor-grid">
              <label><span>Себестоимость</span><div className="money-input"><input type="number" min="0" step="1" value={form.cost_price ?? ''} onChange={(e)=>change('cost_price',e.target.value)} placeholder="4500"/><b>сом</b></div><small>Только для команды</small></label>
              <label><span>Цена продажи</span><div className="money-input"><input type="number" min="0" step="1" value={form.sale_price ?? ''} onChange={(e)=>change('sale_price',e.target.value)} placeholder="7000"/><b>сом</b></div></label>
              <label><span>Старая цена</span><div className="money-input"><input type="number" min="0" step="1" value={form.old_price ?? ''} onChange={(e)=>change('old_price',e.target.value)} placeholder="8000"/><b>сом</b></div><small>Нужна для отображения скидки</small></label>
              <div className={`margin-card ${margin != null && margin < 0 ? 'is-negative' : ''}`}><span>Маржа с единицы</span><strong>{margin == null ? '—' : money(margin)}</strong><small>{marginPct == null ? 'Заполните себестоимость и продажу' : `${marginPct}% от цены продажи`}</small></div>
            </div>
            <div className="toggle-grid toggle-grid--pricing">
              <label className="toggle-row"><input type="checkbox" checked={form.price_on_request} onChange={(e)=>change('price_on_request',e.target.checked)}/><span><strong>Цена по запросу</strong><small>Клиент увидит «Уточнить стоимость».</small></span></label>
              <label className="toggle-row"><input type="checkbox" checked={form.is_on_sale} onChange={(e)=>change('is_on_sale',e.target.checked)}/><span><strong>Акция / скидка</strong><small>Покажем старую цену и процент скидки.</small></span></label>
            </div>
            {form.is_on_sale && <div className="sale-editor">
              <div className="sale-editor__badge"><Percent/><strong>{discount ? `-${discount}%` : 'Акция'}</strong><span>видит покупатель</span></div>
              <div className="form-grid">
                <label><span>Подпись RU</span><input value={form.promo_label_ru || ''} onChange={(e)=>change('promo_label_ru',e.target.value)} placeholder="Акция недели"/></label>
                <label><span>Подпись KG</span><input value={form.promo_label_kg || ''} onChange={(e)=>change('promo_label_kg',e.target.value)} placeholder="Апта акциясы"/></label>
                <label><span>Подпись EN</span><input value={form.promo_label_en || ''} onChange={(e)=>change('promo_label_en',e.target.value)} placeholder="Special offer"/></label>
                <label><span>Начало</span><input type="datetime-local" value={form.promo_start_at ? String(form.promo_start_at).slice(0,16) : ''} onChange={(e)=>change('promo_start_at',e.target.value)}/></label>
                <label><span>Окончание</span><input type="datetime-local" value={form.promo_end_at ? String(form.promo_end_at).slice(0,16) : ''} onChange={(e)=>change('promo_end_at',e.target.value)}/></label>
              </div>
            </div>}
          </section>

          <section className="admin-panel form-section">
            <div className="form-section__head"><div><span>03</span><h2>Характеристики</h2></div><small>Размеры, остаток и параметры продажи</small></div>
            <div className="form-grid">
              <label><span>Цвета</span><TagsInput value={form.colors} onChange={(value)=>change('colors',value)} placeholder="Введите цвет и Enter"/></label>
              <label><span>Размеры</span><TagsInput value={form.sizes} onChange={(value)=>change('sizes',value)} placeholder="Например: 70×180"/></label>
              <label><span>Остаток, шт.</span><input type="number" min="0" value={form.stock_qty} onChange={(e)=>change('stock_qty',e.target.value)}/><small>0 = под заказ / нет готового остатка</small></label>
              <label><span>Срок изготовления, дней</span><input type="number" min="0" value={form.production_days ?? ''} onChange={(e)=>change('production_days',e.target.value)} placeholder="5"/></label>
              <label><span>Порядок в каталоге</span><input type="number" value={form.sort_order || 0} onChange={(e)=>change('sort_order',e.target.value)}/></label>
            </div>
            <div className="toggle-grid">
              <label className="toggle-row"><input type="checkbox" checked={form.is_featured} onChange={(e)=>change('is_featured',e.target.checked)}/><span><strong>Популярное</strong><small>Показывать выше</small></span></label>
              <label className="toggle-row"><input type="checkbox" checked={form.is_new} onChange={(e)=>change('is_new',e.target.checked)}/><span><strong>Новинка</strong><small>Отметить как новый товар</small></span></label>
              <label className="toggle-row"><input type="checkbox" checked={form.is_set} onChange={(e)=>change('is_set',e.target.checked)}/><span><strong>Комплект</strong><small>Готовый набор изделий</small></span></label>
            </div>
          </section>

          <section className="admin-panel form-section">
            <div className="form-section__head"><div><span>04</span><h2>Фотографии</h2></div><small>Первое фото — главное</small></div>
            <label className="upload-dropzone">
              <UploadCloud/>
              <strong>Добавить фотографии</strong>
              <span>JPG, PNG или WEBP до 10 МБ. Можно выбрать сразу несколько файлов, максимум 20 на товар.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e)=>{ appendFiles(e.target.files); e.target.value = '' }}/>
            </label>
            {(form.images?.length > 0 || files.length > 0) && <div className="upload-preview-grid">
              {(form.images || []).map((image,index) => <div className="upload-preview" key={image.id || image.public_url || index}>
                {image.public_url ? <img src={image.public_url} alt=""/> : <ImagePlus/>}
                <div className="upload-preview__actions">
                  <button type="button" onClick={()=>moveImage(index,-1)} disabled={index===0} title="Сдвинуть влево"><ArrowLeft/></button>
                  <button type="button" onClick={()=>moveImage(index,1)} disabled={index===(form.images||[]).length-1} title="Сдвинуть вправо"><ArrowRight/></button>
                  <button type="button" onClick={()=>removeImage(image)} title="Удалить"><Trash2/></button>
                </div>
                <span>{index === 0 ? 'Главное фото' : 'Сохранено'}</span>
              </div>)}
              {files.map((file,index) => <PendingFilePreview file={file} index={index} total={files.length} onMove={movePendingFile} onRemove={removePendingFile} key={`${file.name}-${file.size}-${file.lastModified}-${index}`}/>) }
            </div>}
            {!supabaseConfigured && <div className="notice notice--error">Storage станет доступен после подключения Supabase.</div>}
          </section>
        </div>

        <aside className="product-editor__side">
          <section className="admin-panel product-editor__sticky">
            <span className="eyebrow">Перед публикацией</span>
            <h3>{form.name_ru || 'Новый товар'}</h3>
            <div className="editor-checks">
              <span className={form.name_ru ? 'ok' : ''}><Check/> Название RU</span>
              <span className={form.slug ? 'ok' : ''}><Check/> URL</span>
              <span className={form.sale_price || form.price_on_request ? 'ok' : ''}><Check/> Цена</span>
              <span className={form.category_id ? 'ok' : ''}><Check/> Категория</span>
              <span className={form.seam_ru || form.seam ? 'ok' : ''}><Check/> Шов / отделка</span>
            </div>
            <div className="editor-price-preview"><small>Покупатель увидит</small><strong>{form.price_on_request ? 'Уточнить стоимость' : form.sale_price ? money(form.sale_price) : 'Цена не указана'}</strong>{form.is_on_sale && discount > 0 && <span className="editor-discount">-{discount}%</span>}</div>
            <div className="editor-private-note"><Sparkles/><span><strong>Себестоимость защищена.</strong><small>В публичный каталог она не передаётся.</small></span></div>
            {error && <div className="notice notice--error">{error}</div>}
            {success && <div className="notice notice--success">{success}</div>}
            <button className="btn btn--primary btn--block" disabled={saving}><Save size={18}/>{saving ? 'Сохраняем…' : 'Сохранить товар'}</button>
            <Link className="btn btn--ghost btn--block" to="/admin/products">Отменить</Link>
          </section>
        </aside>
      </form>
    </>
  )
}
