import { CONSENT_VERSION, validConsent } from '../../shared/measurement.mjs'
export { CONSENT_VERSION }
const KEY='salt-ordo-consent'
let memory=null
export function consent() {
  try {const value=JSON.parse(localStorage.getItem(KEY)||'null');return valid(value)?value:null}catch{return valid(memory)?memory:null}
}
const valid=validConsent
export const allowed=category=>consent()?.[category]===true
export function saveConsent(analytics,marketing) {
  memory={version:CONSENT_VERSION,date:new Date().toISOString(),necessary:true,analytics:analytics===true,marketing:marketing===true}
  try{localStorage.setItem(KEY,JSON.stringify(memory))}catch{/* Memory fallback; ask again next visit. */}
  clearUnconsented()
  window.dispatchEvent(new Event('salt-consent-change'))
}
export function clearUnconsented(){
  try{if(!allowed('analytics')){localStorage.removeItem('salt-ordo-visitor-id');localStorage.removeItem('salt-ordo-viewed-products-v1');sessionStorage.removeItem('salt-ordo-session-id')}}catch{/* Storage can be disabled. */}
  if(!allowed('marketing'))try{sessionStorage.removeItem('salt-ordo-attribution')}catch{/* Storage can be disabled. */}
}
export function campaignAttribution(){
  if(!allowed('marketing'))return {}
  let old={};try{old=JSON.parse(sessionStorage.getItem('salt-ordo-attribution')||'{}')}catch{/* Ignore invalid storage. */}
  const params=new URLSearchParams(window.location.search),current={}
  for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','adset_id','ad_id','campaign_name','adset_name','ad_name','fbclid']) if(params.get(k))current[k]=params.get(k).slice(0,250)
  if(document.referrer&&!old.referrer)try{const origin=new URL(document.referrer).origin;if(origin!==window.location.origin)current.referrer=origin}catch{/* Invalid referrer. */}
  const result={...old,...current,landing_page:old.landing_page||window.location.origin+window.location.pathname}
  try{sessionStorage.setItem('salt-ordo-attribution',JSON.stringify(result))}catch{/* Storage can be disabled. */}
  return result
}
export const openCookieSettings=()=>window.dispatchEvent(new Event('salt-cookie-settings'))
