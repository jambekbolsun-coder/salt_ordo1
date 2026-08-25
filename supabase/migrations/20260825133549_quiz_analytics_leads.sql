-- SALT ORDO · quiz, lead inbox and privacy-safe analytics

create type public.lead_status as enum ('new', 'in_progress', 'contacted', 'won', 'lost');

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  language text not null default 'ru' check (language in ('ru', 'kg', 'en')),
  answers jsonb not null default '{}'::jsonb,
  recommended_category_slugs text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'contact' check (source in ('product', 'contact', 'checkout', 'quiz', 'whatsapp')),
  customer_name text not null,
  phone text not null,
  email text,
  message text,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  status public.lead_status not null default 'new',
  responsible_staff_id uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in (
    'page_view', 'product_view', 'category_view', 'search', 'whatsapp_click',
    'contact_submit', 'quiz_start', 'quiz_answer', 'quiz_complete', 'quiz_dismiss'
  )),
  path text,
  product_id uuid references public.products(id) on delete set null,
  category_slug text,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger leads_touch_updated_at
before update on public.leads
for each row execute function public.touch_updated_at();

create index quiz_sessions_created_idx on public.quiz_sessions(created_at desc);
create index quiz_sessions_completed_idx on public.quiz_sessions(completed_at desc) where completed_at is not null;
create index leads_status_created_idx on public.leads(status, created_at desc);
create index leads_product_idx on public.leads(product_id);
create index leads_quiz_session_idx on public.leads(quiz_session_id);
create index leads_responsible_staff_idx on public.leads(responsible_staff_id);
create index analytics_events_created_idx on public.analytics_events(created_at desc);
create index analytics_events_type_created_idx on public.analytics_events(event_type, created_at desc);
create index analytics_events_product_idx on public.analytics_events(product_id, created_at desc);
create index analytics_events_category_idx on public.analytics_events(category_slug, created_at desc);
create index analytics_events_visitor_idx on public.analytics_events(visitor_id, created_at desc);

alter table public.quiz_sessions enable row level security;
alter table public.leads enable row level security;
alter table public.analytics_events enable row level security;

create policy quiz_sessions_staff_read on public.quiz_sessions
for select to authenticated
using (coalesce(public.current_staff_role() in ('owner', 'admin', 'manager'), false));

create policy leads_staff_read on public.leads
for select to authenticated
using (coalesce(public.current_staff_role() in ('owner', 'admin', 'manager'), false));

create policy leads_staff_update on public.leads
for update to authenticated
using (coalesce(public.current_staff_role() in ('owner', 'admin', 'manager'), false))
with check (coalesce(public.current_staff_role() in ('owner', 'admin', 'manager'), false));

create policy analytics_events_staff_read on public.analytics_events
for select to authenticated
using (coalesce(public.current_staff_role() in ('owner', 'admin', 'manager'), false));

revoke all on public.quiz_sessions, public.leads, public.analytics_events from anon, authenticated;
grant select on public.quiz_sessions, public.analytics_events to authenticated;
grant select, update on public.leads to authenticated;

