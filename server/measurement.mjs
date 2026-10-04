import { isIP } from 'node:net';
import { EVENTS, validConsent, safePath } from '../shared/measurement.mjs';
import { HttpError, uuid } from './validation.mjs';
import { rpc } from './supabase.mjs';
import { reportError } from './monitoring.mjs';
export function measurementConfig() {
  return {
    ga4: /^G-[A-Z0-9]+$/.test(process.env.SALT_GA4_MEASUREMENT_ID || '') ? process.env.SALT_GA4_MEASUREMENT_ID : null,
    meta: /^\d{5,25}$/.test(process.env.SALT_META_PIXEL_ID || '') ? process.env.SALT_META_PIXEL_ID : null,
  };
}
export function conversion(body, req) {
  if (!validConsent(body.consent) || body.consent.marketing !== true) return null;
  if (!Object.hasOwn(EVENTS, body.event)) throw new HttpError(400, 'Неизвестное событие.');
  const id = uuid(body.event_id), path = safePath(body.path);
  const ip = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
  const user = {};
  if (isIP(String(ip || ''))) user.client_ip_address = ip;
  const agent = req.headers['user-agent'];
  if (typeof agent === 'string') user.client_user_agent = agent.slice(0,512);
  for (const key of ['fbp','fbc']) if (/^fb\.\d\.\d{10,16}\.[A-Za-z0-9_-]{1,250}$/.test(body[key] || '')) user[key] = body[key];
  return { event_name: EVENTS[body.event][1], event_id: id, event_time: Math.floor(Date.now()/1000), action_source: 'website', event_source_url: (process.env.SALT_APP_ORIGIN || 'https://salt-ordo1.vercel.app') + path, user_data: user };
}
export async function sendConversion(body, req) {
  const event = conversion(body, req), pixel = measurementConfig().meta;
  const token = process.env.SALT_META_ACCESS_TOKEN, version = process.env.SALT_META_API_VERSION;
  if (!event || !pixel || !token || !/^v\d+\.\d+$/.test(version || '')) return {accepted:false};
  const claim = await rpc('salt_crm_event_delivery', {p_id:event.event_id,p_operation:'claim'});
  if (!claim) return {accepted:true};
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${pixel}/events`, {
      method:'POST', redirect:'error', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({data:[event], ...(process.env.SALT_META_TEST_EVENT_CODE ? {test_event_code:process.env.SALT_META_TEST_EVENT_CODE} : {})}), signal:AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('delivery_failed');
    await rpc('salt_crm_event_delivery',{p_id:event.event_id,p_operation:'sent'});
    return {accepted:true};
  } catch {
    await rpc('salt_crm_event_delivery',{p_id:event.event_id,p_operation:'retry'}).catch(()=>{});
    await reportError('telemetry',503);
    throw new HttpError(503,'Событие временно не доставлено.');
  }
}
