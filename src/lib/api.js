import { supabase, supabaseConfigured } from './supabase'

const createId = () => typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const normalizeProduct = (row) => {
  if (!row) return row
  const images = row.images || row.product_images || []
  const category = row.category || row.categories || (row.category_id ? {
    id: row.category_id,
    slug: row.category_slug,
    name_ru: row.category_name_ru,
    name_kg: row.category_name_kg,
    name_en: row.category_name_en,
  } : null)
  return { ...row, images, category }
}

const normalizeAdminRpc = (data) => {
  if (!data) return []
  const rows = Array.isArray(data) ? data : [data]
  return rows.map(normalizeProduct)
}

export async function listProducts({ includeDrafts = false } = {}) {
  if (!supabaseConfigured) return []

  if (includeDrafts) {
    const { data, error } = await supabase.rpc('admin_list_products')
    if (error) throw error
    return normalizeAdminRpc(data)
  }

  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalizeProduct)
}

export async function getProduct(slug) {
  if (!supabaseConfigured) return null
  const { data, error } = await supabase.from('catalog_products').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return normalizeProduct(data)
}

export async function getAdminProduct(id) {
  if (!supabaseConfigured) return null
  const { data, error } = await supabase.rpc('admin_get_product', { p_id: id })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  const { data: images, error: imageError } = await supabase
    .from('product_images').select('*').eq('product_id', id).order('sort_order')
  if (imageError) throw imageError
  return normalizeProduct({ ...row, images: images || [] })
}

export async function listCategories({ admin = false } = {}) {
  if (!supabaseConfigured) return []
  let query = supabase.from('categories').select('*').order('sort_order').order('created_at')
  if (!admin) query = query.eq('is_visible', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createOrder(payload) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён. Добавьте VITE_SALT_SUPABASE_URL и VITE_SALT_SUPABASE_PUBLISHABLE_KEY.')
  const { data, error } = await supabase.rpc('create_public_order', {
    p_customer_name: payload.customerName,
    p_phone: payload.phone,
    p_city: payload.city || null,
    p_delivery_method: payload.deliveryMethod || 'manager',
    p_note: payload.note || null,
    p_language: payload.language || 'ru',
    p_items: payload.items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function saveProduct(product) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const numberOrNull = (value) => value === '' || value == null ? null : Number(value)
  const textOrNull = (value) => String(value || '').trim() || null
  const payload = {
    id: product.id || null,
    slug: product.slug,
    category_id: product.category_id || null,
    sku: textOrNull(product.sku),
    name_ru: product.name_ru,
    name_kg: textOrNull(product.name_kg),
    name_en: textOrNull(product.name_en),
    description_ru: textOrNull(product.description_ru),
    description_kg: textOrNull(product.description_kg),
    description_en: textOrNull(product.description_en),
    seam_ru: textOrNull(product.seam_ru || product.seam),
    seam_kg: textOrNull(product.seam_kg),
    seam_en: textOrNull(product.seam_en),
    material_ru: textOrNull(product.material_ru || product.material),
    material_kg: textOrNull(product.material_kg),
    material_en: textOrNull(product.material_en),
    cost_price: numberOrNull(product.cost_price),
    sale_price: numberOrNull(product.sale_price),
    old_price: numberOrNull(product.old_price),
    price_on_request: Boolean(product.price_on_request),
    seam: textOrNull(product.seam_ru || product.seam),
    material: textOrNull(product.material_ru || product.material),
    colors: product.colors || [],
    sizes: product.sizes || [],
    stock_qty: Math.max(0, Number(product.stock_qty || 0)),
    production_days: numberOrNull(product.production_days),
    status: product.status || 'draft',
    is_featured: Boolean(product.is_featured),
    is_new: Boolean(product.is_new),
    is_set: Boolean(product.is_set),
    is_on_sale: Boolean(product.is_on_sale),
    promo_label_ru: textOrNull(product.promo_label_ru),
    promo_label_kg: textOrNull(product.promo_label_kg),
    promo_label_en: textOrNull(product.promo_label_en),
    promo_start_at: product.promo_start_at ? new Date(product.promo_start_at).toISOString() : null,
    promo_end_at: product.promo_end_at ? new Date(product.promo_end_at).toISOString() : null,
    sort_order: Number(product.sort_order || 0),
  }
  const save = (nextPayload) => supabase.rpc('admin_upsert_product', { p_payload: nextPayload })
  let { data, error } = await save(payload)

  if (error?.code === '23505' && !product.id && /products_slug_key|slug/i.test(error.message || '')) {
    const suffix = createId().replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase()
    payload.slug = `${payload.slug}-${suffix}`
    ;({ data, error } = await save(payload))
  }

  if (error) {
    if (error.code === '23505' && /products_sku_key|sku/i.test(error.message || '')) throw new Error('Такой артикул уже используется. Оставьте поле пустым или укажите другой артикул.')
    if (error.code === '42501' || /forbidden/i.test(error.message || '')) throw new Error('Сессия владельца истекла или недостаточно прав. Войдите в админку заново.')
    throw new Error(error.message || 'Не удалось сохранить товар в Supabase.')
  }

  const saved = Array.isArray(data) ? data[0] : data
  if (!saved?.id) throw new Error('Supabase не вернул сохранённый товар. Повторите попытку.')
  return saved
}

export async function deleteProduct(id) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { error } = await supabase.rpc('admin_delete_product', { p_id: id })
  if (error) throw error
}

export async function saveProductImages(productId, files, startOrder = 0) {
  if (!supabaseConfigured || !files?.length) return []
  const rows = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${productId}/${createId()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '31536000', upsert: false })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
    rows.push({ product_id: productId, path, public_url: urlData.publicUrl, alt_text: '', sort_order: Number(startOrder || 0) + i })
  }
  const { data, error } = await supabase.from('product_images').insert(rows).select()
  if (error) throw error
  return data || []
}

