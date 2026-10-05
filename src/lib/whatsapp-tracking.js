import { consent,campaignAttribution } from './consent.js';
import { request } from './crm.js';
function trackingSession(){try{return sessionStorage.getItem('salt-ordo-session-id')}catch{return null}}

// A per-click reference is functional. Persistent advertising/session data needs consent.
export async function trackedWhatsAppUrl(original,context={}) {
 try {
  const url=new URL(original);
  if(url.protocol!=='https:'||url.hostname!=='wa.me')return original;
  if(/SO-[A-F0-9]{12}/.test(url.searchParams.get('text')||''))return original;
  const c=consent(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try {
   const result=await request('whatsapp-click',{page:location.pathname,product:context.product||'',category:context.category||'',consent:c,attribution:campaignAttribution(),session_id:c?.marketing&&c?.analytics?trackingSession():null},'',controller.signal);
   if(/^SO-[A-F0-9]{12}$/.test(result.code))url.searchParams.set('text',`${url.searchParams.get('text')||''}\n\nКод обращения: ${result.code}`.trim());
   return url.toString();
  } finally { clearTimeout(timer); }
 } catch { return original; }
}
export function openTrackedWhatsApp(original,context={}) {
 const popup=window.open('about:blank','_blank');
 if(popup)popup.opener=null;
 void trackedWhatsAppUrl(original,context).then(url=>{if(popup&&!popup.closed)popup.location.replace(url);else window.location.assign(url)});
}
