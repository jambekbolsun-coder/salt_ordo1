-- Localized product details + safer multilingual catalog.
-- Existing RU seam/material stay as legacy fallbacks.

alter table public.products add column if not exists seam_ru text;
alter table public.products add column if not exists seam_kg text;
alter table public.products add column if not exists seam_en text;
alter table public.products add column if not exists material_ru text;
alter table public.products add column if not exists material_kg text;
alter table public.products add column if not exists material_en text;

update public.products
set
  seam_ru = coalesce(seam_ru, seam),
  material_ru = coalesce(material_ru, material)
where seam_ru is null or material_ru is null;

create or replace view public.catalog_products
with (security_barrier = true)
as
select
  p.id,
  p.category_id,
  p.slug,
  p.sku,
  p.name_ru,
  p.name_kg,
  p.name_en,
  p.description_ru,
  p.description_kg,
  p.description_en,
  p.sale_price,
  p.old_price,
  p.price_on_request,
  p.seam,
  p.material,
  p.colors,
  p.sizes,
  p.stock_qty,
  p.production_days,
  p.is_featured,
  p.is_new,
  p.is_set,
  p.is_on_sale,
  p.promo_label_ru,
  p.promo_label_kg,
  p.promo_label_en,
  p.promo_start_at,
  p.promo_end_at,
  p.sort_order,
  p.created_at,
  jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name_ru', c.name_ru,
    'name_kg', c.name_kg,
    'name_en', c.name_en
  ) as category,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', pi.id,
        'public_url', pi.public_url,
        'alt_text', pi.alt_text,
        'sort_order', pi.sort_order
      ) order by pi.sort_order, pi.created_at
    )
    from public.product_images pi
    where pi.product_id = p.id
  ), '[]'::jsonb) as images,
  p.seam_ru,
  p.seam_kg,
  p.seam_en,
  p.material_ru,
  p.material_kg,
  p.material_en
from public.products p
left join public.categories c on c.id = p.category_id
where p.status = 'published'
  and (c.id is null or c.is_visible = true);

create or replace function public.admin_upsert_product(p_payload jsonb)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_colors text[];
  v_sizes text[];
  v_seam_ru text;
  v_material_ru text;
