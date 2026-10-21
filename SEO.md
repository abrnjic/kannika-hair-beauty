# Kannika SEO implementation

Production origin: https://kannika-hair-beauty.vercel.app

## Public content

- English `/` and Thai `/th/` have distinct titles, descriptions and self-canonical URLs, with reciprocal absolute `en`, `th` and `x-default` alternates.
- Both contain the 49-service baseline menu in HTML before JavaScript. The existing public menu API refreshes the latest administrator-published menu in the browser. Baseline HTML remains a snapshot: regenerate it when the baseline changes; admin edits do not automatically update that snapshot. Structured data deliberately omits service prices to avoid publishing conflicting prices.
- Local content contains the exact supplied address, verified coordinates, phone, email, services, directions, appointment process and opening date **1 November 2026**. Daily hours are 09:00–22:00 Asia/Bangkok.
- JSON-LD identifies one salon, its three official social accounts, address, geo, hours valid from opening, and the two language pages. No inherited reviews, ratings or business claims from the former salon are used.
- Open Graph/Twitter cards use the supplied salon logo, site colours and a real 1200 × 630 JPEG. Raster favicons support browsers and Apple home-screen bookmarks.
- Responsive photo candidates reduce unnecessary image downloads; dimensions reserve image space. Existing inspiration photos are still labelled as inspiration, not actual salon work.

## Crawling

`/robots.txt` advertises `/sitemap.xml`. The sitemap contains only the two canonical public pages. Card and administration pages retain `noindex,nofollow` in HTML, with matching headers on their clean URLs. They are not disallowed in robots.txt, so crawlers can see their noindex directives. This is indexing control, not authorization; existing Firebase protections remain responsible for access control. API and Firebase helper paths are excluded from crawling. Unknown routes use a bilingual 404 page, with a real HTTP 404 supplied by Vercel.

Explicit permanent redirects normalize HTML aliases and `/th` to `/th/`. Auth helper rewrites and existing card/admin routes remain intact. Do not add a global slash redirect: it can interfere with authentication callbacks and API routes.

## Maintenance

Run `npm run build:content` and `npm test`. Vercel runs the same content build before deployment. `scripts/build-seo.mjs` runs **after** Thai translation so JSON-LD stays valid JSON instead of HTML-escaped text. Tests cover metadata, language links, actual assets, local facts, private exclusions and route rules.

When changing the production domain, update the origin in `scripts/build-seo.mjs`, canonical tests and sitemap output, and configure the corresponding Firebase authorized domain/OAuth callback separately. Never invent a Search Console verification token.

## External steps remaining

1. Verify ownership of this exact production site in Google Search Console (URL-prefix property for the Vercel subdomain; DNS verification requires control of a custom domain).
2. Submit `https://kannika-hair-beauty.vercel.app/sitemap.xml` and inspect `/` and `/th/`. Request indexing after Google can fetch them.
3. Validate the deployed URLs with Google's Rich Results Test. Local JSON/schema tests are not a substitute for Google's eligibility checks.
4. Complete Google Business verification separately. Website SEO does not resolve the former salon's listing or transfer its reviews to this new business.
5. After launch, replace illustrative photos with real salon work, maintain consistent business details across social profiles and Google, and review Search Console indexing and Core Web Vitals with real traffic. No ranking or rich-result placement is guaranteed.

Official references: [localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions), [local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
