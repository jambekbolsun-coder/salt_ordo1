export const CONSENT_VERSION = '2026-10-04.2';
export function validConsent(c, now = Date.now()) {
  const date = Date.parse(c?.date);
  return c?.version === CONSENT_VERSION && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean' && Number.isFinite(date) && date <= now + 60000 && now - date < 180 * 86400000;
}
// Deliberately no Purchase: an order request is not a completed sale.
export const EVENTS = Object.freeze({
  page_view: ['page_view', 'PageView'], catalog_view: ['view_item_list', 'ViewCatalog'],
  product_view: ['view_item', 'ViewContent'], form_start: ['form_start', 'FormStart'],
  lead_submit: ['generate_lead', 'Lead'], begin_checkout: ['begin_checkout', 'InitiateCheckout'],
  request_complete: ['request_complete', 'SubmitApplication'], whatsapp_click: ['whatsapp_click', 'Contact'],
  consent_change: ['cookie_consent_change', 'CookieConsentChange'],
});
export function safePath(value) {
  const path = String(value || '/').split(/[?#]/)[0];
  return /^\/(?:catalog|cart|checkout|contacts|favorites|privacy|cookies|product\/[a-zA-Z0-9_\-]+)?\/?$/.test(path) ? path : '/';
}