export async function deleteProductImage(image) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
  if (image?.path) {
    const { error: storageError } = await supabase.storage.from('product-images').remove([image.path])
    if (storageError) console.warn('Не удалось удалить файл из Storage:', storageError.message)
  }
}

export async function updateProductImageOrder(images) {
  if (!supabaseConfigured) return
  const results = await Promise.all(images.map((image, index) =>
    supabase.from('product_images').update({ sort_order: index }).eq('id', image.id)
  ))
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

export async function listStaff() {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase.from('staff').select('*').order('created_at')
  if (error) throw error
  return data || []
}

export async function updateStaff(id, patch) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.from('staff').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function createStaffAccount({ email, fullName, password, role }) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: { email, fullName, password, role },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function createCategory(category) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.from('categories').insert({
    slug: category.slug,
    name_ru: category.name_ru,
    name_kg: category.name_kg || null,
    name_en: category.name_en || null,
    is_visible: true,
    sort_order: Number(category.sort_order || 0),
  }).select().single()
  if (error) throw error
  return data
}

export async function updateCategory(id, patch) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function getSiteSettings() {
  if (!supabaseConfigured) return {}
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle()
  if (error) throw error
  return data || {}
}

export async function saveSiteSettings(settings) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const payload = { ...settings, id: true, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('site_settings').upsert(payload).select().single()
  if (error) throw error
  return data
}

export async function getChatbotSettings() {
  if (!supabaseConfigured) return {}
  const { data, error } = await supabase.from('chatbot_settings').select('*').eq('id', true).maybeSingle()
  if (error) throw error
  return data || {}
}

export async function saveChatbotSettings(settings) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const payload = { ...settings, id: true, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('chatbot_settings').update(payload).eq('id', true).select().single()
  if (error) throw error
  return data
}

