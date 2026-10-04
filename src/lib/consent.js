export const CONSENT_VERSION='2026-10-04.1'
const KEY='salt-ordo-consent'
let memory=null
export function consent() {
  try {const value=JSON.parse(localStorage.getItem(KEY)||'null');return valid(value)?value:null}catch{return valid(memory)?memory:null}
}
function valid(value){return value?.version===CONSENT_VERSION&&typeof value.analytics==='boolean'&&typeof value.marketing==='boolean'&&Number.isFinite(Date.parse(value.date))&&Date.now()-Date.parse(value.date)<180*86400000}
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
  for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','campaign_id','adset_id','ad_id','campaign_name','adset_name','ad_name','fbclid']) if(params.get(k))current[k]=params.get(k).slice(0,250)
  if(document.referrer)try{current.referrer=new URL(document.referrer).origin}catch{/* Invalid referrer. */}
  const result=Object.keys(current).length?current:old
  try{sessionStorage.setItem('salt-ordo-attribution',JSON.stringify(result))}catch{/* Storage can be disabled. */}
  return result
}
export const openCookieSettings=()=>window.dispatchEvent(new Event('salt-cookie-settings'))
