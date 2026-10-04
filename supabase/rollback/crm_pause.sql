-- Roll the Vercel deployment back FIRST. This preserves every CRM record.
-- Run only as the database owner, after inspecting schema names.
begin;
alter table public.leads disable trigger salt_crm_lead_capture;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'salt_crm_%' loop
  execute format('revoke execute on function %s from service_role',f.signature);
 end loop;
end $$;
grant execute on function public.create_public_order(text,text,text,text,text,text,jsonb),public.create_public_lead(text,text,text,text,text,uuid,uuid,uuid,uuid),public.start_public_quiz(uuid,uuid,text),public.save_public_quiz_answer(uuid,uuid,uuid,text,text),public.complete_public_quiz(uuid,uuid,uuid,text[]),public.dismiss_public_quiz(uuid,uuid,uuid),public.track_public_event(uuid,uuid,text,text,uuid,text,jsonb) to anon,authenticated;
alter schema salt_crm rename to salt_crm_preserved;
commit;
