import { randomUUID } from 'node:crypto';
const routes = new Set(['whatsapp','whatsapp-webhook','login','password','mfa','security','clients','client','reports','export','create','inquiry','sale','update','archive','restore','public','telemetry','health','proxy']);
export function errorRecord(route, status) {
  return { level: status >= 500 ? 'error' : 'warning', event: 'request_failed', route: routes.has(route) ? route : 'other', status: Number.isInteger(status) ? status : 503, request_id: randomUUID(), at: new Date().toISOString() };
}
const lastAlert=new Map();
export async function reportError(route, status) {
  if (status < 500 && !(route === 'login' && [401,429].includes(status))) return;
  const record = errorRecord(route, status);
  console.error(JSON.stringify(record)); // Never log Error objects, URL queries, headers or request bodies.
  const endpoint = process.env.SALT_MONITORING_WEBHOOK_URL;
  if (!endpoint) return;
  const fingerprint=record.route+':'+record.status;
  if(Date.now()-(lastAlert.get(fingerprint)||0)<60000)return;
  lastAlert.set(fingerprint,Date.now());
  try {
    if (new URL(endpoint).protocol !== 'https:') return;
    await fetch(endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', ...(process.env.SALT_MONITORING_WEBHOOK_TOKEN ? {Authorization: `Bearer ${process.env.SALT_MONITORING_WEBHOOK_TOKEN}`} : {}) }, body: JSON.stringify(record), signal: AbortSignal.timeout(2000) });
  } catch { /* Monitoring must never expose provider errors or prevent a response. */ }
}
