-- Salt Ordo · sales system
-- Public catalog is read-only. Customer registration does not exist.
-- Admin access is available only to authenticated staff under /admin.

create extension if not exists pgcrypto;

create type public.staff_role as enum ('owner','admin','manager','content');
create type public.product_status as enum ('draft','published','hidden');
create type public.order_status as enum ('new','contacted','confirmed','production','ready','delivery','delivered','cancelled');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.staff_role not null default 'manager',
  avatar_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index staff_email_lower_idx on public.staff (lower(email));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ru text not null,
  name_kg text,
  name_en text,
  image_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  sku text unique,
  name_ru text not null,
  name_kg text,
  name_en text,
  description_ru text,
  description_kg text,
  description_en text,
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  price_on_request boolean not null default false,
  seam text,
  material text,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock_qty integer not null default 0 check (stock_qty >= 0),
  production_days integer check (production_days is null or production_days >= 0),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_set boolean not null default false,
  is_on_sale boolean not null default false,
  promo_label_ru text,
  promo_label_kg text,
  promo_label_en text,
  promo_start_at timestamptz,
  promo_end_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_required check (status <> 'published' or price_on_request or sale_price is not null),
  constraint products_old_price_check check (old_price is null or sale_price is null or old_price >= sale_price),
  constraint products_promo_dates_check check (promo_end_at is null or promo_start_at is null or promo_end_at >= promo_start_at)
);

create index products_catalog_idx on public.products (status, sort_order, created_at desc);
create index products_category_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  city text,
  orders_count integer not null default 0 check (orders_count >= 0),
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  city text,
  delivery_method text not null default 'manager',
  note text,
  language text not null default 'ru' check (language in ('ru','kg','en')),
  status public.order_status not null default 'new',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  has_request_price boolean not null default false,
  responsible_staff_id uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2),
  line_total numeric(12,2),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id boolean primary key default true check (id),
  brand_name text not null default 'Salt Ordo',
  whatsapp text not null default '+996998992996',
  instagram text not null default 'https://www.instagram.com/salt_ordo/',
  delivery_note_ru text not null default 'Доставка по всему Кыргызстану',
  delivery_note_kg text not null default 'Кыргызстандын бардык аймагына жеткирүү',
  delivery_note_en text not null default 'Delivery across Kyrgyzstan',
  seo_title text not null default 'Salt Ordo — домашний текстиль и индивидуальные заказы',
  seo_description text not null default 'Төшөк, сеп-комплекты, сандыки и домашний текстиль Salt Ordo. Индивидуальные заказы и доставка по Кыргызстану.',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_touch_updated_at before update on public.staff for each row execute function public.touch_updated_at();
create trigger categories_touch_updated_at before update on public.categories for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_updated_at();
create trigger customers_touch_updated_at before update on public.customers for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();

-- RLS helper functions. SECURITY DEFINER avoids recursive policies on staff.
create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select s.role from public.staff s
  where s.user_id = auth.uid() and s.is_active = true
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.staff s where s.user_id = auth.uid() and s.is_active = true);
$$;

create or replace function public.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('owner','admin'), false);
$$;

create or replace function public.can_manage_catalog()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('owner','admin','content'), false);
$$;

-- Prevent privilege escalation through direct staff updates.
create or replace function public.guard_staff_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.staff_role;
begin
  -- Service-role/SQL administration has no auth.uid() and is allowed.
  if auth.uid() is null then return new; end if;
  v_actor := public.current_staff_role();
  if v_actor = 'owner' then return new; end if;
  if v_actor = 'admin' then
    if old.role in ('owner','admin') or new.role in ('owner','admin') then
      raise exception 'Only owner can manage owner/admin roles';
    end if;
    return new;
  end if;
  raise exception 'Insufficient permissions';
end;
$$;

create trigger staff_guard_role before update on public.staff for each row execute function public.guard_staff_role_changes();

-- Immutable history entry for each order status transition.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger order_status_history_trigger after update of status on public.orders for each row execute function public.log_order_status_change();

-- Minimal activity audit for catalog changes.
create or replace function public.audit_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.activity_logs(actor_user_id, action, entity_type, entity_id, details)
    values (auth.uid(), lower(tg_op), tg_table_name, old.id::text, jsonb_build_object('name', old.name_ru));
    return old;
  end if;

  insert into public.activity_logs(actor_user_id, action, entity_type, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, new.id::text, jsonb_build_object('name', new.name_ru));
  return new;
end;
$$;
create trigger products_audit after insert or update or delete on public.products for each row execute function public.audit_catalog_change();

