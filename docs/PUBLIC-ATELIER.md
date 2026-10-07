# Salt Ordo public atelier

## Scope and evidence

Public redesign of `salt-ordo1.vercel.app`; existing React/Vite app, Supabase public catalog and server-mediated CRM. Audited live Salt Ordo and SAN DUKHAR home, collection, materials, bespoke, atelier and contact pages before implementation. Reference used for editorial photography and explanation of materials/process, not copied assets or text.

Existing inventory at audit: 12 published products, 5 categories, 120 original product images. No inventory, staff, order, CRM, Supabase schema or RLS changes. Original product metadata remains the source of truth; descriptions and material labels still need owner review. Existing backend tests retained.

## Public routes

- `/`: editorial home, directions, styles, palettes, process and order entry.
- `/collections`: existing catalog, search, categories, availability and sorting.
- `/product/:slug`: existing product data, gallery, cart, save and inquiry.
- `/materials`: confirmed catalog material, unconfirmed requests, palette, comparison and ornament ideas.
- `/individual-order`: four-step optional brief and existing CRM lead endpoint.
- `/atelier`: workshop story and process photo slots.
- `/works`: approved case studies and filters; intentionally empty until supplied.
- `/care`: conservative advice to obtain product-specific care instructions.
- `/selection`: browser-local selection of products, collections, material, color, ornament, style and work.
- Existing cart, checkout, contacts, legal and five SEO landing routes remain.
- Vercel redirects `/catalog` to `/collections`, `/favorites` to `/selection`; React still accepts the old routes. Utility routes remain noindex. Build renders 25 crawlable public HTML pages.

## Design and components

Public-only CSS in `src/atelier.css`: milk `#fcfaf7`, chocolate `#241b19`, burgundy `#5a2431`, muted `#70635c`. Self-hosted Cormorant Garamond headings and Manrope UI. Fluid headings, editorial split hero, thin separators, square buttons, reduced-motion rules and native modal dialogs. Public components: Header, Footer, EditorialPhoto, HeroMedia, PhotoSlot, PageIntro, SaveIdea, Process, Invitation, OrderComposer, LeadCapture, AtelierDialog.

Image variants in `public/atelier`: 480/960 WebP from real catalog originals, no upscaling or AI-generated work. `src/lib/photo-manifest.json` maps exact original URLs to optimized copies; new catalog images fall back to their original URL. No background-only important photos. HeroMedia accepts an optional `video` prop for a future approved MP4; currently only a real photo is used.

## Content completion

Edit `src/lib/atelierContent.js` after owner approval. New copy is Russian, with explicit Russian fallback when KG/EN is selected. Existing product/catalog/contact translations remain. Have native speakers approve new translations before replacing `atelierCopy.kg/en` and the new page copy.

- `materials[0].macro/detail`: local image paths; composition, density, softness, finish, care and colors are nullable/empty until confirmed. Do not infer fibers from material names.
- `atelierHistory`: founder, portrait, story, workshopPhoto, timeline, processPhotos; rendered slots use these fields. Publish only approved names, portraits and dates.
- `orderStories`: approved `{id,title,tags,task,image,result}` objects. No fabricated projects or customer details. Tags match the visible filters.
- Needed photos: founder portrait 4:5, workshop 16:9, 3–6 process frames 3:2, real fabric macros 4:3 at least 1600×1200, product details, approved reference/result pairs. Keep originals separately; add compressed display variants.
- Confirm material names in all product records: audit found the same “Стриженный бархат” label even on a product named “Жаккард төшөк”. No data was silently corrected.

## Selection and requests

`salt-ordo-selection-v2` validates types, IDs and local links; old `salt-ordo-favorites-v1` product IDs are read and maintained. Up to 24 ideas, no account. Storage-denied state is announced. Summaries preserve product paths/IDs so similarly named products can be identified.

Brief fields: product, composition, occasion, style, palette, material, ornament, dimensions, budget, deadline, HTTPS reference. All are optional; name/phone required at submission. Reference files are transferred by public HTTPS link or manually in WhatsApp after saving. There is no file-upload endpoint and the UI says files are not attached automatically. PDF/JPG/PNG/WebP may be shared through WhatsApp.

LeadCapture uses the existing `create_public_lead` server gateway, displays validation/network errors, blocks rapid duplicate submissions, shows success only after a successful response and constructs a WhatsApp link with the same brief. Sending that message remains the visitor’s action. Existing server validation, consent and anti-abuse controls remain.

## Configuration and verification

Vercel project `salt-ordo1` requires public `VITE_SALT_SUPABASE_URL` and `VITE_SALT_SUPABASE_PUBLISHABLE_KEY` at build time. These were missing under the names used by the existing client. Added the two public variables to production/preview; no server secrets were copied or changed. Preview deployment protection remains enabled.

Verified build (25 static public pages), 60 automated tests, TypeScript check for existing WhatsApp subsystem, dependency audit (0 vulnerabilities), secret scan. ESLint has 0 errors and 6 existing context Fast Refresh warnings. Browser checks include 360/390/768/1024/1440/1920, catalog filter/sort, product gallery, native dialogs, cart addition, saved selection, optional brief, invalid reference, validation, success, double-click (one CRM inquiry), simulated 503 and successful retry.

Local acceptance fixture: first run `npm run seo:prepare` with public catalog configuration, then `node scripts/atelier-fixture.mjs`. It binds localhost and replaces Supabase access with an isolated PGlite database using the real gateway/migrations. `GET /__fixture` reads synthetic evidence; `POST /__fixture/fail-next` simulates a single public API failure. This script is never imported by production. No fake inquiries were submitted to the live CRM.

Lighthouse scores and LCP/CLS are not claimed without a measured production audit. Real content completion, native translation review and photo replacement remain owner follow-up work.
