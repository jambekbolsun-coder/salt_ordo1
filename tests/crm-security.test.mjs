import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { phone,clientInput,amount,filters,csv,attribution } from '../server/validation.mjs'
import { seal,unseal,checkOrigin,setCookie } from '../server/security.mjs'
test('normalizes Kyrgyz and international phones and rejects malformed inputs',()=>{
  assert.equal(phone('0555 111 222'),'+996555111222');assert.equal(phone('555111222'),'+996555111222');assert.equal(phone('00996555111222'),'+996555111222');assert.equal(phone('+44 20 7946 0958'),'+442079460958')
  for(const p of ['abc','123','+12;<script>'])assert.throws(()=>phone(p))
})
test('fields are whitelisted, sums and dates validated, pagination bounded',()=>{
  const value=clientInput({full_name:'Test',phone:'0555111222',is_admin:true,archived_at:'now'})
  assert.equal(value.is_admin,undefined);assert.equal(value.archived_at,undefined)
  for(const a of ['-1','0','1e5','1.222'])assert.throws(()=>amount(a))
  assert.equal(amount('100.50'),'100.50');assert.equal(filters(new URLSearchParams('limit=9999')).limit,100)
  assert.throws(()=>filters(new URLSearchParams('from=2026-11-03&to=2026-10-01')))
})
test('CSRF rejects missing and foreign origin or custom request header',()=>{
  assert.throws(()=>checkOrigin({method:'POST',headers:{}}))
  assert.throws(()=>checkOrigin({method:'POST',headers:{origin:'https://evil.invalid','x-salt-request':'1'}}))
  assert.doesNotThrow(()=>checkOrigin({method:'POST',headers:{origin:'https://salt-ordo1.vercel.app','x-salt-request':'1'}}))
})
test('session encrypted with authenticated encryption and HttpOnly strict cookie',()=>{
  process.env.SALT_SESSION_KEY=randomBytes(32).toString('base64')
  const encrypted=seal({access_token:'sensitive'});assert.equal(unseal(encrypted).access_token,'sensitive');assert.ok(!encrypted.includes('sensitive'))
  const broken=Buffer.from(encrypted,'base64url');broken[30]^=1;assert.throws(()=>unseal(broken.toString('base64url')))
  let value;setCookie({setHeader:(_,v)=>value=v},'token');assert.match(value,/HttpOnly; Secure; SameSite=Strict/);assert.match(value,/__Host-/)
})
test('exports preserve Cyrillic and neutralize spreadsheet formulas; attribution needs consent',()=>{
  const result=csv([{name:'Айжан',phone:'+996555111222',note:'=HYPERLINK("x")'}],[['name','Имя'],['phone','Телефон'],['note','Заметка']])
  assert.ok(result.startsWith('\uFEFF'));assert.match(result,/Айжан/);assert.match(result,/'=HYPERLINK/);assert.match(result,/'\+996/)
  assert.deepEqual(attribution({fbclid:'x'},false),{});assert.deepEqual(attribution({fbclid:'x',referrer:'https://example.com/private?email=secret'},true),{fbclid:'x',referrer:'https://example.com'})
})
