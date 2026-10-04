-- Apply only AFTER the CRM production deployment is healthy.
-- Public writes now pass through the same-origin API with validation,
-- consent checks and durable rate limits. Service gateway access remains.
revoke execute on function
 public.create_public_order(text,text,text,text,text,text,jsonb),
 public.create_public_lead(text,text,text,text,text,uuid,uuid,uuid,uuid),
 public.start_public_quiz(uuid,uuid,text),
 public.save_public_quiz_answer(uuid,uuid,uuid,text,text),
 public.complete_public_quiz(uuid,uuid,uuid,text[]),
 public.dismiss_public_quiz(uuid,uuid,uuid),
 public.track_public_event(uuid,uuid,text,text,uuid,text,jsonb)
from public, anon, authenticated;
grant execute on function
 public.create_public_order(text,text,text,text,text,text,jsonb),
 public.create_public_lead(text,text,text,text,text,uuid,uuid,uuid,uuid),
 public.start_public_quiz(uuid,uuid,text),
 public.save_public_quiz_answer(uuid,uuid,uuid,text,text),
 public.complete_public_quiz(uuid,uuid,uuid,text[]),
 public.dismiss_public_quiz(uuid,uuid,uuid),
 public.track_public_event(uuid,uuid,text,text,uuid,text,jsonb)
to service_role;
