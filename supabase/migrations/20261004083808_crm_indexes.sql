create extension if not exists pg_trgm with schema extensions;
create index crm_clients_name_search on salt_crm.clients using gin(full_name extensions.gin_trgm_ops);
create index crm_clients_phone_search on salt_crm.clients using gin(phone extensions.gin_trgm_ops);
create index crm_inquiries_source_campaign on salt_crm.inquiries(source,campaign,occurred_at desc);
create index crm_sales_source_campaign on salt_crm.sales(source,campaign,sold_at desc) where voided_at is null;
create index crm_notes_actor on salt_crm.notes(actor_id);
create index crm_sales_actor on salt_crm.sales(actor_id);
create index crm_audit_actor on salt_crm.audit(actor_id);
create index crm_sessions_user on salt_crm.sessions(user_id);
