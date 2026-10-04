import { fetchRead } from './http'
export async function request(route, body, params='', signal) {
  const response=await fetchRead(`/api/index?route=${route}${params?'&'+params:''}`,{
    method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,
    headers:{'Content-Type':'application/json','X-Salt-Request':'1'},body:body===undefined?undefined:JSON.stringify(body),
  })
  const data=await response.json()
  if(data.code==='MFA_REQUIRED')window.dispatchEvent(new Event('salt-mfa-required'))
  if(response.status===401 && route!=='login')window.dispatchEvent(new Event('salt-session-expired'))
  if(!response.ok) { const error=new Error(data.error||'Не удалось выполнить запрос.');error.status=response.status;throw error }
  return data
}
export const outcomeNames={new:'Новое',contacted:'Связались',interested:'Есть интерес',sold:'Продажа',declined:'Отказ',no_response:'Нет ответа'}
export const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'KGS',maximumFractionDigits:2}).format(Number(n)||0)
export const date=n=>n?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeZone:'Asia/Bishkek'}).format(new Date(n)):'—'
