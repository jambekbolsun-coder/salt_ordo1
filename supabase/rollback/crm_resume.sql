-- Reverse crm_pause.sql, before restoring the CRM Vercel deployment.
begin;
alter schema salt_crm_preserved rename to salt_crm;
alter table public.leads enable trigger salt_crm_lead_capture;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'salt_crm_%' loop
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
-- Backfill missed leads by reusing the insert trigger without duplicating leads.
do $$ declare l public.leads; begin
 for l in select * from public.leads p where not exists(select 1 from salt_crm.inquiries i where i.external_provider='website_lead' and i.external_id=p.id::text) loop
  if salt_crm.normalize_phone(l.phone) is not null then
   perform salt_crm.record_inquiry(jsonb_build_object('full_name',l.customer_name,'phone',l.phone,'source','website','note',coalesce(l.message,''),'interest',coalesce(l.product_name,''),'occurred_at',l.created_at),'website_lead',l.id::text);
  end if;
 end loop;
end $$;
commit;
-- After verifying the restored app, reapply the cutover grants.
