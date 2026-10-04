// Server-to-server bridge. Supabase's master key remains in the Edge environment.
// Vercel uses a separate, revocable 256-bit credential whose hash is in the DB.
const allowed = new Set(['salt_crm_api','salt_crm_security_event','salt_crm_reports','salt_crm_session','salt_crm_rate_limit','salt_crm_public_lead','salt_crm_public_order','create_public_order','start_public_quiz','save_public_quiz_answer','complete_public_quiz','dismiss_public_quiz','track_public_event']);
Deno.serve(async (req: Request) => {
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store'};
  const json=(data:unknown,status:number)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const secret=req.headers.get('x-salt-gateway')||'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(secret)) return json({error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceHeaders={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try {
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const auth=await fetch(`${url}/rest/v1/rpc/salt_crm_gateway_auth`,{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_digest:digest})});
    if(!auth.ok||await auth.json()!==true) return json({error:'Unauthorized'},401);
    const raw=await req.text();
    if(raw.length>65536) return json({error:'Too large'},413);
    const body=JSON.parse(raw);
    if(!allowed.has(body.rpc)) return json({error:'Forbidden'},403);
    const response=await fetch(`${url}/rest/v1/rpc/${body.rpc}`,{method:'POST',headers:serviceHeaders,body:JSON.stringify(body.payload),signal:AbortSignal.timeout(15000)});
    if(response.status===204)return json(null,200);
    return new Response(await response.text(),{status:response.status,headers});
  }catch{return json({error:'Service unavailable'},503)}
});
