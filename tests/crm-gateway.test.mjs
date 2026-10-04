import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { webcrypto } from 'node:crypto'

test('gateway authenticates, restricts RPCs and handles successful void responses', async () => {
  let handler, calls=0
  const source=(await readFile(new URL('../supabase/functions/crm-gateway/index.ts',import.meta.url),'utf8'))
    .replace('req: Request','req').replace('data:unknown,status:number','data,status').replaceAll(/Deno\.env\.get\(([^)]+)\)!/g,'Deno.env.get($1)')
  runInNewContext(source,{
    Deno:{serve:fn=>{handler=fn},env:{get:()=> 'test'}},Response,TextEncoder,Uint8Array,crypto:webcrypto,AbortSignal,
    fetch:async url=>{calls++;return url.endsWith('salt_crm_gateway_auth')?Response.json(true):new Response(null,{status:204})},
  })
  const request=(rpc,key='a'.repeat(43))=>new Request('https://example.invalid',{method:'POST',headers:{'x-salt-gateway':key},body:JSON.stringify({rpc,payload:{}})})
  assert.equal((await handler(request('salt_crm_security_event','invalid'))).status,401)
  assert.equal(calls,0)
  assert.equal((await handler(request('unrestricted_query'))).status,403)
  const response=await handler(request('salt_crm_security_event'))
  assert.equal(response.status,200);assert.equal(await response.json(),null)
})