create or replace function public.start_public_quiz(
  p_visitor_id uuid,
  p_session_id uuid,
  p_language text default 'ru'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz_id uuid;
begin
  if p_visitor_id is null or p_session_id is null then
    raise exception 'Invalid visitor session';
  end if;
  if p_language not in ('ru', 'kg', 'en') then p_language := 'ru'; end if;

  insert into public.quiz_sessions(visitor_id, language)
  values (p_visitor_id, p_language)
  returning id into v_quiz_id;

  insert into public.analytics_events(visitor_id, session_id, event_type, quiz_session_id)
  values (p_visitor_id, p_session_id, 'quiz_start', v_quiz_id);

  return v_quiz_id;
end;
$$;

create or replace function public.save_public_quiz_answer(
  p_quiz_session_id uuid,
  p_visitor_id uuid,
  p_session_id uuid,
  p_question_key text,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(coalesce(p_question_key, '')) < 1 or length(coalesce(p_question_key, '')) > 60 then
    raise exception 'Invalid question';
  end if;
  if length(coalesce(p_answer, '')) < 1 or length(p_answer) > 300 then
    raise exception 'Invalid answer';
  end if;

  update public.quiz_sessions
  set answers = answers || jsonb_build_object(p_question_key, p_answer)
  where id = p_quiz_session_id
    and visitor_id = p_visitor_id
    and completed_at is null;

  if not found then raise exception 'Quiz session not found'; end if;

  insert into public.analytics_events(
    visitor_id, session_id, event_type, quiz_session_id, metadata
  ) values (
    p_visitor_id, p_session_id, 'quiz_answer', p_quiz_session_id,
    jsonb_build_object('question', p_question_key, 'answer', p_answer)
  );
end;
$$;

create or replace function public.complete_public_quiz(
  p_quiz_session_id uuid,
  p_visitor_id uuid,
  p_session_id uuid,
  p_category_slugs text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quiz_sessions
  set completed_at = now(),
      recommended_category_slugs = coalesce(p_category_slugs, '{}')
  where id = p_quiz_session_id
    and visitor_id = p_visitor_id
    and completed_at is null;

  if not found then raise exception 'Quiz session not found'; end if;

  insert into public.analytics_events(
    visitor_id, session_id, event_type, quiz_session_id, metadata
  ) values (
    p_visitor_id, p_session_id, 'quiz_complete', p_quiz_session_id,
    jsonb_build_object('categories', coalesce(p_category_slugs, '{}'))
  );
end;
$$;

create or replace function public.dismiss_public_quiz(
  p_quiz_session_id uuid,
  p_visitor_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quiz_sessions
  set dismissed_at = now()
  where id = p_quiz_session_id
    and visitor_id = p_visitor_id
    and completed_at is null;

  if found then
    insert into public.analytics_events(visitor_id, session_id, event_type, quiz_session_id)
    values (p_visitor_id, p_session_id, 'quiz_dismiss', p_quiz_session_id);
  end if;
end;
$$;

create or replace function public.track_public_event(
  p_visitor_id uuid,
  p_session_id uuid,
  p_event_type text,
  p_path text default null,
  p_product_id uuid default null,
  p_category_slug text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('page_view', 'product_view', 'category_view', 'search', 'whatsapp_click', 'contact_submit') then
    raise exception 'Unsupported event';
  end if;
  if p_visitor_id is null or p_session_id is null then raise exception 'Invalid visitor session'; end if;

  insert into public.analytics_events(
    visitor_id, session_id, event_type, path, product_id, category_slug, metadata
  ) values (
    p_visitor_id, p_session_id, p_event_type, left(p_path, 300), p_product_id,
    left(p_category_slug, 100), coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.create_public_lead(
  p_source text,
  p_customer_name text,
  p_phone text,
  p_email text default null,
  p_message text default null,
  p_product_id uuid default null,
  p_quiz_session_id uuid default null,
  p_visitor_id uuid default null,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_product_name text;
begin
  p_customer_name := btrim(coalesce(p_customer_name, ''));
  p_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  p_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  p_message := nullif(left(btrim(coalesce(p_message, '')), 2000), '');

  if length(p_customer_name) < 2 or length(p_customer_name) > 100 then raise exception 'Введите имя'; end if;
  if length(p_phone) < 9 or length(p_phone) > 20 then raise exception 'Введите корректный номер'; end if;
  if p_email is not null and p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Введите корректный email'; end if;
  if p_source not in ('product', 'contact', 'checkout', 'quiz', 'whatsapp') then p_source := 'contact'; end if;

  if p_product_id is not null then
    select name_ru into v_product_name
    from public.products
    where id = p_product_id and status = 'published';
  end if;

  insert into public.leads(
    source, customer_name, phone, email, message, product_id, product_name, quiz_session_id
  ) values (
    p_source, p_customer_name, p_phone, p_email, p_message, p_product_id, v_product_name, p_quiz_session_id
  ) returning id into v_lead_id;

  if p_visitor_id is not null and p_session_id is not null then
    insert into public.analytics_events(
      visitor_id, session_id, event_type, path, product_id, quiz_session_id,
      metadata
    ) values (
      p_visitor_id, p_session_id, 'contact_submit', null, p_product_id, p_quiz_session_id,
      jsonb_build_object('source', p_source)
    );
  end if;

  return v_lead_id;
end;
$$;

revoke execute on function public.start_public_quiz(uuid, uuid, text) from public;
revoke execute on function public.save_public_quiz_answer(uuid, uuid, uuid, text, text) from public;
revoke execute on function public.complete_public_quiz(uuid, uuid, uuid, text[]) from public;
revoke execute on function public.dismiss_public_quiz(uuid, uuid, uuid) from public;
revoke execute on function public.track_public_event(uuid, uuid, text, text, uuid, text, jsonb) from public;
revoke execute on function public.create_public_lead(text, text, text, text, text, uuid, uuid, uuid, uuid) from public;

grant execute on function public.start_public_quiz(uuid, uuid, text) to anon, authenticated;
grant execute on function public.save_public_quiz_answer(uuid, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.complete_public_quiz(uuid, uuid, uuid, text[]) to anon, authenticated;
grant execute on function public.dismiss_public_quiz(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.track_public_event(uuid, uuid, text, text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.create_public_lead(text, text, text, text, text, uuid, uuid, uuid, uuid) to anon, authenticated;

-- Seed the requested catalog categories. Images and products remain admin-managed.
insert into public.categories(slug, name_ru, name_kg, name_en, sort_order)
values
  ('sep', 'Кызга сеп', 'Кызга сеп', 'Bridal dowry', 10),
  ('jer-toshok', 'Жер төшөк', 'Жер төшөк', 'Floor bedding', 20),
  ('jastyk', 'Жастык', 'Жаздык', 'Pillows', 30),
  ('sandyk', 'Сандык', 'Сандык', 'Chests', 40),
  ('custom', 'Под заказ', 'Буйрутма менен', 'Custom order', 50)
on conflict (slug) do update set
  name_ru = excluded.name_ru,
  name_kg = excluded.name_kg,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order,
  is_visible = true;
