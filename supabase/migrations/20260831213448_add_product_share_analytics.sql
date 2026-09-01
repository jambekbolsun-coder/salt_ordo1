-- Track successful product shares without exposing analytics rows to public clients.

alter table public.analytics_events
  drop constraint analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'page_view', 'product_view', 'product_share', 'category_view', 'search',
    'whatsapp_click', 'contact_submit', 'quiz_start', 'quiz_answer',
    'quiz_complete', 'quiz_dismiss'
  ));

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
  if p_event_type not in (
    'page_view', 'product_view', 'product_share', 'category_view',
    'search', 'whatsapp_click', 'contact_submit'
  ) then
    raise exception 'Unsupported event';
  end if;

  if p_visitor_id is null or p_session_id is null then
    raise exception 'Invalid visitor session';
  end if;

  p_metadata := coalesce(p_metadata, '{}'::jsonb);
  if jsonb_typeof(p_metadata) <> 'object' or pg_column_size(p_metadata) > 4096 then
    raise exception 'Invalid event metadata';
  end if;

  if p_event_type = 'product_share' then
    if p_product_id is null or not exists (
      select 1 from public.products
      where id = p_product_id and status = 'published'
    ) then
      raise exception 'Invalid product';
    end if;
  end if;

  insert into public.analytics_events(
    visitor_id, session_id, event_type, path, product_id, category_slug, metadata
  ) values (
    p_visitor_id,
    p_session_id,
    p_event_type,
    left(p_path, 300),
    p_product_id,
    left(p_category_slug, 100),
    p_metadata
  );
end;
$$;

revoke execute on function public.track_public_event(uuid, uuid, text, text, uuid, text, jsonb) from public;
grant execute on function public.track_public_event(uuid, uuid, text, text, uuid, text, jsonb) to anon, authenticated;

create index if not exists analytics_events_product_share_idx
  on public.analytics_events(created_at desc, visitor_id, product_id)
  where event_type = 'product_share';
