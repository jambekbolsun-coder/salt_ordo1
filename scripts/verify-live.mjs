// Explicit, read-only smoke checks. Credentials come from process environment only.
import assert from 'node:assert/strict'
const origin=process.env.SALT_TEST_ORIGIN || 'http://localhost:5173'
const headers={Origin:origin,'X-Salt-Request':'1','Content-Type':'application/json'}
let cookie=''
async function call(route,body,query='') {
  return fetch(`${origin}/api/index?route=${route}${query?'&'+query:''}`,{method:body===undefined?'GET':'POST',headers:{...headers,...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)})
}
try {
  assert.equal((await call('clients')).status,401)
  const login=await call('login',{email:process.env.SALT_TEST_EMAIL,password:process.env.SALT_TEST_PASSWORD})
  assert.equal(login.status,200,'Login succeeds')
  const setCookie=login.headers.get('set-cookie')||''
  assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/)
  if(origin.startsWith('https:'))assert.match(setCookie,/Secure/)
  cookie=setCookie.split(';')[0]
  const who=await login.json()
  assert.ok(['owner','admin'].includes(who.staff.role))
  const clients=await call('clients',undefined,'limit=1&page=1')
  assert.equal(clients.status,200);assert.match(clients.headers.get('cache-control'),/no-store/)
  const list=await clients.json();assert.ok(list.items.length<=1)
  assert.equal((await call('reports')).status,200)
  for(const type of ['clients','report']) {
    const exportResponse=await call('export',undefined,`type=${type}`)
    assert.equal(exportResponse.status,200)
    assert.match(exportResponse.headers.get('content-type'),/text\/csv/)
    const bytes=new Uint8Array(await exportResponse.arrayBuffer())
    assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);assert.ok(bytes.length>100)
  }
  if(who.staff.role==='admin') {
    assert.equal((await call('settings',{retention_days:730})).status,403)
    assert.equal((await call('proxy',{},'path='+encodeURIComponent('/functions/v1/create-staff'))).status,403)
  }
  assert.equal((await call('logout',{})).status,200)
  assert.equal((await call('clients')).status,401)
  console.log(`PASS: ${origin}; ${who.staff.role}; auth, access, pagination, reports, 2 CSV exports, cookie flags, logout`)
} finally {
  if(cookie)await call('logout',{}).catch(()=>{})
}
