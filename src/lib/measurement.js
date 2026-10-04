import { allowed, consent, campaignAttribution } from './consent.js';
import { EVENTS, safePath } from '../../shared/measurement.mjs';
let configuration, gaLoaded=false, metaLoaded=false;
function script(id, src) {
  if (document.getElementById(id)) return;
  const element=document.createElement('script');element.id=id;element.async=true;element.src=src;document.head.append(element);
}
async function providers() {
  configuration ||= fetch('/api/index?route=tracking-config',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('config');return r.json()}).catch(()=>{configuration=null;return {}});
  const config=await configuration;
  if (allowed('analytics') && config.ga4) {
    window.dataLayer ||= [];
    if(!window.gtag){window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})}
    window[`ga-disable-${config.ga4}`]=false;
    window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if(!gaLoaded){gaLoaded=true;window.gtag('js',new Date());window.gtag('config',config.ga4,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,ignore_referrer:true,page_referrer:''});script('salt-ga4',`https://www.googletagmanager.com/gtag/js?id=${config.ga4}`)}
  }
  if (allowed('marketing') && config.meta) {
    if(!window.fbq){const f=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments)};f.push=f;f.loaded=true;f.version='2.0';f.queue=[];window.fbq=f;window._fbq=f;}
    window.fbq('consent','grant');
    if(!metaLoaded){metaLoaded=true;window.fbq('set','autoConfig',false,config.meta);window.fbq('init',config.meta);script('salt-meta','https://connect.facebook.net/en_US/fbevents.js')}
  }
  return config;
}
export async function measure(event, details={}) {
  if(!Object.hasOwn(EVENTS,event) || window.location.pathname.startsWith('/admin') || (!allowed('analytics')&&!allowed('marketing')))return;
  const id=details.eventId || crypto.randomUUID(), path=safePath(details.path||window.location.pathname);
  const config=await providers();
  // Recheck after asynchronous loading: a withdrawn consent cancels queued work.
  if(allowed('analytics')&&config.ga4)window.gtag('event',EVENTS[event][0],{event_id:id,page_location:window.location.origin+path,page_referrer:'',...(details.productId?{items:[{item_id:details.productId}]}:{}),...(event==='consent_change'?{analytics_consent:true,marketing_consent:allowed('marketing')}:{} )});
  if(!allowed('marketing')||!config.meta)return;
  const standard=['PageView','ViewContent','Lead','InitiateCheckout','SubmitApplication','Contact'].includes(EVENTS[event][1]);
  window.fbq(standard?'track':'trackCustom',EVENTS[event][1],{}, {eventID:id});
  const cookies=Object.fromEntries(document.cookie.split('; ').map(c=>{const i=c.indexOf('=');return [c.slice(0,i),c.slice(i+1)]}));
  const attribution=campaignAttribution();
  const payload={event,event_id:id,path,consent:consent(),fbp:cookies._fbp,fbc:cookies._fbc||(attribution.fbclid?`fb.1.${Date.now()}.${attribution.fbclid}`:undefined)};
  const send=()=>fetch('/api/index?route=telemetry',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Salt-Request':'1'},body:JSON.stringify(payload),keepalive:true});
  try {const response=await send();if(response.status>=500&&allowed('marketing'))await send()}catch{/* Never interrupt a customer action. */}
}
export function revokeProviders() {
  if(!allowed('analytics')){
    window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    configuration?.then(c=>{if(c.ga4&&!allowed('analytics'))window[`ga-disable-${c.ga4}`]=true});
  }
  if(!allowed('marketing'))window.fbq?.('consent','revoke');
  for(const part of document.cookie.split(';')){
    const name=part.trim().split('=')[0];
    if((!allowed('analytics')&&/^_ga|^_gid|^_gat/.test(name))||(!allowed('marketing')&&/^_fb[pc]$/.test(name))){
      const domains=['',...window.location.hostname.split('.').map((_,i,a)=>a.slice(i).join('.'))];
      for(const domain of domains)document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax${domain?`; Domain=${domain}`:''}`;
    }
  }
}
