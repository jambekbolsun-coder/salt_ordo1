create table if not exists public.chatbot_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  title_ru text not null default 'Помощник Salt Ordo',
  title_kg text not null default 'Salt Ordo жардамчысы',
  title_en text not null default 'Salt Ordo assistant',
  welcome_ru text not null default 'Здравствуйте! Я помогу быстро найти ответ на частый вопрос. Выберите тему ниже или напишите свой вопрос.',
  welcome_kg text not null default 'Саламатсызбы! Көп берилүүчү суроолорго тез жооп табууга жардам берем. Төмөндөн теманы тандаңыз же сурооңузду жазыңыз.',
  welcome_en text not null default 'Hello! I can help you find quick answers to common questions. Choose a topic below or type your question.',
  fallback_ru text not null default 'Пока не нашёл точного ответа. Напишите нам в WhatsApp — менеджер поможет лично.',
  fallback_kg text not null default 'Азырынча так жооп табылган жок. WhatsApp аркылуу жазыңыз — менеджер жеке жардам берет.',
  fallback_en text not null default 'I could not find an exact answer yet. Message us on WhatsApp and our manager will help personally.',
  updated_at timestamptz not null default now()
);
insert into public.chatbot_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.chatbot_faqs (
  id uuid primary key default gen_random_uuid(),
  question_ru text not null,
  question_kg text,
  question_en text,
  answer_ru text not null,
  answer_kg text,
  answer_en text,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chatbot_faqs_active_sort_idx on public.chatbot_faqs (is_active, sort_order, created_at);

alter table public.chatbot_settings enable row level security;
alter table public.chatbot_faqs enable row level security;
revoke all on public.chatbot_settings from anon, authenticated;
revoke all on public.chatbot_faqs from anon, authenticated;
grant select on public.chatbot_settings to anon, authenticated;
grant select on public.chatbot_faqs to anon, authenticated;
grant insert, update, delete on public.chatbot_faqs to authenticated;
grant update on public.chatbot_settings to authenticated;

create policy chatbot_settings_anon_read on public.chatbot_settings for select to anon using (true);
create policy chatbot_settings_authenticated_read on public.chatbot_settings for select to authenticated using (true);
create policy chatbot_settings_admin_update on public.chatbot_settings for update to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy chatbot_faqs_anon_read on public.chatbot_faqs for select to anon using (is_active = true);
create policy chatbot_faqs_authenticated_read on public.chatbot_faqs for select to authenticated using (is_active = true or public.can_manage_catalog());
create policy chatbot_faqs_admin_insert on public.chatbot_faqs for insert to authenticated with check (public.can_manage_catalog());
create policy chatbot_faqs_admin_update on public.chatbot_faqs for update to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy chatbot_faqs_admin_delete on public.chatbot_faqs for delete to authenticated using (public.can_manage_catalog());

create trigger chatbot_settings_touch_updated_at before update on public.chatbot_settings for each row execute function public.touch_updated_at();
create trigger chatbot_faqs_touch_updated_at before update on public.chatbot_faqs for each row execute function public.touch_updated_at();
