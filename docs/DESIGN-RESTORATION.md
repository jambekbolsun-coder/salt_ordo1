# Public design restoration — 2026-10-14

At the owner's request, the public storefront again uses the visual design from
`5dfef09a48079b5eb2ea6f004dec087cdcbcde9f`, before the atelier redesign.

- Restored the original header, wordmark, search, language and color controls,
  seven-slide hero, homepage catalog, product hearts, footer and mobile navigation.
- The three original stylesheets are unchanged. Removed the atelier-wide CSS
  overrides and Cormorant/Manrope fonts. New sections use the original Geist font
  and storefront colors, spacing and rounded controls in `content-additions.css`.
- Kept the material, palette, style, care and custom-order information, persisted
  selections, product links, full request brief, validation and confirmed lead
  submission. Multiple forms now have unique error-description IDs.
- Removed the biography page and all empty photo slots. `/atelier` redirects home;
  the unpublished `/works` page redirects to collections. Neither is in the
  sitemap or generated SEO pages. Directions without photos remain plain text.
- Kept API, database, admin, consent and tracking behavior. No migration or
  production test submission was required.

Validation: production build; 60 passing tests; ESLint with no errors and the six
existing context-export warnings; original CSS comparison; desktop/mobile browser
inspection; mobile menu and catalog filters; product lightbox and inquiry dialog;
form validation and an isolated successful submission preserving the selected
product, quantity, palette and saved ideas in one CRM inquiry. Secondary hero
headings retain white contrast, and the restored image priority attribute is
compatible with the installed React version.