begin
  if not public.can_manage_catalog() then raise exception 'Forbidden'; end if;
  v_id := nullif(p_payload->>'id','')::uuid;
  v_colors := coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'colors','[]'::jsonb))), '{}'::text[]);
  v_sizes := coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'sizes','[]'::jsonb))), '{}'::text[]);
  v_seam_ru := coalesce(nullif(btrim(p_payload->>'seam_ru'),''), nullif(btrim(p_payload->>'seam'),''));
  v_material_ru := coalesce(nullif(btrim(p_payload->>'material_ru'),''), nullif(btrim(p_payload->>'material'),''));

  if nullif(btrim(p_payload->>'name_ru'),'') is null then raise exception 'Название RU обязательно'; end if;
  if nullif(btrim(p_payload->>'slug'),'') is null then raise exception 'URL товара обязателен'; end if;

  if v_id is null then
    insert into public.products(
      category_id,slug,sku,name_ru,name_kg,name_en,description_ru,description_kg,description_en,
      cost_price,sale_price,old_price,price_on_request,seam,material,seam_ru,seam_kg,seam_en,material_ru,material_kg,material_en,
      colors,sizes,stock_qty,production_days,status,is_featured,is_new,is_set,is_on_sale,
      promo_label_ru,promo_label_kg,promo_label_en,promo_start_at,promo_end_at,sort_order
    ) values (
      nullif(p_payload->>'category_id','')::uuid,
      btrim(p_payload->>'slug'), nullif(btrim(p_payload->>'sku'),''), btrim(p_payload->>'name_ru'),
      nullif(btrim(p_payload->>'name_kg'),''), nullif(btrim(p_payload->>'name_en'),''),
      nullif(btrim(p_payload->>'description_ru'),''), nullif(btrim(p_payload->>'description_kg'),''), nullif(btrim(p_payload->>'description_en'),''),
      nullif(p_payload->>'cost_price','')::numeric, nullif(p_payload->>'sale_price','')::numeric, nullif(p_payload->>'old_price','')::numeric,
      coalesce((p_payload->>'price_on_request')::boolean,false), v_seam_ru, v_material_ru,
      v_seam_ru, nullif(btrim(p_payload->>'seam_kg'),''), nullif(btrim(p_payload->>'seam_en'),''),
      v_material_ru, nullif(btrim(p_payload->>'material_kg'),''), nullif(btrim(p_payload->>'material_en'),''),
      v_colors, v_sizes, greatest(0,coalesce((p_payload->>'stock_qty')::integer,0)), nullif(p_payload->>'production_days','')::integer,
      coalesce(nullif(p_payload->>'status','')::public.product_status,'draft'),
      coalesce((p_payload->>'is_featured')::boolean,false), coalesce((p_payload->>'is_new')::boolean,false), coalesce((p_payload->>'is_set')::boolean,false),
      coalesce((p_payload->>'is_on_sale')::boolean,false), nullif(btrim(p_payload->>'promo_label_ru'),''), nullif(btrim(p_payload->>'promo_label_kg'),''), nullif(btrim(p_payload->>'promo_label_en'),''),
      nullif(p_payload->>'promo_start_at','')::timestamptz, nullif(p_payload->>'promo_end_at','')::timestamptz, coalesce((p_payload->>'sort_order')::integer,0)
    ) returning id into v_id;
  else
    update public.products set
      category_id = nullif(p_payload->>'category_id','')::uuid,
      slug = btrim(p_payload->>'slug'), sku = nullif(btrim(p_payload->>'sku'),''), name_ru = btrim(p_payload->>'name_ru'),
      name_kg = nullif(btrim(p_payload->>'name_kg'),''), name_en = nullif(btrim(p_payload->>'name_en'),''),
      description_ru = nullif(btrim(p_payload->>'description_ru'),''), description_kg = nullif(btrim(p_payload->>'description_kg'),''), description_en = nullif(btrim(p_payload->>'description_en'),''),
      cost_price = nullif(p_payload->>'cost_price','')::numeric, sale_price = nullif(p_payload->>'sale_price','')::numeric, old_price = nullif(p_payload->>'old_price','')::numeric,
      price_on_request = coalesce((p_payload->>'price_on_request')::boolean,false),
      seam = v_seam_ru, material = v_material_ru,
      seam_ru = v_seam_ru, seam_kg = nullif(btrim(p_payload->>'seam_kg'),''), seam_en = nullif(btrim(p_payload->>'seam_en'),''),
      material_ru = v_material_ru, material_kg = nullif(btrim(p_payload->>'material_kg'),''), material_en = nullif(btrim(p_payload->>'material_en'),''),
      colors = v_colors, sizes = v_sizes, stock_qty = greatest(0,coalesce((p_payload->>'stock_qty')::integer,0)), production_days = nullif(p_payload->>'production_days','')::integer,
      status = coalesce(nullif(p_payload->>'status','')::public.product_status,'draft'),
      is_featured = coalesce((p_payload->>'is_featured')::boolean,false), is_new = coalesce((p_payload->>'is_new')::boolean,false), is_set = coalesce((p_payload->>'is_set')::boolean,false),
      is_on_sale = coalesce((p_payload->>'is_on_sale')::boolean,false), promo_label_ru = nullif(btrim(p_payload->>'promo_label_ru'),''), promo_label_kg = nullif(btrim(p_payload->>'promo_label_kg'),''), promo_label_en = nullif(btrim(p_payload->>'promo_label_en'),''),
      promo_start_at = nullif(p_payload->>'promo_start_at','')::timestamptz, promo_end_at = nullif(p_payload->>'promo_end_at','')::timestamptz,
      sort_order = coalesce((p_payload->>'sort_order')::integer,0)
    where id = v_id;
    if not found then raise exception 'Товар не найден'; end if;
  end if;

  return query select * from public.products where id = v_id;
end;
$$;

grant select on public.catalog_products to anon, authenticated;
revoke all on function public.admin_upsert_product(jsonb) from public;
grant execute on function public.admin_upsert_product(jsonb) to authenticated;
