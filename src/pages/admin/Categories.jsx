import { useEffect, useState } from 'react'
import { Eye, EyeOff, GripVertical, Plus, Save, Trash2 } from 'lucide-react'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../lib/api'
import { slugify } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'

const blank = { name_ru:'', name_kg:'', name_en:'', slug:'', sort_order:0 }

export default function Categories() {
  const [items,setItems] = useState([])
  const [draft,setDraft] = useState(blank)
  const [error,setError] = useState('')
  const load = () => listCategories({ admin:true }).then(setItems).catch((err)=>setError(err.message))
  useEffect(() => { load() }, [])

  const add = async (event) => {
    event.preventDefault(); setError('')
    try {
      await createCategory({ ...draft, slug:draft.slug || slugify(draft.name_ru) })
      setDraft(blank)
      await load()
    } catch (err) { setError(err.message) }
  }

  const setLocal = (id, key, value) => setItems((current)=>current.map((item)=>item.id === id ? { ...item,[key]:value } : item))
  const patch = async (id, patchValue) => {
    setLocal(id, Object.keys(patchValue)[0], Object.values(patchValue)[0])
    try { await updateCategory(id, patchValue) } catch (err) { setError(err.message); await load() }
  }
  const saveNames = async (item) => {
    setError('')
    try {
      await updateCategory(item.id, {
        name_ru:item.name_ru.trim(), name_kg:item.name_kg?.trim() || null, name_en:item.name_en?.trim() || null,
        slug:item.slug || slugify(item.name_ru),
      })
      await load()
    } catch (err) { setError(err.message) }
  }
  const remove = async (item) => {
    if (!window.confirm(`Удалить категорию «${item.name_ru}»?`)) return
    try { await deleteCategory(item.id); await load() } catch (err) { setError(err.message) }
  }

  return <>
    <AdminPageHeader eyebrow="Каталог" title="Категории" text="Название каждой категории можно заполнить на русском, кыргызском и английском языках."/>
    <section className="admin-panel category-create">
      <form onSubmit={add}>
        <label><span>Название RU *</span><input value={draft.name_ru} onChange={(e)=>setDraft({ ...draft,name_ru:e.target.value,slug:draft.slug || slugify(e.target.value) })} required/></label>
        <label><span>Название KG</span><input value={draft.name_kg} onChange={(e)=>setDraft({ ...draft,name_kg:e.target.value })}/></label>
        <label><span>Название EN</span><input value={draft.name_en} onChange={(e)=>setDraft({ ...draft,name_en:e.target.value })}/></label>
        <label><span>Slug</span><input value={draft.slug} onChange={(e)=>setDraft({ ...draft,slug:slugify(e.target.value) })} required/></label>
        <button className="btn btn--primary"><Plus/> Добавить</button>
      </form>
    </section>
    {error && <div className="notice notice--error">{error}</div>}
    <section className="admin-panel category-admin-list">
      {items.map((item) => <div className="category-admin-row" key={item.id}>
        <GripVertical className="drag-handle"/>
        <input type="number" value={item.sort_order || 0} onChange={(e)=>patch(item.id,{ sort_order:Number(e.target.value) })} aria-label="Порядок"/>
        <div className="category-admin-row__names">
          <input aria-label="Название RU" value={item.name_ru || ''} onChange={(e)=>setLocal(item.id,'name_ru',e.target.value)} placeholder="RU"/>
          <input aria-label="Название KG" value={item.name_kg || ''} onChange={(e)=>setLocal(item.id,'name_kg',e.target.value)} placeholder="KG"/>
          <input aria-label="Название EN" value={item.name_en || ''} onChange={(e)=>setLocal(item.id,'name_en',e.target.value)} placeholder="EN"/>
        </div>
        <button className="icon-btn" type="button" onClick={()=>patch(item.id,{ is_visible:!item.is_visible })} title={item.is_visible ? 'Скрыть' : 'Показать'}>{item.is_visible ? <Eye/> : <EyeOff/>}</button>
        <button className="icon-btn" type="button" onClick={()=>saveNames({ ...item,slug:item.slug || slugify(item.name_ru) })} title="Сохранить названия"><Save/></button>
        <button className="icon-btn danger-btn" type="button" onClick={()=>remove(item)} title="Удалить"><Trash2/></button>
      </div>)}
      {items.length === 0 && <div className="empty-cell">Категорий пока нет.</div>}
    </section>
  </>
}
