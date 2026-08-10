-- Remove duplicate permissive SELECT policies for authenticated staff.
drop policy if exists products_public_catalog_read on public.products;
create policy products_public_catalog_read on public.products
for select to anon
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
for select to anon
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

create index if not exists activity_logs_actor_user_idx on public.activity_logs(actor_user_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id);
create index if not exists order_status_history_changed_by_idx on public.order_status_history(changed_by);
create index if not exists orders_responsible_staff_idx on public.orders(responsible_staff_id);
create index if not exists staff_created_by_idx on public.staff(created_by);
