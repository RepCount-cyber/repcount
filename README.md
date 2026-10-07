# RepCount

Interactive demo of a mobile-friendly online fitness coaching service.

## Try it

Client views include a daily overview, a guided sample workout, a nutrition concept with meal and water logs, progress, weekly check-ins, the proposed support team and membership. Programme describes the 30-day pilot. Staff demo includes a sample roster, search, trainer assignment and payment verification.

All client records are fictional. Changes last for the current page visit only. No actual messages, bookings, payments or enrolments are submitted. Staff switching is a preview control, not authentication.

Member views support direct links such as `#member/nutrition` and normal browser Back/Forward navigation. A web manifest and original home-screen icons give supported browsers a consistent saved-site identity; offline operation is not provided.

## Development

- Node.js 22.13 or newer.
- `npm ci`
- `npm run dev` for the local app.
- `npm run build:pages` for GitHub Pages output in `docs/`.
- `npm run build` for the optional Cloudflare-compatible worker build.
- `npm test` to build and check rendered output.
- `npx tsc --noEmit` for type checking.

GitHub Pages serves `docs/` from the main branch. Asset URLs are relative to support repository hosting and a future custom domain. Run `npm run build:pages` and commit the updated `docs/` when changing the site; the build emits `.nojekyll` automatically. The original branded share image is included in the page metadata.

## Design

An original crimson R identity, warm ivory and charcoal, editorial typography, and approachable women and men exercising at home. One interactive phone demonstrates movement, nutrition concepts, progress and coaching; wellbeing consultation has a separate, quieter chapter. The member demo shares the same visual identity.

Illustrative media comes from Pexels, commercial-free Mixkit clips and Unsplash. Sources and licences are recorded in `MEDIA-CREDITS.md`. Stock subjects are not presented as actual staff, clients or endorsements. Videos are remote CDN assets, load near the viewport and provide explicit playback controls; automatic playback honours reduced motion and page visibility.
Fonts: DM Sans and Manrope via Google Fonts, with system fallbacks.

Reduced-motion and Save Data preferences keep video posters visible without automatically attaching remote video sources. Explicit Play remains available. A JavaScript-disabled visitor receives a short branded explanation rather than an empty page.

## Demo boundaries

The programme describes a proposed India adults-only pilot at AED 299 for 30 days, with psychologist onboarding and weekly trainer follow-ups. Proposed provider availability is unconfirmed. Nutrition scope and payment collection currency remain open.

Before real client use, implement authenticated accounts, server-side roles, secure durable storage, scheduling, manual-payment verification and consent-based professional handoffs. Private psychological notes must remain outside general trainer/admin records. Brand availability has not been checked.
