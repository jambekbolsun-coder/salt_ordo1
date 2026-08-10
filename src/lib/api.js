import { supabase, supabaseConfigured } from './supabase'

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
  if (!supabaseConfigured) throw new Error('Supabase не подключён. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.')
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

export async function listOrders() {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(id,quantity,unit_price,line_total,product_name,product_id)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data || []
}

export async function updateOrder(id, patch) {
  if (!supabaseConfigured) throw new Error('Supabase не подключён.')
  const { data, error } = await supabase.from('orders').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateOrderStatus(id, status) {
  return updateOrder(id, { status })
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
  const { data, error } = await supabase.rpc('admin_upsert_product', { p_payload: payload })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
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
    const path = `${productId}/${crypto.randomUUID()}.${ext}`
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

export async function listCustomers() {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase.from('customers').select('*').order('last_order_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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
