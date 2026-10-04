/* global localStorage, sessionStorage */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consent,allowed,saveConsent,clearUnconsented,campaignAttribution,CONSENT_VERSION } from '../src/lib/consent.js'
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),clear:()=>data.clear()}}
globalThis.localStorage=storage();globalThis.sessionStorage=storage()
globalThis.window={location:{search:'?utm_source=meta&fbclid=test'},dispatchEvent:()=>{}}
globalThis.document={referrer:'https://example.com/page?private=1'}
test('optional categories are denied before an explicit versioned choice',()=>{
  assert.equal(consent(),null);assert.equal(allowed('analytics'),false);assert.deepEqual(campaignAttribution(),{})
  assert.equal(sessionStorage.getItem('salt-ordo-attribution'),null)
  saveConsent(false,false)
  assert.equal(consent().version,CONSENT_VERSION);assert.ok(consent().date);assert.equal(allowed('analytics'),false)
})
test('separate categories, withdrawal and policy revision',()=>{
  saveConsent(true,false);assert.equal(allowed('analytics'),true);assert.deepEqual(campaignAttribution(),{})
  saveConsent(false,true);assert.equal(allowed('analytics'),false);assert.equal(campaignAttribution().fbclid,'test')
  localStorage.setItem('salt-ordo-visitor-id','old');sessionStorage.setItem('salt-ordo-session-id','old')
  saveConsent(false,false)
  assert.equal(localStorage.getItem('salt-ordo-visitor-id'),null);assert.equal(sessionStorage.getItem('salt-ordo-session-id'),null);assert.equal(sessionStorage.getItem('salt-ordo-attribution'),null)
  localStorage.setItem('salt-ordo-consent',JSON.stringify({version:'old',date:new Date().toISOString(),analytics:true,marketing:true}))
  assert.equal(consent(),null);clearUnconsented();assert.equal(allowed('marketing'),false)
})
