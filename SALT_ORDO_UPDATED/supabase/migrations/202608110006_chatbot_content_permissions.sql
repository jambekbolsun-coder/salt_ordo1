drop policy if exists chatbot_settings_admin_update on public.chatbot_settings;
create policy chatbot_settings_admin_update on public.chatbot_settings
for update to authenticated
using (public.can_manage_catalog())
with check (public.can_manage_catalog());
