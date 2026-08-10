-- Security hardening for public catalog access and RPC permissions.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Public catalog RLS can safely expose only published products.
drop policy if exists products_public_catalog_read on public.products;
create policy products_public_catalog_read on public.products
for select to anon, authenticated
using (
  status = 'published'
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = products.category_id and c.is_visible = true
    )
  )
);

drop policy if exists product_images_public_catalog_read on public.product_images;
create policy product_images_public_catalog_read on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and p.status = 'published'
      and (
        p.category_id is null
        or exists (
          select 1 from public.categories c
          where c.id = p.category_id and c.is_visible = true
        )
      )
  )
);

-- Avoid calling staff helper functions from anonymous category reads.
drop policy if exists categories_public_read on public.categories;
create policy categories_anon_read on public.categories
for select to anon using (is_visible = true);
create policy categories_authenticated_read on public.categories
for select to authenticated using (is_visible = true or public.can_manage_catalog());

-- SECURITY INVOKER makes the catalog view honor the caller's RLS and column grants.
create or replace view public.catalog_products
with (security_barrier = true, security_invoker = true)
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

-- Only safe catalog columns can be selected directly; cost_price stays inaccessible.
revoke all on public.products from anon, authenticated;
grant select (
  id, category_id, slug, sku,
  name_ru, name_kg, name_en,
  description_ru, description_kg, description_en,
  sale_price, old_price, price_on_request,
  seam, material, seam_ru, seam_kg, seam_en, material_ru, material_kg, material_en,
  colors, sizes, stock_qty, production_days, status,
  is_featured, is_new, is_set, is_on_sale,
  promo_label_ru, promo_label_kg, promo_label_en, promo_start_at, promo_end_at,
  sort_order, created_at
) on public.products to anon, authenticated;

grant select on public.product_images to anon, authenticated;
grant select on public.catalog_products to anon, authenticated;

-- Trigger/helper functions should not be callable from the public REST API.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.audit_catalog_change() from public, anon, authenticated;
revoke execute on function public.guard_staff_role_changes() from public, anon, authenticated;
revoke execute on function public.log_order_status_change() from public, anon, authenticated;

revoke execute on function public.current_staff_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_owner_or_admin() from public, anon;
revoke execute on function public.can_manage_catalog() from public, anon;
grant execute on function public.current_staff_role(), public.is_staff(), public.is_owner_or_admin(), public.can_manage_catalog() to authenticated;

-- Admin RPCs: authenticated staff only. Each RPC still checks the staff role internally.
revoke execute on function public.admin_list_products() from public, anon;
revoke execute on function public.admin_get_product(uuid) from public, anon;
revoke execute on function public.admin_upsert_product(jsonb) from public, anon;
revoke execute on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_list_products(), public.admin_get_product(uuid), public.admin_upsert_product(jsonb), public.admin_delete_product(uuid) to authenticated;

-- Checkout is intentionally public: it validates product IDs and prices server-side.
revoke execute on function public.create_public_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_public_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