export async function listChatbotFaqs({ admin = false } = {}) {
  if (!supabaseConfigured) return []
  let query = supabase.from('chatbot_faqs').select('*').order('sort_order').order('created_at')
  if (!admin) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function saveChatbotFaq(faq) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const keywordArray = Array.isArray(faq.keywords)
    ? faq.keywords.map((value)=>String(value).trim()).filter(Boolean)
    : String(faq.keywords || '').split(',').map((value)=>value.trim()).filter(Boolean)
  const payload = {
    question_ru: String(faq.question_ru || '').trim(),
    question_kg: String(faq.question_kg || '').trim() || null,
    question_en: String(faq.question_en || '').trim() || null,
    answer_ru: String(faq.answer_ru || '').trim(),
    answer_kg: String(faq.answer_kg || '').trim() || null,
    answer_en: String(faq.answer_en || '').trim() || null,
    keywords: keywordArray,
    is_active: faq.is_active !== false,
    sort_order: Number(faq.sort_order || 0),
    updated_at: new Date().toISOString(),
  }
  if (faq.id) {
    const { data, error } = await supabase.from('chatbot_faqs').update(payload).eq('id', faq.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('chatbot_faqs').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteChatbotFaq(id) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { error } = await supabase.from('chatbot_faqs').delete().eq('id', id)
  if (error) throw error
}

export async function startQuiz({ visitorId, sessionId, language }) {
  if (!supabaseConfigured) return createId()
  const { data, error } = await supabase.rpc('start_public_quiz', {
    p_visitor_id: visitorId,
    p_session_id: sessionId,
    p_language: language || 'ru',
  })
  if (error) throw error
  return data
}

export async function saveQuizAnswer({ quizSessionId, visitorId, sessionId, questionKey, answer }) {
  if (!supabaseConfigured) return
  const { error } = await supabase.rpc('save_public_quiz_answer', {
    p_quiz_session_id: quizSessionId,
    p_visitor_id: visitorId,
    p_session_id: sessionId,
    p_question_key: questionKey,
    p_answer: answer,
  })
  if (error) throw error
}

export async function completeQuiz({ quizSessionId, visitorId, sessionId, categorySlugs }) {
  if (!supabaseConfigured) return
  const { error } = await supabase.rpc('complete_public_quiz', {
    p_quiz_session_id: quizSessionId,
    p_visitor_id: visitorId,
    p_session_id: sessionId,
    p_category_slugs: categorySlugs || [],
  })
  if (error) throw error
}

export async function dismissQuiz({ quizSessionId, visitorId, sessionId }) {
  if (!supabaseConfigured || !quizSessionId) return
  const { error } = await supabase.rpc('dismiss_public_quiz', {
    p_quiz_session_id: quizSessionId,
    p_visitor_id: visitorId,
    p_session_id: sessionId,
  })
  if (error) throw error
}

export async function trackPublicEvent({
  visitorId, sessionId, eventType, path = null, productId = null,
  categorySlug = null, metadata = {},
}) {
  if (!supabaseConfigured) return
  const { error } = await supabase.rpc('track_public_event', {
    p_visitor_id: visitorId,
    p_session_id: sessionId,
    p_event_type: eventType,
    p_path: path,
    p_product_id: productId,
    p_category_slug: categorySlug,
    p_metadata: metadata,
  })
  if (error) throw error
}

export async function createLead({
  source = 'contact', customerName, phone, email = null, message = null,
  productId = null, quizSessionId = null, visitorId = null, sessionId = null,
}) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.rpc('create_public_lead', {
    p_source: source,
    p_customer_name: customerName,
    p_phone: phone,
    p_email: email || null,
    p_message: message || null,
    p_product_id: productId || null,
    p_quiz_session_id: quizSessionId || null,
    p_visitor_id: visitorId || null,
    p_session_id: sessionId || null,
  })
  if (error) throw error
  return data
}

export async function listLeads() {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase
    .from('leads')
    .select('*, products(slug, name_ru)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return data || []
}

export async function updateLead(id, patch) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getAnalyticsData() {
  if (!supabaseConfigured) return { events: [], quizzes: [], leads: [] }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const [eventsResult, quizzesResult, leadsResult] = await Promise.all([
    supabase.from('analytics_events').select('event_type, visitor_id, product_id, category_slug, metadata, created_at, products(name_ru, slug)').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
    supabase.from('quiz_sessions').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
    supabase.from('leads').select('id, source, status, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
  ])
  const failed = [eventsResult, quizzesResult, leadsResult].find((result) => result.error)
  if (failed?.error) throw failed.error
  return {
    events: eventsResult.data || [],
    quizzes: quizzesResult.data || [],
    leads: leadsResult.data || [],
  }
}
