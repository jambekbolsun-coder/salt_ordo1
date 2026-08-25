-- Keep public API grants intentional and close unrelated helper execution.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover the quiz-session foreign key used by analytics reporting and cleanup.
create index if not exists analytics_events_quiz_session_idx
  on public.analytics_events(quiz_session_id)
  where quiz_session_id is not null;

-- Correct email validation for standard-conforming PostgreSQL strings.
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
      visitor_id, session_id, event_type, path, product_id, quiz_session_id, metadata
    ) values (
      p_visitor_id, p_session_id, 'contact_submit', null, p_product_id, p_quiz_session_id,
      jsonb_build_object('source', p_source)
    );
  end if;

  return v_lead_id;
end;
$$;

revoke execute on function public.create_public_lead(text, text, text, text, text, uuid, uuid, uuid, uuid) from public;
grant execute on function public.create_public_lead(text, text, text, text, text, uuid, uuid, uuid, uuid) to anon, authenticated;