-- Public-safe view. It deliberately excludes cost_price and every staff-only field.
create view public.catalog_products
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
  ), '[]'::jsonb) as images
from public.products p
left join public.categories c on c.id = p.category_id
where p.status = 'published'
  and (c.id is null or c.is_visible = true);

-- Public checkout: order is saved before the browser opens WhatsApp.
create sequence public.order_number_seq start 1001;

create or replace function public.create_public_order(
  p_customer_name text,
  p_phone text,
  p_city text default null,
  p_delivery_method text default 'manager',
  p_note text default null,
  p_language text default 'ru',
  p_items jsonb default '[]'::jsonb
)
returns table(order_id uuid, order_number text, total_amount numeric, has_request_price boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'SO-' || nextval('public.order_number_seq')::text;
  v_customer_id uuid;
  v_total numeric(12,2) := 0;
  v_has_request boolean := false;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_line numeric(12,2);
begin
  p_customer_name := btrim(coalesce(p_customer_name,''));
  p_phone := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g');
  if length(p_customer_name) < 2 then raise exception 'Введите имя'; end if;
  if length(p_phone) < 9 then raise exception 'Введите корректный номер телефона'; end if;
  if p_language not in ('ru','kg','en') then p_language := 'ru'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Корзина пуста'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Слишком много позиций'; end if;

  insert into public.customers(name, phone, city, orders_count, last_order_at)
  values (p_customer_name, p_phone, nullif(btrim(coalesce(p_city,'')),''), 1, now())
  on conflict (phone) do update set
    name = excluded.name,
    city = coalesce(excluded.city, public.customers.city),
    orders_count = public.customers.orders_count + 1,
    last_order_at = now(),
    updated_at = now()
  returning id into v_customer_id;

  insert into public.orders(id, order_number, customer_id, customer_name, phone, city, delivery_method, note, language)
  values (
    v_order_id, v_order_number, v_customer_id, p_customer_name, p_phone,
    nullif(btrim(coalesce(p_city,'')),''),
    left(coalesce(nullif(btrim(p_delivery_method),''),'manager'), 60),
    nullif(left(btrim(coalesce(p_note,'')), 2000),''),
    p_language
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := greatest(1, least(99, coalesce((v_item->>'quantity')::integer,1)));
      select * into strict v_product
      from public.products
      where id = (v_item->>'product_id')::uuid and status = 'published';
    exception when others then
      raise exception 'Один из товаров недоступен';
    end;

    if not v_product.price_on_request and v_product.sale_price is null then
      raise exception 'У товара не указана цена';
    end if;

    if v_product.price_on_request then
      v_line := null;
      v_has_request := true;
    else
      v_line := round(v_product.sale_price * v_qty, 2);
      v_total := v_total + v_line;
    end if;

    insert into public.order_items(order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name_ru, v_qty, case when v_product.price_on_request then null else v_product.sale_price end, v_line);
  end loop;

  update public.orders set total_amount = v_total, has_request_price = v_has_request where id = v_order_id;
  insert into public.order_status_history(order_id, old_status, new_status, changed_by)
  values (v_order_id, null, 'new', null);

  return query select v_order_id, v_order_number, v_total, v_has_request;
end;
$$;

-- Admin RPCs keep product cost and internal data out of the public view.
create or replace function public.admin_list_products()
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_catalog() then raise exception 'Forbidden'; end if;
  return query select * from public.products order by sort_order, created_at desc;
end;
$$;

create or replace function public.admin_get_product(p_id uuid)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_catalog() then raise exception 'Forbidden'; end if;
  return query select * from public.products where id = p_id;
end;
$$;

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
begin
  if not public.can_manage_catalog() then raise exception 'Forbidden'; end if;
  v_id := nullif(p_payload->>'id','')::uuid;
  v_colors := coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'colors','[]'::jsonb))), '{}'::text[]);
  v_sizes := coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'sizes','[]'::jsonb))), '{}'::text[]);

  if nullif(btrim(p_payload->>'name_ru'),'') is null then raise exception 'Название RU обязательно'; end if;
  if nullif(btrim(p_payload->>'slug'),'') is null then raise exception 'URL товара обязателен'; end if;

  if v_id is null then
    insert into public.products(
      category_id,slug,sku,name_ru,name_kg,name_en,description_ru,description_kg,description_en,
      cost_price,sale_price,old_price,price_on_request,seam,material,colors,sizes,stock_qty,production_days,
      status,is_featured,is_new,is_set,is_on_sale,promo_label_ru,promo_label_kg,promo_label_en,promo_start_at,promo_end_at,sort_order
    ) values (
      nullif(p_payload->>'category_id','')::uuid,
      btrim(p_payload->>'slug'), nullif(btrim(p_payload->>'sku'),''), btrim(p_payload->>'name_ru'),
      nullif(btrim(p_payload->>'name_kg'),''), nullif(btrim(p_payload->>'name_en'),''),
      nullif(btrim(p_payload->>'description_ru'),''), nullif(btrim(p_payload->>'description_kg'),''), nullif(btrim(p_payload->>'description_en'),''),
      nullif(p_payload->>'cost_price','')::numeric, nullif(p_payload->>'sale_price','')::numeric, nullif(p_payload->>'old_price','')::numeric,
      coalesce((p_payload->>'price_on_request')::boolean,false), nullif(btrim(p_payload->>'seam'),''), nullif(btrim(p_payload->>'material'),''),
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
      price_on_request = coalesce((p_payload->>'price_on_request')::boolean,false), seam = nullif(btrim(p_payload->>'seam'),''), material = nullif(btrim(p_payload->>'material'),''),
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

create or replace function public.admin_delete_product(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_catalog() then raise exception 'Forbidden'; end if;
  delete from public.products where id = p_id;
end;
$$;

-- RLS
alter table public.staff enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_logs enable row level security;

create policy staff_read_staff on public.staff for select to authenticated using (public.is_staff());
create policy staff_update_management on public.staff for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

create policy categories_public_read on public.categories for select to anon, authenticated using (is_visible or public.can_manage_catalog());
create policy categories_staff_insert on public.categories for insert to authenticated with check (public.can_manage_catalog());
create policy categories_staff_update on public.categories for update to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy categories_staff_delete on public.categories for delete to authenticated using (public.can_manage_catalog());

create policy products_staff_read on public.products for select to authenticated using (public.can_manage_catalog());
create policy product_images_staff_read on public.product_images for select to authenticated using (public.can_manage_catalog());
create policy product_images_staff_insert on public.product_images for insert to authenticated with check (public.can_manage_catalog());
create policy product_images_staff_update on public.product_images for update to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy product_images_staff_delete on public.product_images for delete to authenticated using (public.can_manage_catalog());

create policy customers_staff_all on public.customers for all to authenticated using (coalesce(public.current_staff_role() in ('owner','admin','manager'),false)) with check (coalesce(public.current_staff_role() in ('owner','admin','manager'),false));
create policy orders_staff_all on public.orders for all to authenticated using (coalesce(public.current_staff_role() in ('owner','admin','manager'),false)) with check (coalesce(public.current_staff_role() in ('owner','admin','manager'),false));
create policy order_items_staff_read on public.order_items for select to authenticated using (coalesce(public.current_staff_role() in ('owner','admin','manager'),false));
create policy order_history_staff_read on public.order_status_history for select to authenticated using (coalesce(public.current_staff_role() in ('owner','admin','manager'),false));

create policy settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.site_settings for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());
create policy activity_admin_read on public.activity_logs for select to authenticated using (public.is_owner_or_admin());

-- Explicit privileges. Anonymous users never receive raw products/costs or order/customer tables.
revoke all on public.products, public.staff, public.customers, public.orders, public.order_items, public.order_status_history, public.activity_logs from anon;
revoke all on public.products from authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.catalog_products to anon, authenticated;
grant select on public.categories, public.site_settings to anon;
grant select, insert, update, delete on public.categories, public.product_images to authenticated;
grant select, update on public.staff to authenticated;
grant select, insert, update, delete on public.customers, public.orders to authenticated;
grant select on public.order_items, public.order_status_history, public.activity_logs to authenticated;
grant select, update on public.site_settings to authenticated;

revoke all on function public.create_public_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_public_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
revoke all on function public.admin_list_products() from public;
revoke all on function public.admin_get_product(uuid) from public;
revoke all on function public.admin_upsert_product(jsonb) from public;
revoke all on function public.admin_delete_product(uuid) from public;
grant execute on function public.admin_list_products(), public.admin_get_product(uuid), public.admin_upsert_product(jsonb), public.admin_delete_product(uuid) to authenticated;

-- Product image Storage. The bucket starts empty.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');
create policy product_images_storage_staff_insert on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.can_manage_catalog());
create policy product_images_storage_staff_update on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.can_manage_catalog()) with check (bucket_id = 'product-images' and public.can_manage_catalog());
create policy product_images_storage_staff_delete on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.can_manage_catalog());
